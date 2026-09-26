const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  jobId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Job', 
    required: false 
  },
  reviewerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  revieweeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  rating: { 
    type: Number, 
    required: true,
    min: 1,
    max: 5
  },
  comment: { 
    type: String, 
    trim: true,
    maxlength: 1000,
    default: ''
  },
  type: {
    type: String,
    enum: ['client_to_freelancer', 'freelancer_to_client'],
    required: true
  },

  // ========================
  // Admin Panel Fields
  // ========================
  isHidden: { type: Boolean, default: false },
  hiddenBy: { type: String },     // Admin email
  hiddenAt: { type: Date },
  hiddenReason: { type: String }

}, { timestamps: true });

// A user can only review a specific job once (sparse for direct reviews)
reviewSchema.index({ jobId: 1, reviewerId: 1 }, { unique: true, sparse: true });

// A user can review a user profile once per direction if no jobId
reviewSchema.index({ revieweeId: 1, reviewerId: 1, type: 1 });

// freelancer.controller.js / job.controller.js fetch a user's public reviews
// via Review.find({ revieweeId, type }) — the most common read path.
reviewSchema.index({ revieweeId: 1, type: 1 });

module.exports = mongoose.model('Review', reviewSchema);
