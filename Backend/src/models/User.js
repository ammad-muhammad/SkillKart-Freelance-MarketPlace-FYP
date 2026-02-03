const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    supabaseId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['client', 'freelancer'],
      default: null,
    },
    authProvider: {
      type: String,
      enum: ['email', 'google'],
      required: true,
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
userSchema.index({ supabaseId: 1 });
userSchema.index({ email: 1 });
userSchema.index({ role: 1, isActive: 1 });

// Virtual for profile
userSchema.virtual('profile', {
  ref: function() {
    return this.role === 'client' ? 'ClientProfile' : 'FreelancerProfile';
  },
  localField: '_id',
  foreignField: 'userId',
  justOne: true,
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
