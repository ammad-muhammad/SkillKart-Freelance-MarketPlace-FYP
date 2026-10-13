const mongoose = require('mongoose');

/**
 * PlatformSettings — stores global configurations like the weighted scoring
 * metrics for taxonomy category ranking.
 */
const platformSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'category_popularity_weights'
    },
    weights: {
      gigs: { type: Number, default: 0.40 },
      jobs: { type: Number, default: 0.25 },
      freelancers: { type: Number, default: 0.20 },
      searchVolume: { type: Number, default: 0.10 },
      views: { type: Number, default: 0.05 }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
