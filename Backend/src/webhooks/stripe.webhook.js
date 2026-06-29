const express = require('express');
const stripeService = require('../services/stripe.service');
const Payment = require('../models/Payment');
const Job = require('../models/Job');
const { finalizeJobCompletion } = require('../services/jobCompletion.service');
const notifications = require('../services/notification.service');
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
        // Idempotency check: don't double fund
        const profile = await ClientProfile.findOne({ userId });
        if (profile && !profile.processedSessions.includes(session.id)) {
          await ClientProfile.findOneAndUpdate(
            { userId },
            { 
              $inc: { walletBalance: amountDeposited },
              $addToSet: { processedSessions: session.id }
            }
          );
          
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
      // It's a job payment
      const payment = await Payment.findOne({ jobId });
      if (payment) {
        const job = await Job.findById(jobId);
        
        if (phase === 'deposit' && payment.status === 'deposit_pending') {
          payment.status = 'deposit_paid';
          payment.depositPaidAt = new Date();
          payment.stripe.depositPaymentIntent = session.payment_intent;
          await payment.save();
          if (job && job.hiredFreelancer) {
            notifications.onDepositFunded(job.hiredFreelancer, { job });
          }
        } else if (phase === 'final' && payment.status !== 'released') {
          payment.platformFee = Math.round((payment.totalAmount * payment.feeRate) * 100) / 100;
          payment.freelancerPayout = Math.round((payment.totalAmount - payment.platformFee) * 100) / 100;
          payment.status = 'released';
          payment.releasedAt = new Date();
          payment.stripe.finalPaymentIntent = session.payment_intent;
          await payment.save();

          if (job && job.status !== 'completed') {
            job.status = 'completed';
            job.completedAt = new Date();
            await job.save();
            try {
              await finalizeJobCompletion(job, {
                freelancerEarning: payment.freelancerPayout,
                clientSpend: payment.totalAmount,
              });
            } catch (e) {
              console.error('[Stripe Webhook] stats roll-up failed:', e.message);
            }
            if (job.hiredFreelancer) {
              notifications.onPaymentReleased(job.hiredFreelancer, { job, amount: payment.freelancerPayout });
            }
          }
        }
      }
    }
  }

  res.status(200).json({ received: true });
});

module.exports = router;
