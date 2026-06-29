require('dotenv').config({path: 'Backend/.env'});
const mongoose = require('mongoose');
const ClientProfile = require('./Backend/src/models/ClientProfile');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const profiles = await ClientProfile.find({ walletBalance: { $gt: 0 } });
    console.log(JSON.stringify(profiles.map(p => ({ id: p.userId, balance: p.walletBalance, sessions: p.processedSessions })), null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
