const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const FreelancerProfile = require('./src/models/FreelancerProfile');

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const profiles = await FreelancerProfile.find();
  for (const profile of profiles) {
    if (profile.savedJobs && profile.savedJobs.length > 0) {
      const originalLen = profile.savedJobs.length;
      const unique = [...new Set(profile.savedJobs.map(id => id.toString()))];
      if (unique.length !== originalLen) {
        profile.savedJobs = unique;
        await profile.save();
        console.log(`Fixed duplicates for user ${profile.userId}`);
      }
    }
  }

  console.log('Done');
  process.exit(0);
}

fix();
