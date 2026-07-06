const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
const { getMyProjects } = require('../src/controllers/job.controller');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const req = {
      user: { _id: "6a0b22b8e60f3ffc15cbd056" },
      query: { page: 1, limit: 10 }
    };
    
    const res = {
      status: function(s) { this.statusCode = s; return this; },
      json: function(data) {
        const items = data.data;
        const target = items.find(j => String(j._id) === "6a479538703eccaf10fe3f05");
        console.log("Response target job hasReviewed:", target.hasReviewed);
        process.exit(0);
      }
    };
    
    await getMyProjects(req, res, (err) => {
      console.error(err);
      process.exit(1);
    });
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
