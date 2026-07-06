const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Review = require('../src/models/Review');
const User = require('../src/models/User');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const reviews = await Review.find({});
    console.log("All Reviews:", JSON.stringify(reviews, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
