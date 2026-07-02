const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/SkillKart-DB', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const FreelancerProfile = require('./src/models/FreelancerProfile');
    const profiles = await FreelancerProfile.find({ stripeAccountId: { $exists: true, $ne: null } }).select('userId stripeAccountId stripeOnboardingComplete');
    console.log(profiles);
    process.exit(0);
  })
  .catch(console.error);
