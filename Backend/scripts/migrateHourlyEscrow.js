/**
 * ============================================================================
 * SkillKart — Hourly Escrow Backfill Migration
 * ----------------------------------------------------------------------------
 * One-time migration for hourly contracts created BEFORE the wallet-lock
 * escrow system existed. Those contracts have hourlyEscrow.lockedBalance = 0
 * (the schema default) and would otherwise be immediately blocked from new
 * time-tracking by the new escrow guard (see timeTracking.controller.js's
 * assertEscrowHasRoom) the next time the freelancer tries to log time.
 *
 * This locks a fair amount — covering the contract's already-logged-but-
 * unbilled hours plus one week's buffer — straight from each client's REAL
 * wallet balance, using the exact same lockHourlyEscrow() service the live
 * app uses for a fresh hire. No money is fabricated: it's a real debit + a
 * real Payment record, identical to what would have happened had the
 * contract been accepted after this system existed.
 *
 * If a client's wallet can't cover the full amount, this locks whatever they
 * CAN afford (or nothing, if their balance is 0) and reports it clearly —
 * that contract will show the existing "escrow running low / top up" UI
 * until the client funds it, exactly like any other hourly contract waiting
 * on a re-lock. Nothing here silently grants free escrow.
 *
 * Idempotent — safe to re-run: it only touches hourly contracts that have
 * never been locked (hourlyEscrow.totalLocked is 0/missing). Contracts hired
 * through the new acceptProposal flow already have this set and are skipped.
 *
 * Usage:
 *   node scripts/migrateHourlyEscrow.js            # dry run — reports only, no writes
 *   node scripts/migrateHourlyEscrow.js --apply     # actually locks funds
 *   npm run migrate:hourly-escrow                   # dry run
 *   npm run migrate:hourly-escrow -- --apply        # actually locks funds
 * ============================================================================
 */
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
dotenv.config({ path: path.join(__dirname, '../.env') });

const Contract = require('../src/models/Contract');
const Job = require('../src/models/Job');
const ClientProfile = require('../src/models/ClientProfile');
const { lockHourlyEscrow, getUnbilledAmount, estimateWeeklyLockAmount } = require('../src/services/hourlyEscrow.service');
const { round2 } = require('../src/utils/constants');

const APPLY = process.argv.includes('--apply');

async function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('✗ MONGODB_URI is not set in Backend/.env'); process.exit(1); }
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 120000,
    connectTimeoutMS: 30000,
  });
  console.log(`✓ Connected to MongoDB (${mongoose.connection.host}/${mongoose.connection.name})`);
}

async function run() {
  await connect();
  console.log(
    APPLY
      ? '⚠ APPLY mode — this WILL debit real client wallet balances.\n'
      : 'ℹ Dry run — no writes will be made. Re-run with --apply to actually lock funds.\n'
  );

  // Only hourly contracts still in play, and only ones the new lock system
  // has never touched (a freshly-hired contract already has totalLocked > 0).
  const contracts = await Contract.find({
    type: 'hourly',
    status: { $nin: ['completed', 'cancelled'] },
    $or: [
      { 'hourlyEscrow.totalLocked': { $exists: false } },
      { 'hourlyEscrow.totalLocked': 0 },
      { 'hourlyEscrow.totalLocked': null }
    ]
  });

  console.log(`Found ${contracts.length} hourly contract(s) that predate the escrow-lock system.\n`);

  let fullyLocked = 0, partiallyLocked = 0, skippedNoFunds = 0, skippedNothingToLock = 0, failed = 0;

  for (const contract of contracts) {
    const weeklyLockAmount = estimateWeeklyLockAmount({ hourlyRate: contract.hourlyRate, weeklyLimit: contract.weeklyLimit });
    const unbilled = await getUnbilledAmount(contract);
    const needed = round2(unbilled + weeklyLockAmount);

    if (needed <= 0) {
      console.log(`  – ${contract._id}: nothing to lock (rate/hours/backlog all zero) — skipping.`);
      skippedNothingToLock++;
      continue;
    }

    const clientProfile = await ClientProfile.findOne({ userId: contract.clientId });
    const balance = round2(clientProfile?.walletBalance || 0);
    const lockAmount = round2(Math.min(needed, balance));

    if (lockAmount <= 0) {
      console.log(`  ⚠ ${contract._id}: client has Rs. ${balance} available (needs Rs. ${needed}) — nothing to lock. Client must top up via the app before the freelancer can resume time-tracking on this contract.`);
      skippedNoFunds++;
      continue;
    }

    const short = lockAmount < needed;
    console.log(
      `  ${short ? '⚠' : '✓'} ${contract._id}: ${APPLY ? 'locking' : 'would lock'} Rs. ${lockAmount}` +
      (short ? ` (needed Rs. ${needed}, client only has Rs. ${balance} — will still need a top-up soon)` : '')
    );
    if (short) partiallyLocked++; else fullyLocked++;

    if (APPLY) {
      try {
        const job = await Job.findById(contract.jobId);
        await lockHourlyEscrow({
          contract,
          job,
          clientId: contract.clientId,
          amount: lockAmount,
          performedBy: contract.clientId,
          initial: true
        });
      } catch (err) {
        console.error(`    ✗ Failed to lock for contract ${contract._id}:`, err.message);
        failed++;
      }
    }
  }

  console.log(
    `\n${APPLY ? 'Applied' : 'Would apply'}: ${fullyLocked} fully locked, ${partiallyLocked} partially locked (still need a top-up), ` +
    `${skippedNoFunds} skipped (client has zero balance), ${skippedNothingToLock} skipped (nothing to lock)` +
    `${APPLY ? `, ${failed} failed` : ''}.`
  );
  if (!APPLY) console.log('Nothing was written. Re-run with --apply to actually lock these amounts.');

  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
