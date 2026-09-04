/**
 * ============================================================================
 * SkillKart — Fake Stripe Connect Account Backfill
 * ----------------------------------------------------------------------------
 * seedDemoData.js used to fabricate a real-looking `acct_<username><n>` id for
 * ~70% of verified freelancers without ever creating that account via the
 * Stripe API. Under STRIPE_DUMMY=false (a real, even if test-mode, secret
 * key), every downstream call against that id — createAccountLink,
 * checkAccountStatus, createPayout — 404s with "No such account", breaking
 * both "Connect Stripe" (skips creating a fresh account since one is already
 * "set") and "Withdraw" (skips onboarding since stripeOnboardingComplete is
 * already true, then pays out to a nonexistent account).
 *
 * This resets any FreelancerProfile whose stripeAccountId looks like one of
 * these fabricated ids (starts with "acct_", not "sim_acct_" — the prefix
 * stripe.service.js already knows to treat as simulated) back to unconnected,
 * so clicking "Connect Stripe" creates a genuine account and goes through
 * real onboarding.
 *
 * Idempotent — safe to re-run.
 *
 * Usage:
 *   node scripts/fixFakeStripeAccounts.js            # dry run — reports only
 *   node scripts/fixFakeStripeAccounts.js --apply     # actually writes
 * ============================================================================
 */
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
dotenv.config({ path: path.join(__dirname, '../.env') });

const FreelancerProfile = require('../src/models/FreelancerProfile');
const { checkAccountStatus } = require('../src/services/stripe.service');

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
  console.log(APPLY ? '⚠ APPLY MODE — writes will be made' : 'ℹ DRY RUN — no writes will be made (pass --apply to write)');

  const profiles = await FreelancerProfile.find({
    stripeAccountId: { $regex: /^acct_/ },
  }).select('userId stripeAccountId stripeOnboardingComplete');

  console.log(`Found ${profiles.length} freelancer profile(s) with an "acct_"-prefixed Stripe account id — verifying each against the real Stripe API before touching anything.`);

  let resetCount = 0;
  let skippedReal = 0;

  for (const profile of profiles) {
    let exists = true;
    try {
      await checkAccountStatus(profile.stripeAccountId);
    } catch (err) {
      // Stripe's accounts.retrieve reports a connected account this platform
      // never actually created with this exact "does not have access ... or
      // that account does not exist" phrasing (confirmed against a known-fake
      // seeded id) — treat it the same as the more familiar "No such account".
      exists = !(err && (err.code === 'resource_missing' || /No such account|does not have access to account/i.test(err.message || '')));
      if (exists) {
        console.log(`  ⚠ Unexpected error checking ${profile.stripeAccountId} (leaving untouched): ${err.message}`);
      }
    }

    if (exists) {
      skippedReal++;
      console.log(`  Skipping (verified real): user ${profile.userId} — stripeAccountId="${profile.stripeAccountId}"`);
      continue;
    }

    resetCount++;
    console.log(`  ${APPLY ? 'Resetting' : 'Would reset'}: user ${profile.userId} — stripeAccountId="${profile.stripeAccountId}" (does not exist in Stripe)`);
    if (APPLY) {
      profile.stripeAccountId = undefined;
      profile.stripeOnboardingComplete = false;
      await profile.save();
    }
  }

  console.log('');
  console.log('─────────────────────────────────────────');
  console.log(`Profiles verified as real (left untouched): ${skippedReal}`);
  console.log(`Profiles ${APPLY ? 'reset' : 'that would be reset'}: ${resetCount}`);
  if (!APPLY && resetCount > 0) {
    console.log('');
    console.log('Re-run with --apply to write these changes.');
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('✗ Backfill failed:', err);
  process.exit(1);
});
