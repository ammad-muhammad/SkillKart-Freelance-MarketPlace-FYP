const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Job = require('../src/models/Job');
const Payment = require('../src/models/Payment');
const Review = require('../src/models/Review');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const job = await Job.findOne({ title: 'fixed price' });
    console.log("Job:", JSON.stringify(job, null, 2));
    
    if (job) {
      const review = await Review.findOne({ jobId: job._id });
      console.log("Review:", JSON.stringify(review, null, 2));
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
