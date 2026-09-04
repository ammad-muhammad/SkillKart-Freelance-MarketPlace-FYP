/**
 * ============================================================================
 * SkillKart — Skill Verification Threshold Backfill
 * ----------------------------------------------------------------------------
 * skillTest.controller.js used to only set isVerified=true at >=80% (the
 * "Expert" tier). That's now lowered to >=25% (SKILL_VERIFICATION_THRESHOLD)
 * — Beginner/Intermediate/Expert should all unlock applying to gated work;
 * only a near-zero/random-guess attempt should not. That change only affects
 * *future* test submissions, so freelancers who already tested and scored
 * e.g. 74% before this fix are stuck showing isVerified=false forever unless
 * they retake the test.
 *
 * This re-evaluates every already-tested skill (lastTestedAt set, so a real
 * attempt happened — not just a name added via profile edit) against the new
 * threshold and flips isVerified where it should now be true, using the same
 * expiresAt math (lastTestedAt + 6 months) the live submit flow uses. Skills
 * whose 6-month window has already lapsed are left alone — a lapsed
 * verification should be re-earned by retaking, not silently resurrected.
 *
 * Idempotent — safe to re-run: only touches skills currently isVerified=false
 * that now qualify under the new threshold and haven't expired.
 *
 * Usage:
 *   node scripts/backfillSkillVerification.js            # dry run — reports only, no writes
 *   node scripts/backfillSkillVerification.js --apply     # actually flips isVerified
 *   npm run migrate:skill-verification                    # dry run
 *   npm run migrate:skill-verification -- --apply         # actually flips isVerified
 * ============================================================================
 */
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
dotenv.config({ path: path.join(__dirname, '../.env') });

const FreelancerProfile = require('../src/models/FreelancerProfile');

const SKILL_VERIFICATION_THRESHOLD = 25;
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

  const profiles = await FreelancerProfile.find({ 'skills.isVerified': false }).select('userId skills');
  console.log(`Found ${profiles.length} freelancer profile(s) with at least one unverified skill.`);

  const now = Date.now();
  let profilesTouched = 0;
  let skillsFlipped = 0;
  let skillsSkippedExpired = 0;

  for (const profile of profiles) {
    let touched = false;

    for (const skill of profile.skills) {
      if (skill.isVerified) continue;
      if (!skill.lastTestedAt) continue; // never actually tested — nothing to backfill
      if (typeof skill.verificationScore !== 'number' || skill.verificationScore < SKILL_VERIFICATION_THRESHOLD) continue;

      const expiresAt = new Date(skill.lastTestedAt);
      expiresAt.setMonth(expiresAt.getMonth() + 6);
      if (expiresAt.getTime() <= now) {
        skillsSkippedExpired++;
        continue; // lapsed — must be re-earned by retaking, not resurrected
      }

      console.log(`  ${APPLY ? 'Verifying' : 'Would verify'}: user ${profile.userId} — "${skill.name}" (${skill.verificationScore}%, tested ${skill.lastTestedAt.toISOString().slice(0, 10)}, expires ${expiresAt.toISOString().slice(0, 10)})`);
      skillsFlipped++;
      touched = true;

      if (APPLY) {
        skill.isVerified = true;
        skill.expiresAt = expiresAt;
      }
    }

    if (touched) {
      profilesTouched++;
      if (APPLY) await profile.save();
    }
  }

  console.log('');
  console.log('─────────────────────────────────────────');
  console.log(`Profiles ${APPLY ? 'updated' : 'that would be updated'}: ${profilesTouched}`);
  console.log(`Skills ${APPLY ? 'verified' : 'that would be verified'}: ${skillsFlipped}`);
  console.log(`Skills skipped (score qualifies but 6-month window already lapsed): ${skillsSkippedExpired}`);
  if (!APPLY && skillsFlipped > 0) {
    console.log('');
    console.log('Re-run with --apply to write these changes.');
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('✗ Backfill failed:', err);
  process.exit(1);
});
