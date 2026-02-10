const OTP = require('../models/OTP');
const { UnauthorizedError } = require('../utils/apiError');

const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) throw new UnauthorizedError('Email and OTP are required');

    const otpDoc = await OTP.findOne({ email, otp: require('crypto').createHash('sha256').update(otp).digest('hex') });
    if (!otpDoc) throw new UnauthorizedError('Invalid OTP');
    if (otpDoc.expiresAt < new Date()) throw new UnauthorizedError('OTP has expired');
    if (otpDoc.attempts >= 5) throw new UnauthorizedError('Too many attempts');

    req.otpVerified = true;
    req.otpPurpose = otpDoc.purpose;
    await OTP.deleteOne({ _id: otpDoc._id });
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { verifyOTP };
