const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Job = require('../src/models/Job');
const Payment = require('../src/models/Payment');
const Review = require('../src/models/Review');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    // get the client ID from the review we saw earlier
    const clientId = "6a0b22b8e60f3ffc15cbd056";
    
    const query = { clientId };
    const jobs = await Job.find(query).lean();
    
    const reviews = await Review.find({ reviewerId: clientId, jobId: { $in: jobs.map((j) => j._id) } }).lean();
    const reviewedJobIds = new Set(reviews.map((r) => String(r.jobId)));
    
    const items = jobs.map((j) => ({ 
      id: String(j._id),
      hasReviewed: reviewedJobIds.has(String(j._id))
    }));
    
    console.log("Projects hasReviewed map:", JSON.stringify(items, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
