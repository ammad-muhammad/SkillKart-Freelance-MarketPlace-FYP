const crypto = require('crypto');
const OTP = require('../models/OTP');
const { sendOTPEmail } = require('./email.service');
const config = require('../config/index');

/**
 * Generate and send OTP
 */
const generateAndSendOTP = async (email, purpose = 'email_verification') => {
  try {
    // Use the schema's createOTP static method
    // This automatically handles otpHash generation
    const { otpRecord, otp } = await OTP.createOTP({
      email,
      purpose,
      expiryMinutes: config.otp.expiryMinutes,
      metadata: {
        requestedOperation: purpose
      }
    });

    // Send OTP via email (send the raw OTP, not the hash)
    await sendOTPEmail(email, otp, purpose);

    return { 
      message: 'OTP sent successfully', 
      expiresIn: config.otp.expiryMinutes,
      email 
    };
  } catch (error) {
    throw new Error(`Failed to generate OTP: ${error.message}`);
  }
};

/**
 * Verify OTP
 */
const verifyOTP = async (email, otpCode, purpose) => {
  try {
    // Use the schema's verifyOTPByEmail static method
    await OTP.verifyOTPByEmail(email, otpCode, purpose);
    
    return { 
      valid: true, 
      message: 'OTP verified successfully' 
    };
  } catch (error) {
    return { 
      valid: false, 
      message: error.message || 'Invalid OTP' 
    };
  }
};

/**
 * Resend OTP with rate limiting
 */
const resendOTP = async (email, purpose = 'email_verification') => {
  try {
    // Check rate limiting (1 minute cooldown)
    const canRequest = await OTP.canRequestNewOTP(email, purpose, 1);
    
    if (!canRequest.allowed) {
      return {
        success: false,
        message: canRequest.message,
        secondsRemaining: canRequest.secondsRemaining
      };
    }

    // Generate new OTP
    const { otpRecord, otp } = await OTP.createOTP({
      email,
      purpose,
      expiryMinutes: 10
    });

    // Send OTP via email. A provider hiccup here must not throw — this
    // endpoint exists specifically so a user stuck on the OTP screen (e.g.
    // because the first send failed) can recover; if the retry ALSO fails,
    // they need a clean error response, not a 500, to actually see why.
    try {
      await sendOTPEmail(email, otp, purpose);
    } catch (sendErr) {
      console.error('[resendOTP] Email send failed:', sendErr.message);
      return {
        success: false,
        message: 'Failed to send verification email. Please try again in a moment.'
      };
    }

    return {
      success: true,
      message: 'OTP resent successfully',
      expiresIn: 600
    };
  } catch (error) {
    throw new Error(`Failed to resend OTP: ${error.message}`);
  }
};

/**
 * Check if OTP exists and is valid
 */
const checkOTPExists = async (email, purpose) => {
  try {
    const otp = await OTP.findOne({
      email,
      purpose,
      isVerified: false,
      isBlocked: false,
      expiresAt: { $gt: new Date() }
    });

    return otp ? true : false;
  } catch (error) {
    return false;
  }
};

/**
 * Get OTP statistics for monitoring
 */
const getOTPStats = async (email, hours = 24) => {
  try {
    const stats = await OTP.getEmailStats(email, hours);
    return stats;
  } catch (error) {
    throw new Error(`Failed to get OTP stats: ${error.message}`);
  }
};

/**
 * Clean up expired OTPs (run as cron job)
 */
const cleanupExpiredOTPs = async () => {
  try {
    const result = await OTP.cleanupExpired();
    return result.deletedCount;
  } catch (error) {
    throw new Error(`Failed to cleanup expired OTPs: ${error.message}`);
  }
};

/**
 * Clean up old verified OTPs for audit trail retention
 */
const cleanupOldVerifiedOTPs = async (daysOld = 30) => {
  try {
    const result = await OTP.cleanupOldVerified(daysOld);
    return result.deletedCount;
  } catch (error) {
    throw new Error(`Failed to cleanup old verified OTPs: ${error.message}`);
  }
};

module.exports = {
  generateAndSendOTP,
  verifyOTP,
  resendOTP,
  checkOTPExists,
  getOTPStats,
  cleanupExpiredOTPs,
  cleanupOldVerifiedOTPs
};