const mongoose = require('mongoose');
const crypto = require('crypto');
const config = require('../config/index');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },

  otp: {
    type: String,
    required: true
  },

  otpHash: {
    type: String,
    required: true,
    select: false
  },

  purpose: {
    type: String,
    enum: [
      'email_verification',
      'password_reset',
      'profile_update',
      'email_change',
      'phone_verification',
      'sensitive_operation',
      'login',
      'account_deletion',
      'payment_verification'
    ],
    required: true,
    index: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },

  isVerified: {
    type: Boolean,
    default: false
  },

  verifiedAt: {
    type: Date
  },

  expiresAt: {
    type: Date,
    required: true,
    index: true
  },

  attempts: {
    type: Number,
    default: 0
  },

  maxAttempts: {
    type: Number,
    default: 5
  },

  isBlocked: {
    type: Boolean,
    default: false
  },

  blockedAt: {
    type: Date
  },

  metadata: {
    ipAddress: String,
    userAgent: String,
    requestedOperation: String,
    deviceInfo: String
  }

}, {
  timestamps: true
});

// Index for auto-deletion of expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for faster lookups
otpSchema.index({ email: 1, purpose: 1, isVerified: 1 });
otpSchema.index({ userId: 1, purpose: 1 });

// Static method to generate OTP
otpSchema.statics.generateOTP = function(length = config.otp.length) {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  
  return otp;
};

// Static method to hash OTP
otpSchema.statics.hashOTP = function(otp) {
  return crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');
};

// Static method to create new OTP
otpSchema.statics.createOTP = async function({
  email,
  purpose,
  userId = null,
  expiryMinutes = config.otp.expiryMinutes,
  metadata = {}
}) {
  // Delete any existing unverified OTPs for this email and purpose
  await this.deleteMany({
    email,
    purpose,
    isVerified: false
  });

  const otp = this.generateOTP();
  const otpHash = this.hashOTP(otp);
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  const otpRecord = await this.create({
    email,
    otp, // Store for sending, but will be removed after sending
    otpHash,
    purpose,
    userId,
    expiresAt,
    metadata
  });

  return { otpRecord, otp };
};

// Method to verify OTP
otpSchema.methods.verifyOTP = async function(candidateOTP) {
  // Check if blocked
  if (this.isBlocked) {
    throw new Error('OTP is blocked due to too many attempts');
  }

  // Check if already verified
  if (this.isVerified) {
    throw new Error('OTP has already been used');
  }

  // Check if expired
  if (new Date() > this.expiresAt) {
    throw new Error('OTP has expired');
  }

  // Increment attempts
  this.attempts += 1;

  // Block if max attempts reached
  if (this.attempts >= this.maxAttempts) {
    this.isBlocked = true;
    this.blockedAt = new Date();
    await this.save();
    throw new Error('Maximum verification attempts exceeded');
  }

  // Verify OTP
  const candidateHash = this.constructor.hashOTP(candidateOTP);
  
  if (candidateHash !== this.otpHash) {
    await this.save();
    throw new Error(`Invalid OTP. ${this.maxAttempts - this.attempts} attempts remaining`);
  }

  // Mark as verified
  this.isVerified = true;
  this.verifiedAt = new Date();
  await this.save();

  return true;
};

// Static method to verify OTP by email and purpose
otpSchema.statics.verifyOTPByEmail = async function(email, otp, purpose) {
  const otpRecord = await this.findOne({
    email,
    purpose,
    isVerified: false,
    isBlocked: false,
    expiresAt: { $gt: new Date() }
  }).select('+otpHash');

  if (!otpRecord) {
    throw new Error('No valid OTP found');
  }

  return await otpRecord.verifyOTP(otp);
};

// Static method to verify OTP by userId and purpose
otpSchema.statics.verifyOTPByUserId = async function(userId, otp, purpose) {
  const otpRecord = await this.findOne({
    userId,
    purpose,
    isVerified: false,
    isBlocked: false,
    expiresAt: { $gt: new Date() }
  }).select('+otpHash');

  if (!otpRecord) {
    throw new Error('No valid OTP found');
  }

  return await otpRecord.verifyOTP(otp);
};

// Method to check if OTP is valid (without verifying)
otpSchema.methods.isValid = function() {
  return !this.isVerified && 
         !this.isBlocked && 
         new Date() < this.expiresAt &&
         this.attempts < this.maxAttempts;
};

// Static method to check if user can request new OTP (rate limiting)
otpSchema.statics.canRequestNewOTP = async function(email, purpose, cooldownMinutes = 1) {
  const cooldownDate = new Date(Date.now() - cooldownMinutes * 60 * 1000);
  
  const recentOTP = await this.findOne({
    email,
    purpose,
    createdAt: { $gt: cooldownDate }
  }).sort({ createdAt: -1 });

  if (recentOTP) {
    const secondsRemaining = Math.ceil((recentOTP.createdAt.getTime() + (cooldownMinutes * 60 * 1000) - Date.now()) / 1000);
    return {
      allowed: false,
      secondsRemaining,
      message: `Please wait ${secondsRemaining} seconds before requesting a new OTP`
    };
  }

  return { allowed: true };
};

// Clean up OTP after verification (optional, can be kept for audit)
otpSchema.methods.cleanup = async function() {
  await this.deleteOne();
};

// Static method to cleanup expired OTPs (can be run as cron job)
otpSchema.statics.cleanupExpired = async function() {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });

  return {
    success: true,
    deletedCount: result.deletedCount
  };
};

// Static method to cleanup old verified OTPs (keep for audit trail)
otpSchema.statics.cleanupOldVerified = async function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await this.deleteMany({
    isVerified: true,
    verifiedAt: { $lt: cutoffDate }
  });

  return {
    success: true,
    deletedCount: result.deletedCount
  };
};

// Get OTP statistics for admin
otpSchema.statics.getStats = async function(startDate = null, endDate = null) {
  const match = {};
  
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$purpose',
        total: { $sum: 1 },
        verified: {
          $sum: { $cond: ['$isVerified', 1, 0] }
        },
        blocked: {
          $sum: { $cond: ['$isBlocked', 1, 0] }
        },
        expired: {
          $sum: {
            $cond: [
              { $lt: ['$expiresAt', new Date()] },
              1,
              0
            ]
          }
        },
        averageAttempts: { $avg: '$attempts' }
      }
    },
    {
      $project: {
        purpose: '$_id',
        total: 1,
        verified: 1,
        blocked: 1,
        expired: 1,
        averageAttempts: { $round: ['$averageAttempts', 2] },
        successRate: {
          $round: [
            {
              $multiply: [
                { $divide: ['$verified', '$total'] },
                100
              ]
            },
            2
          ]
        }
      }
    }
  ]);

  return stats;
};

// Get OTP statistics by email (for security monitoring)
otpSchema.statics.getEmailStats = async function(email, hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const stats = await this.aggregate([
    {
      $match: {
        email,
        createdAt: { $gte: since }
      }
    },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        successfulVerifications: {
          $sum: { $cond: ['$isVerified', 1, 0] }
        },
        failedAttempts: {
          $sum: { $cond: [{ $gt: ['$attempts', 0] }, '$attempts', 0] }
        },
        blockedOTPs: {
          $sum: { $cond: ['$isBlocked', 1, 0] }
        }
      }
    }
  ]);

  return stats[0] || {
    totalRequests: 0,
    successfulVerifications: 0,
    failedAttempts: 0,
    blockedOTPs: 0
  };
};

// Method to resend OTP (creates new one)
otpSchema.statics.resendOTP = async function(email, purpose, userId = null, metadata = {}) {
  // Check rate limiting
  const rateLimitCheck = await this.canRequestNewOTP(email, purpose);
  
  if (!rateLimitCheck.allowed) {
    throw new Error(rateLimitCheck.message);
  }

  // Create new OTP
  return await this.createOTP({
    email,
    purpose,
    userId,
    metadata
  });
};

// Export OTP data for audit (without sensitive info)
otpSchema.methods.toAuditJSON = function() {
  return {
    email: this.email,
    purpose: this.purpose,
    userId: this.userId,
    isVerified: this.isVerified,
    verifiedAt: this.verifiedAt,
    attempts: this.attempts,
    isBlocked: this.isBlocked,
    expiresAt: this.expiresAt,
    createdAt: this.createdAt
  };
};

const OTP = mongoose.model('OTP', otpSchema);

module.exports = OTP;
