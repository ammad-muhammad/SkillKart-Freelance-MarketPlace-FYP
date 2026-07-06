const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Job = require('../src/models/Job');
const Contract = require('../src/models/Contract');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to DB');
    
    // Find all completed contracts
    const completedContracts = await Contract.find({ status: 'completed' });
    let count = 0;
    
    for (const contract of completedContracts) {
      const job = await Job.findById(contract.jobId);
      if (job && job.status !== 'completed') {
        job.status = 'completed';
        job.completedAt = contract.completedAt || new Date();
        await job.save();
        count++;
        console.log(`Repaired Job: ${job._id}`);
      }
    }
    
    console.log(`Successfully repaired ${count} jobs.`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
