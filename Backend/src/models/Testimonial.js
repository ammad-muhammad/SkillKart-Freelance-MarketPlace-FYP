const mongoose = require('mongoose');

/**
 * A success story submitted by a freelancer from their dashboard.
 * Shown on the public homepage once approved.
 */
const testimonialSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  // Snapshot of display fields at submit time (kept even if profile changes).
  name: { type: String, required: true },
  role: { type: String, default: '' },          // their title/headline
  text: { type: String, required: true },        // the story (the testimonial body)
  rating: { type: Number, min: 1, max: 5, default: 5 },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved', // auto-approved for the demo; flip to 'pending' for real moderation
  },
}, { timestamps: true });

testimonialSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Testimonial', testimonialSchema);
