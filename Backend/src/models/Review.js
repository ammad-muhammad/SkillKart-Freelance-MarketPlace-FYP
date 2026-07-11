const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  jobId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Job', 
    required: true 
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

// A user can only review a specific job once
reviewSchema.index({ jobId: 1, reviewerId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
