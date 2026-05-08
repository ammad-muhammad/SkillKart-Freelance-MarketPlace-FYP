const mongoose = require('mongoose');

const gigSchema = new mongoose.Schema({
  freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  shortDescription: { type: String },
  fullDescription: { type: String, required: true },
  category: { type: String, required: true },
  subcategory: { type: String },
  skills: [String],
  pricing: {
    basic: {
      price: { type: Number, required: true },
      deliveryTime: String,
      revisions: Number,
      features: [String]
    },
    standard: {
      price: Number,
      deliveryTime: String,
      revisions: Number,
      features: [String]
    },
    premium: {
      price: Number,
      deliveryTime: String,
      revisions: Number,
      features: [String]
    }
  },
  media: {
    banner: String,
    images: [String],
    video: String
  },
  faqs: [{
    question: String,
    answer: String
  }],
  status: {
    type: String,
    enum: ['draft', 'active', 'paused'],
    default: 'draft'
  },
  stats: {
    views: { type: Number, default: 0 },
    orders: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Gig', gigSchema);
