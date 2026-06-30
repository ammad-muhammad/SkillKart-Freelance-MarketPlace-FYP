const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const FreelancerProfile = require('./src/models/FreelancerProfile');
require('./src/models/Job');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const profile = await FreelancerProfile.findOne({ userId: '6a2ffad5f529edbaf5efbdc3' }).populate('savedJobs');
  console.log(JSON.stringify(profile?.savedJobs || [], null, 2));

  console.log('Done');
  process.exit(0);
}

test();
