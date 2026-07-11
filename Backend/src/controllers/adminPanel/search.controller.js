const User = require('../../models/User');
const Job = require('../../models/Job');
const Contract = require('../../models/Contract');
const Payment = require('../../models/Payment');
const Withdrawal = require('../../models/Withdrawal');
const Report = require('../../models/Report');
const Review = require('../../models/Review');
const Conversation = require('../../models/Conversation');

/**
 * GET /search/global?q=term&types=users,jobs
 * Returns categorized results (max 5 per type).
 */
const globalSearch = async (req, res) => {
  try {
    const { q, types } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters' });
    }

    const term = q.trim();
    const regex = new RegExp(term, 'i');

    const requestedTypes = types
      ? types.split(',').map(t => t.trim())
      : ['users', 'jobs', 'contracts', 'payments', 'withdrawals', 'reports', 'reviews'];

    const results = {};

    const searches = [];

    if (requestedTypes.includes('users')) {
      searches.push(
        User.find({
          $or: [
            { email: regex },
            { firstName: regex },
            { lastName: regex },
            { username: regex }
          ],
          deletedAt: null
        })
          .select('email firstName lastName username role isBlocked createdAt')
          .limit(5)
          .lean()
          .then(docs => {
            results.users = docs.map(u => ({
              _id: u._id,
              label: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
              sublabel: u.email,
              type: 'user',
              role: u.role,
              status: u.isBlocked ? 'suspended' : 'active',
              link: `/admin-panel/users/${u._id}`
            }));
          })
      );
    }

    if (requestedTypes.includes('jobs')) {
      searches.push(
        Job.find({ $or: [{ title: regex }, { description: regex }] })
          .select('title status budget createdAt')
          .limit(5)
          .lean()
          .then(docs => {
            results.jobs = docs.map(j => ({
              _id: j._id,
              label: j.title,
              sublabel: `Status: ${j.status}`,
              type: 'job',
              status: j.status,
              link: `/admin-panel/jobs/${j._id}`
            }));
          })
      );
    }

    if (requestedTypes.includes('contracts')) {
      searches.push(
        Contract.find({ $or: [{ title: regex }] })
          .populate('clientId', 'email firstName lastName')
          .populate('freelancerId', 'email firstName lastName')
          .select('title status createdAt')
          .limit(5)
          .lean()
          .then(docs => {
            results.contracts = docs.map(c => ({
              _id: c._id,
              label: c.title || `Contract ${c._id.toString().slice(-6)}`,
              sublabel: `Status: ${c.status}`,
              type: 'contract',
              status: c.status,
              link: `/admin-panel/contracts/${c._id}`
            }));
          })
      );
    }

    if (requestedTypes.includes('payments')) {
      searches.push(
        Payment.find({ $or: [{ 'stripe.depositSessionId': regex }, { 'stripe.finalSessionId': regex }] })
          .limit(5)
          .lean()
          .then(docs => {
            results.payments = docs.map(p => ({
              _id: p._id,
              label: `Payment ${p._id.toString().slice(-6)}`,
              sublabel: `${p.status} · ${p.totalAmount} ${p.currency}`,
              type: 'payment',
              status: p.status,
              link: `/admin-panel/payments/${p._id}`
            }));
          })
      );
    }

    if (requestedTypes.includes('withdrawals')) {
      searches.push(
        Withdrawal.find({ $or: [{ referenceId: regex }] })
          .populate('userId', 'email')
          .limit(5)
          .lean()
          .then(docs => {
            results.withdrawals = docs.map(w => ({
              _id: w._id,
              label: `Withdrawal ${w._id.toString().slice(-6)}`,
              sublabel: `${w.status} · ${w.amount}`,
              type: 'withdrawal',
              status: w.status,
              link: `/admin-panel/withdrawals`
            }));
          })
      );
    }

    if (requestedTypes.includes('reports')) {
      searches.push(
        Report.find({ description: regex })
          .limit(5)
          .lean()
          .then(docs => {
            results.reports = docs.map(r => ({
              _id: r._id,
              label: `Report — ${r.category}`,
              sublabel: `${r.status} · ${r.priority} priority`,
              type: 'report',
              status: r.status,
              link: `/admin-panel/reports/${r._id}`
            }));
          })
      );
    }

    if (requestedTypes.includes('reviews')) {
      searches.push(
        Review.find({ comment: regex })
          .limit(5)
          .lean()
          .then(docs => {
            results.reviews = docs.map(r => ({
              _id: r._id,
              label: `Review — Rating ${r.rating}/5`,
              sublabel: r.isHidden ? 'Hidden' : 'Visible',
              type: 'review',
              status: r.isHidden ? 'hidden' : 'visible',
              link: `/admin-panel/reviews`
            }));
          })
      );
    }

    await Promise.all(searches);

    const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

    return res.status(200).json({
      success: true,
      query: term,
      totalResults,
      results
    });

  } catch (err) {
    console.error('[Search] globalSearch error:', err);
    return res.status(500).json({ success: false, message: 'Search failed' });
  }
};

module.exports = { globalSearch };
