const mongoose = require('mongoose');

const newsletterSubscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  status: { type: String, enum: ['active', 'unsubscribed'], default: 'active' },
  meta: {
    ip: String,
    userAgent: String,
  },
}, { timestamps: true });

newsletterSubscriberSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('NewsletterSubscriber', newsletterSubscriberSchema);
