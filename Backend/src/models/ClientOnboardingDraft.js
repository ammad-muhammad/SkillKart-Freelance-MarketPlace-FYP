const mongoose = require('mongoose');

const clientOnboardingDraftSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  formData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  step: {
    type: Number,
    required: true,
    default: 1
  }
}, { timestamps: true });

module.exports = mongoose.model('ClientOnboardingDraft', clientOnboardingDraftSchema);
