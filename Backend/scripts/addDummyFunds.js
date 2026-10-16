/**
 * SkillKart — Add Dummy Funds Script
 * ----------------------------------------------------
 * Usage:
 *   node scripts/addDummyFunds.js <email> <amount>
 *
 * Example:
 *   node scripts/addDummyFunds.js ammadmuhammad098@gmail.com 50000
 */

const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const ClientProfile = require('../src/models/ClientProfile');
const FreelancerProfile = require('../src/models/FreelancerProfile');
const Payment = require('../src/models/Payment');

async function main() {
  const email = process.argv[2];
  const amountArg = process.argv[3];

  if (!email || !amountArg) {
    console.log('\n❌ Usage: node scripts/addDummyFunds.js <email> <amount>');
    console.log('   Example: node scripts/addDummyFunds.js user@gmail.com 50000\n');
    process.exit(1);
  }

  const amount = Number(amountArg);
  if (isNaN(amount) || amount <= 0) {
    console.log('\n❌ Amount must be a positive number.\n');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not set in Backend/.env');
    process.exit(1);
  }

  console.log(`\n⏳ Connecting to MongoDB...`);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 60000,
    connectTimeoutMS: 30000,
  });
  console.log(`✅ Connected to MongoDB.`);

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    console.log(`\n❌ User not found with email: ${normalizedEmail}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`\n👤 User Found:`);
  console.log(`   - Name: ${user.firstName || ''} ${user.lastName || ''}`);
  console.log(`   - Email: ${user.email}`);
  console.log(`   - Role: ${user.role}`);
  console.log(`   - User ID: ${user._id}`);

  let updatedAny = false;

  // Check Client Profile
  const clientProfile = await ClientProfile.findOne({ userId: user._id });
  if (clientProfile) {
    const oldBalance = clientProfile.walletBalance || 0;
    clientProfile.walletBalance = oldBalance + amount;
    await clientProfile.save();

    // Create a Payment transaction record for history
    await Payment.create({
      clientId: user._id,
      type: 'wallet_deposit',
      totalAmount: amount,
      depositAmount: amount,
      finalAmount: 0,
      status: 'released',
      depositPaidAt: new Date(),
      stripe: { simulated: true, depositSessionId: `dummy_deposit_${Date.now()}` }
    });

    console.log(`\n💼 Client Profile Updated:`);
    console.log(`   - Previous Balance: PKR ${oldBalance}`);
    console.log(`   - Added: PKR ${amount}`);
    console.log(`   - New Balance: PKR ${clientProfile.walletBalance}`);
    console.log(`   - Transaction record created in Payments history.`);
    updatedAny = true;
  }

  // Check Freelancer Profile
  const freelancerProfile = await FreelancerProfile.findOne({ userId: user._id });
  if (freelancerProfile) {
    const oldBalance = freelancerProfile.walletBalance || 0;
    freelancerProfile.walletBalance = oldBalance + amount;
    await freelancerProfile.save();

    console.log(`\n🛠️ Freelancer Profile Updated:`);
    console.log(`   - Previous Balance: PKR ${oldBalance}`);
    console.log(`   - Added: PKR ${amount}`);
    console.log(`   - New Balance: PKR ${freelancerProfile.walletBalance}`);
    updatedAny = true;
  }

  if (!updatedAny) {
    console.log(`\n⚠️ Note: User has no ClientProfile or FreelancerProfile yet.`);
    console.log(`   If this is a client, creating a default ClientProfile with PKR ${amount}...`);
    await ClientProfile.create({
      userId: user._id,
      walletBalance: amount,
      onboardingStatus: 'completed'
    });
    await Payment.create({
      clientId: user._id,
      type: 'wallet_deposit',
      totalAmount: amount,
      depositAmount: amount,
      finalAmount: 0,
      status: 'released',
      depositPaidAt: new Date(),
      stripe: { simulated: true, depositSessionId: `dummy_deposit_${Date.now()}` }
    });
    console.log(`✅ ClientProfile created with PKR ${amount} wallet balance!`);
  }

  console.log(`\n🎉 Successfully credited PKR ${amount} to ${user.email}!\n`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
