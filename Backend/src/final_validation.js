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

async function setupDb() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skillkart_test');
  }
}

function getAuthHeader(user) {
  return `Bearer ${generateToken(user)}`;
}

let passed = 0, failed = 0;
const assert = (cond, msg) => {
  if (cond) { console.log('✅ PASS:', msg); passed++; }
  else { console.error('❌ FAIL:', msg); failed++; }
};

async function runTests() {
  await setupDb();
  
  try {
    console.log('--- Setting up Final Validation Tests ---');
    await User.deleteMany({ email: { $regex: /@valid\.com$/ } });
    await Job.deleteMany({ title: { $regex: /^ValidTest/ } });
    
    const clientA = await User.create({ firstName: 'Client', lastName: 'A', email: `clientA_${Date.now()}@valid.com`, role: 'client', isActive: true });
    const clientB = await User.create({ firstName: 'Client', lastName: 'B', email: `clientB_${Date.now()}@valid.com`, role: 'client', isActive: true });
    const freeA = await User.create({ firstName: 'Free', lastName: 'A', email: `freeA_${Date.now()}@valid.com`, role: 'freelancer', isActive: true });
    const freeB = await User.create({ firstName: 'Free', lastName: 'B', email: `freeB_${Date.now()}@valid.com`, role: 'freelancer', isActive: true });

    await ClientProfile.create({ userId: clientA._id, walletBalance: 10000 });
    await ClientProfile.create({ userId: clientB._id, walletBalance: 10000 });
    await FreelancerProfile.create({ userId: freeA._id, walletBalance: 0, skills: [{ name: 'react', isVerified: true }] });
    await FreelancerProfile.create({ userId: freeB._id, walletBalance: 0, skills: [{ name: 'react', isVerified: true }] });

    const authCA = getAuthHeader(clientA);
    const authCB = getAuthHeader(clientB);
    const authFA = getAuthHeader(freeA);
    const authFB = getAuthHeader(freeB);

    console.log('\n=== FIXED PRICE & IDOR WORKFLOW ===');
    
    let res = await request(app).post('/api/v1/jobs').set('Authorization', authCA)
      .send({ title: 'ValidTest Fixed Job', description: 'ValidTest job description that is definitely long enough to pass the fifty character minimum requirement for the job validation middleware', category: 'Web Development', skills: ['react'], budget: { type: 'fixed', min: 200, max: 200 } });
    assert(res.statusCode === 201, 'Client A created Job');
    const fixedJobId = res.body.data.job._id;

    res = await request(app).post('/api/v1/proposals').set('Authorization', authFA)
      .send({ jobId: fixedJobId, coverLetter: 'Free A proposal. This is a very long cover letter designed to pass the 100 character minimum limit for the proposal validation.', fixedPrice: 200, estimatedDeliveryTime: '1w' });
    const propAId = res.body.data.proposal._id;

    res = await request(app).post('/api/v1/proposals').set('Authorization', authFB)
      .send({ jobId: fixedJobId, coverLetter: 'Free B proposal. This is a very long cover letter designed to pass the 100 character minimum limit for the proposal validation.', fixedPrice: 150, estimatedDeliveryTime: '1w' });
    const propBId = res.body.data.proposal._id;

    res = await request(app).post('/api/v1/proposals').set('Authorization', authFA)
      .send({ jobId: fixedJobId, coverLetter: 'Free A duplicate. This is a very long cover letter designed to pass the 100 character minimum limit for the proposal validation.', fixedPrice: 200, estimatedDeliveryTime: '1w' });
    assert(res.statusCode === 400, 'Duplicate proposal prevented');

    res = await request(app).post(`/api/v1/proposals/${propAId}/accept`).set('Authorization', authCB).send({});
    assert(res.statusCode === 403, 'IDOR prevented: Client B cannot accept Client A project');

    res = await request(app).post(`/api/v1/proposals/${propAId}/accept`).set('Authorization', authCA).send({});
    assert(res.statusCode === 200, 'Client A accepted Freelancer A');
    const contractId = res.body.data.contract._id;

    res = await request(app).post(`/api/v1/proposals/${propBId}/accept`).set('Authorization', authCA).send({});
    assert(res.statusCode === 400 || res.statusCode === 403, 'Duplicate contract prevented');

    const checkPropB = await Proposal.findById(propBId);
    assert(checkPropB.status === 'rejected', 'Orphaned proposals automatically rejected');

    res = await request(app).get(`/api/v1/contracts/${contractId}`).set('Authorization', authFB);
    assert(res.statusCode === 403, 'IDOR prevented: Freelancer B cannot access Contract');

    res = await request(app).post(`/api/v1/payments/jobs/${fixedJobId}/deposit`)
      .set('Authorization', authCA).send({ depositAmount: 10 }); 
    
    assert(res.statusCode === 200, 'Escrow funded');
    const payment = await Payment.findOne({ jobId: fixedJobId });
    assert(payment.depositAmount === 100, 'Payment Validation: Backend ignored tampered depositAmount (strictly calculated)');
    assert(payment.status === 'deposit_paid', 'Escrow status updated to deposit_paid');
    const contractCheck = await Contract.findById(contractId);
    assert(contractCheck.paymentStatus === 'funded', 'Contract marked as funded');

    res = await request(app).post(`/api/v1/deliveries/${contractId}/submit`).set('Authorization', authFB).send({ message: 'Fake delivery' });
    assert(res.statusCode === 403, 'IDOR prevented: Unauthorized delivery submission');

    res = await request(app).post(`/api/v1/deliveries/${contractId}/submit`).set('Authorization', authFA).send({ message: 'Real delivery V1' });
    const del1Id = res.body.data.delivery._id;
    assert(res.statusCode === 201, 'Freelancer A submitted delivery');

    res = await request(app).post(`/api/v1/deliveries/${del1Id}/review`).set('Authorization', authCA).send({ action: 'request_revision', feedback: 'Needs fix' });
    assert(res.statusCode === 200, 'Revision requested');

    res = await request(app).post(`/api/v1/deliveries/${contractId}/submit`).set('Authorization', authFA).send({ message: 'Real delivery V2' });
    const del2Id = res.body.data.delivery._id;

    res = await request(app).post(`/api/v1/deliveries/${del2Id}/review`).set('Authorization', authCA).send({ action: 'accept' });
    assert(res.statusCode === 200, 'Delivery accepted');

    const finalContract = await Contract.findById(contractId);
    assert(finalContract.status === 'completed', 'Contract marked as completed');
    const finalPayment = await Payment.findOne({ jobId: fixedJobId });
    assert(finalPayment.status === 'released', 'Escrow released');

    res = await request(app).post(`/api/v1/deliveries/${del2Id}/review`).set('Authorization', authCA).send({ action: 'accept' });
    assert(res.statusCode === 400, 'Duplicate delivery accept (escrow release) prevented');

    console.log('\n=== HOURLY WORKFLOW ===');
    res = await request(app).post('/api/v1/jobs').set('Authorization', authCB)
      .send({ title: 'ValidTest Hourly Job', description: 'ValidTest job description that is definitely long enough to pass the fifty character minimum requirement for the job validation middleware', category: 'Web Development', skills: ['react'], budget: { type: 'hourly', min: 10, max: 20 } });
    const hourlyJobId = res.body.data.job._id;

    res = await request(app).post('/api/v1/proposals').set('Authorization', authFB)
      .send({ jobId: hourlyJobId, coverLetter: 'Free B proposal. This is a very long cover letter designed to pass the 100 character minimum limit for the proposal validation.', hourlyRate: 15, estimatedWeeklyHours: 20 });
    const propHId = res.body.data.proposal._id;

    res = await request(app).post(`/api/v1/proposals/${propHId}/accept`).set('Authorization', authCB).send({});
    const contractHId = res.body.data.contract._id;

    res = await request(app).post(`/api/v1/time-tracking/${contractHId}/start`).set('Authorization', authFB).send({});
    assert(res.statusCode === 200, 'Timer started');
    
    res = await request(app).post(`/api/v1/time-tracking/${contractHId}/start`).set('Authorization', authFB).send({});
    assert(res.statusCode === 400, 'Duplicate timer start prevented');

    await Contract.findByIdAndUpdate(contractHId, { 'timer.startedAt': new Date(Date.now() - 7200000) }); 

    res = await request(app).post(`/api/v1/time-tracking/${contractHId}/stop`).set('Authorization', authFB).send({ notes: 'Did hourly work' });
    assert(res.statusCode === 200, 'Timer stopped');

    const { generateWeeklyInvoices } = require('./services/cron.service');
    await generateWeeklyInvoices();

    const hPayment = await Payment.findOne({ contractId: contractHId, type: 'hourly_invoice' });
    assert(hPayment !== null, 'Weekly billing generated invoice');
    assert(Math.round(hPayment.totalAmount) === 30, 'Invoice amount strictly backend-calculated');

    await generateWeeklyInvoices();
    const count = await Payment.countDocuments({ contractId: contractHId, type: 'hourly_invoice' });
    assert(count === 1, 'Duplicate billing prevented');

    console.log('\n=== STRIPE DUPLICATE WEBHOOK HANDLING ===');
    const beforeBal = await FreelancerProfile.findOne({ userId: freeA._id });
    
    const { finalizeJobCompletion } = require('./services/jobCompletion.service');
    const jobA = await Job.findById(fixedJobId);
    
    try {
        await finalizeJobCompletion(jobA, { freelancerEarning: 100, clientSpend: 100 });
        assert(false, 'Expected finalizeJobCompletion to throw if already completed');
    } catch(e) {
        assert(true, 'Duplicate job completion blocked natively');
    }
    
    const afterBal = await FreelancerProfile.findOne({ userId: freeA._id });
    assert(beforeBal.walletBalance === afterBal.walletBalance, 'Duplicate execution didn\'t double-credit the wallet');

    console.log('\n=== FINAL VERIFICATION COMPLETE ===');

  } catch(e) {
    console.error(e);
  }

  mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
