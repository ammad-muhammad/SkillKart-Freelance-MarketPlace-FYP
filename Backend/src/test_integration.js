require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('./app');
const User = require('./models/User');
const ClientProfile = require('./models/ClientProfile');
const FreelancerProfile = require('./models/FreelancerProfile');
const Job = require('./models/Job');
const Proposal = require('./models/Proposal');
const Contract = require('./models/Contract');
const TimeLog = require('./models/TimeLog');
const Payment = require('./models/Payment');
const Delivery = require('./models/Delivery');
const Notification = require('./models/Notification');
const { generateToken } = require('./utils/jwt');

// Ensure db connection
async function setupDb() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skillkart_test');
  }
}

// Generate Auth Header
function getAuthHeader(user) {
  return `Bearer ${generateToken(user)}`;
}

// Utility for sleep
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runTests() {
  await setupDb();
  let passed = 0, failed = 0;

  const assert = (cond, msg) => {
    if (cond) { console.log('✅ PASS:', msg); passed++; }
    else { console.error('❌ FAIL:', msg); failed++; }
  };

  try {
    console.log('--- Setting up Integration Tests ---');
    // Clear relevant collections
    await User.deleteMany({ email: { $regex: /@inttest\.com$/ } });
    await Job.deleteMany({ title: { $regex: /^IntTest/ } });
    // We'll just delete all for isolation, or rather isolate by user
    const client = await User.create({ firstName: 'IntClient', email: `client_${Date.now()}@inttest.com`, role: 'client', isActive: true });
    const freelancer = await User.create({ firstName: 'IntFreelancer', email: `freelancer_${Date.now()}@inttest.com`, role: 'freelancer', isActive: true });

    await ClientProfile.create({ userId: client._id, walletBalance: 10000 });
    await FreelancerProfile.create({ userId: freelancer._id, skills: [{ name: 'test_skill', isVerified: true }] });

    const clientAuth = getAuthHeader(client);
    const freelancerAuth = getAuthHeader(freelancer);

    console.log('\n=== FIXED PRICE WORKFLOW ===');
    // 1. Create Job
    let res = await request(app).post('/api/v1/jobs')
      .set('Authorization', clientAuth)
      .send({
        title: 'IntTest Fixed Job',
        description: 'Test job description that is definitely long enough to pass the fifty character minimum requirement for the job validation middleware',
        category: 'Web Development',
        skills: ['test_skill'],
        budget: { type: 'fixed', min: 100, max: 200 }
      });
    assert(res.statusCode === 201, 'Job created');
    const fixedJobId = res.body.data.job._id;

    // 2. Submit Proposal
    res = await request(app).post('/api/v1/proposals')
      .set('Authorization', freelancerAuth)
      .send({
        jobId: fixedJobId,
        coverLetter: 'Hello this is a very long cover letter designed to pass the 100 character minimum limit for the proposal validation.',
        fixedPrice: 150,
        estimatedDeliveryTime: '1w'
      });
    assert(res.statusCode === 201, 'Proposal submitted');
    const proposalId = res.body.data.proposal._id;

    // 3. Accept Proposal (Creates Contract)
    res = await request(app).post(`/api/v1/proposals/${proposalId}/accept`)
      .set('Authorization', clientAuth)
      .send({});
    assert(res.statusCode === 200, 'Proposal accepted');
    const contractId = res.body.data.contract._id;

    // Verify Notification
    const notif = await Notification.findOne({ userId: freelancer._id, type: 'proposal_accepted', jobId: fixedJobId });
    assert(notif !== null, 'Notification created for proposal accepted');

    // 4. Escrow Deposit
    res = await request(app).post(`/api/v1/payments/jobs/${fixedJobId}/deposit`)
      .set('Authorization', clientAuth)
      .send({});
    assert(res.statusCode === 200 && res.body.data.walletPaid, 'Escrow funded from wallet');
    
    let contract = await Contract.findById(contractId);
    assert(contract.paymentStatus === 'funded', 'Contract marked as funded');

    // 5. Submit Delivery
    res = await request(app).post(`/api/v1/deliveries/${contractId}/submit`)
      .set('Authorization', freelancerAuth)
      .send({ message: 'Here is my work' });
    assert(res.statusCode === 201, 'Delivery submitted');
    const delivery1Id = res.body.data.delivery._id;

    // 6. Request Revision
    res = await request(app).post(`/api/v1/deliveries/${delivery1Id}/review`)
      .set('Authorization', clientAuth)
      .send({ action: 'request_revision', feedback: 'Fix header' });
    assert(res.statusCode === 200, 'Revision requested');
    contract = await Contract.findById(contractId);
    assert(contract.status === 'in_revision', 'Contract status changed to in_revision');

    // 7. Submit Delivery V2
    res = await request(app).post(`/api/v1/deliveries/${contractId}/submit`)
      .set('Authorization', freelancerAuth)
      .send({ message: 'Fixed header' });
    assert(res.statusCode === 201, 'Delivery V2 submitted');
    const delivery2Id = res.body.data.delivery._id;

    // 8. Accept Delivery V2 (Completes Contract, Releases Escrow)
    res = await request(app).post(`/api/v1/deliveries/${delivery2Id}/review`)
      .set('Authorization', clientAuth)
      .send({ action: 'accept' });
    assert(res.statusCode === 200, 'Delivery accepted and contract completed');
    
    contract = await Contract.findById(contractId);
    assert(contract.status === 'completed', 'Fixed contract marked completed');
    const payment = await Payment.findOne({ contractId: contractId });
    assert(payment.status === 'released' && payment.freelancerPayout > 0, 'Escrow released');

    // Verify Project Completed Notification
    const compNotif = await Notification.findOne({ userId: freelancer._id, type: 'project_completed', jobId: fixedJobId });
    assert(compNotif !== null, 'Project completed notification verified');

    console.log('\n=== HOURLY WORKFLOW ===');
    // 1. Create Job
    res = await request(app).post('/api/v1/jobs')
      .set('Authorization', clientAuth)
      .send({
        title: 'IntTest Hourly Job',
        description: 'Test job description that is definitely long enough to pass the fifty character minimum requirement for the job validation middleware',
        category: 'Web Development',
        skills: ['test_skill'],
        budget: { type: 'hourly', min: 10, max: 20 }
      });
    const hourlyJobId = res.body.data.job._id;

    // 2. Submit Proposal
    res = await request(app).post('/api/v1/proposals')
      .set('Authorization', freelancerAuth)
      .send({ jobId: hourlyJobId, coverLetter: 'Hourly this is a very long cover letter designed to pass the 100 character minimum limit for the proposal validation.', hourlyRate: 15, estimatedWeeklyHours: 20 });
    const hProposalId = res.body.data.proposal._id;

    // 3. Accept Proposal
    res = await request(app).post(`/api/v1/proposals/${hProposalId}/accept`)
      .set('Authorization', clientAuth)
      .send({});
    const hContractId = res.body.data.contract._id;

    // Try upfront escrow (should fail)
    res = await request(app).post(`/api/v1/payments/jobs/${hourlyJobId}/deposit`)
      .set('Authorization', clientAuth)
      .send({});
    assert(res.statusCode === 400, 'Hourly upfront deposit prevented');

    // 4. Start Timer
    res = await request(app).post(`/api/v1/time-tracking/${hContractId}/start`)
      .set('Authorization', freelancerAuth)
      .send({});
    assert(res.statusCode === 200, 'Timer started');

    // Make timer artificially long by updating db
    await Contract.findByIdAndUpdate(hContractId, { 'timer.startedAt': new Date(Date.now() - 3600000) });

    // 5. Stop Timer
    res = await request(app).post(`/api/v1/time-tracking/${hContractId}/stop`)
      .set('Authorization', freelancerAuth)
      .send({ notes: 'Did work' });
    assert(res.statusCode === 200, 'Timer stopped and log created');

    // 6. Manual Log
    const startT = new Date(Date.now() - 86400000);
    const endT = new Date(startT.getTime() + 7200000);
    res = await request(app).post(`/api/v1/time-tracking/${hContractId}/manual`)
      .set('Authorization', freelancerAuth)
      .send({ startTime: startT, endTime: endT, notes: 'Manual' });
    assert(res.statusCode === 201, 'Manual log added');

    // 7. Weekly Billing Cron
    const { generateWeeklyInvoices } = require('./services/cron.service');
    await generateWeeklyInvoices();

    // Verify payment created
    const hPayment = await Payment.findOne({ contractId: hContractId, type: 'hourly_invoice' });
    assert(hPayment !== null && Math.round(hPayment.totalAmount) === 45, 'Weekly invoice generated (~3 hrs * $15 = ~$45)');

    // 8. Prevent duplicate billing
    await generateWeeklyInvoices();
    const invoiceCount = await Payment.countDocuments({ contractId: hContractId, type: 'hourly_invoice' });
    assert(invoiceCount === 1, 'Duplicate billing prevented');


    console.log('\n=== CANCELLATION WORKFLOW ===');
    res = await request(app).post('/api/v1/jobs')
      .set('Authorization', clientAuth)
      .send({ title: 'IntTest Cancel Job', description: 'Test job description that is definitely long enough to pass the fifty character minimum requirement for the job validation middleware', category: 'Web Development', skills: ['test_skill'], budget: { type: 'fixed', min: 100, max: 200 } });
    const cancelJobId = res.body.data.job._id;
    res = await request(app).post('/api/v1/proposals')
      .set('Authorization', freelancerAuth)
      .send({ jobId: cancelJobId, coverLetter: 'Cancel this is a very long cover letter designed to pass the 100 character minimum limit for the proposal validation.', fixedPrice: 150, estimatedDeliveryTime: '1w' });
    const cancelPropId = res.body.data.proposal._id;
    res = await request(app).post(`/api/v1/proposals/${cancelPropId}/accept`)
      .set('Authorization', clientAuth)
      .send({});
    const cancelContractId = res.body.data.contract._id;

    // Update to hourly to test timer auto-stop on cancellation
    await Contract.findByIdAndUpdate(cancelContractId, { type: 'hourly' });
    await request(app).post(`/api/v1/time-tracking/${cancelContractId}/start`).set('Authorization', freelancerAuth).send({});

    // Submit Cancellation
    res = await request(app).post(`/api/v1/contracts/${cancelContractId}/cancel`)
      .set('Authorization', clientAuth)
      .send({ reason: 'Not working out' });
    assert(res.statusCode === 200, 'Cancellation requested');
    
    // Verify Contract State
    const cancelContract = await Contract.findById(cancelContractId);
    assert(cancelContract.status === 'under_review', 'Contract is under review');
    assert(cancelContract.timer.isActive === false, 'Timer stopped automatically');

    // Verify Notification
    const disputeNotif = await Notification.findOne({ userId: freelancer._id, type: 'contract_disputed' });
    assert(disputeNotif !== null, 'Dispute notification generated');

    // Try manual log
    res = await request(app).post(`/api/v1/time-tracking/${cancelContractId}/manual`)
      .set('Authorization', freelancerAuth)
      .send({ startTime: new Date(), endTime: new Date(Date.now() + 1000) });
    assert(res.statusCode === 400, 'Manual logs blocked after cancellation');

    // Try delivery
    res = await request(app).post(`/api/v1/deliveries/${cancelContractId}/submit`)
      .set('Authorization', freelancerAuth)
      .send({ message: 'Delivery on cancelled' });
    assert(res.statusCode === 400, 'Deliveries blocked after cancellation');

    console.log('\n=== INTEGRATION VERIFICATION COMPLETE ===');
    
  } catch(e) {
    console.error(e);
  }

  mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
