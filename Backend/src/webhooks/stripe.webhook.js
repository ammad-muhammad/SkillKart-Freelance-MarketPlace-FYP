const express = require('express');
const Payment = require('../models/Payment');
const Job = require('../models/Job');
const { finalizeJobCompletion } = require('../services/jobCompletion.service');
const notifications = require('../services/notification.service');
const { activateGigOrder } = require('../services/gigOrder.service');
const ClientProfile = require('../models/ClientProfile');

const router = express.Router();

// The global express.json() saves the raw buffer to req.rawBody
router.post('/', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

  if (!STRIPE_WEBHOOK_SECRET) {
    return res.status(400).send('Webhook secret not configured.');
  }

  let event;

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(req.rawBody || req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // Check what type of session it is via metadata
    const jobId = session.metadata?.jobId;
    const phase = session.metadata?.phase;

    if (jobId === 'wallet' && phase === 'wallet') {
      const amountDeposited = (session.amount_total || 0) / 100;
      const userId = session.metadata?.userId;
      if (userId && amountDeposited > 0) {
        // Idempotency check folded into the update's filter, not a separate
        // read-then-write — Stripe explicitly guarantees "at least once"
        // webhook delivery (retries on timeout/non-2xx), and this can also
        // race the frontend's own confirm call for the same session, so a
        // plain findOne-then-update here could double-credit the wallet.
        const updatedProfile = await ClientProfile.findOneAndUpdate(
          { userId, processedSessions: { $ne: session.id } },
          {
            $inc: { walletBalance: amountDeposited },
            $addToSet: { processedSessions: session.id }
          }
        );
        if (updatedProfile) {
          // Create a Payment history record so it shows up in the UI
          await Payment.create({
            clientId: userId,
            type: 'wallet_deposit',
            totalAmount: amountDeposited,
            depositAmount: amountDeposited,
            finalAmount: 0,
            status: 'released', // Show as completed
            depositPaidAt: new Date(),
            stripe: { depositSessionId: session.id }
          });
        }
      }
    } else if (jobId && phase) {
      // It's a job payment. This webhook and the browser redirect's own
      // confirmPayment (payment.controller.js) both confirm the SAME
      // checkout — every write here must be the same atomic conditional
      // claim confirmPayment uses, or whichever of the two runs with stale
      // (non-atomic) data can still duplicate the job-completion/notify
      // side effects even though only one of them can flip the DB status.
      if (phase === 'deposit') {
        const claimedDeposit = await Payment.findOneAndUpdate(
          { jobId, status: 'deposit_pending' },
          { $set: { status: 'deposit_paid', depositPaidAt: new Date(), 'stripe.depositPaymentIntent': session.payment_intent } },
          { new: true }
        );
        if (claimedDeposit) {
          const job = await Job.findById(jobId);
          const activated = job ? await activateGigOrder(job) : false;
          if (!activated && job && job.hiredFreelancer) {
            notifications.onDepositFunded(job.hiredFreelancer, { job });
          }
        }
      } else if (phase === 'final') {
        const payment = await Payment.findOne({ jobId });
        if (payment && payment.status !== 'released') {
          const platformFee = Math.round((payment.totalAmount * payment.feeRate) * 100) / 100;
          const freelancerPayout = Math.round((payment.totalAmount - platformFee) * 100) / 100;
          const claimedFinal = await Payment.findOneAndUpdate(
            { _id: payment._id, status: { $ne: 'released' } },
            { $set: { platformFee, freelancerPayout, status: 'released', releasedAt: new Date(), 'stripe.finalPaymentIntent': session.payment_intent } },
            { new: true }
          );
          if (claimedFinal) {
            const job = await Job.findById(jobId);
            if (job && job.status !== 'completed') {
              job.status = 'completed';
              job.completedAt = new Date();
              await job.save();
              try {
                await finalizeJobCompletion(job, {
                  freelancerEarning: claimedFinal.freelancerPayout,
                  clientSpend: claimedFinal.totalAmount,
                });
              } catch (e) {
                console.error('[Stripe Webhook] stats roll-up failed:', e.message);
              }
              if (job.hiredFreelancer) {
                notifications.onPaymentReleased(job.hiredFreelancer, { job, amount: claimedFinal.freelancerPayout });
              }
            }
          }
        }
      }
    }
  }

  res.status(200).json({ received: true });
});

module.exports = router;
