const mongoose = require('mongoose');

const clientProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  companyName: String,
  companySize: String,
  industry: String,
  website: String,
  description: String,
  location: {
    country: String,
    city: String,
    address: String
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  verificationDocuments: [String],
  rating: { type: Number, default: 0, min: 0, max: 5 },
  totalProjectsPosted: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('ClientProfile', clientProfileSchema);