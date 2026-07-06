const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
const User = require('../src/models/User');
const jwt = require('jsonwebtoken');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const user = await User.findById("6a0b22b8e60f3ffc15cbd056");
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    const res = await axios.get('http://localhost:5000/api/v1/jobs/my-projects', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const items = res.data.data;
    const target = items.find(j => j._id === "6a479538703eccaf10fe3f05");
    console.log("Target job in API response:", JSON.stringify(target, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
