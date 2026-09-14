const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  pendingEmail: {
    type: String,
    lowercase: true,
    trim: true
  },
  pendingRecoveryEmail: {
    type: String,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    select: false // Don't return password by default
  },

  // Personal Details
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  username: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true,
    unique: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username must not exceed 30 characters'],
    match: [/^[a-z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  profilePicture: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    sparse: true
  },

  // Role-Based Access Control
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'contenteditor', 'freelancer', 'client', 'publicviewer'],
    default: 'publicviewer',
    required: true
  },

  // Authentication Methods
  authProvider: {
    type: String,
    enum: ['email', 'google', 'linkedin', 'github', 'supabase'],
    default: 'email'
  },

  // Supabase Integration
  supabaseId: {
    type: String,
    index: {
      unique: true,
      partialFilterExpression: { supabaseId: { $type: 'string' } }
    }
  },
  isSyncedToSupabase: {
    type: Boolean,
    default: false
  },
  lastSyncedAt: Date,

  // OAuth Data (from Supabase or direct OAuth)
  oauthId: {
    type: String,
    sparse: true
  },
  oauthData: {
    provider: String,
    accessToken: { type: String, select: false },
    refreshToken: { type: String, select: false },
    profile: mongoose.Schema.Types.Mixed
  },

  // LinkedIn Specific Data (extracted from OAuth)
  linkedinData: {
    headline: String,
    summary: String,
    positions: [{
      title: String,
      company: String,
      location: String,
      startDate: Date,
      endDate: Date,
      current: Boolean,
      description: String
    }],
    education: [{
      school: String,
      degree: String,
      field: String,
      startDate: Date,
      endDate: Date
    }],
    skills: [String],
    endorsements: Number,
    connections: Number
  },

  // GitHub Specific Data (extracted from OAuth)
  githubData: {
    username: String,
    bio: String,
    publicRepos: Number,
    followers: Number,
    following: Number,
    repositories: [{
      name: String,
      description: String,
      language: String,
      stars: Number,
      forks: Number,
      url: String
    }],
    contributions: Number,
    topLanguages: [String]
  },

  // Verification Status
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerifiedAt: {
    type: Date
  },

  //onbaording Status
  isOnBoardingCompleted: {
    type: Boolean,
    default: false
  },

  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockedReason: String,
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  blockedAt: Date,
  contactViolations: {
    type: Number,
    default: 0
  },

  // SuperAdmin/Admin Specific
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  permissions: [{
    type: String
  }],

  // Profile References (based on role)
  freelancerProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FreelancerProfile'
  },
  clientProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClientProfile'
  },

  // Security
  lastPasswordChange: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
  lastActive: Date,
  // Bumping this invalidates every JWT issued before the bump → "log out all
  // devices" and forced sign-out after a password change.
  tokenVersion: {
    type: Number,
    default: 0
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,

  // FCM device tokens for the mobile app's push notifications (see
  // services/push.service.js) — multiple entries per user since the same
  // account can be logged into more than one device.
  pushTokens: {
    type: [String],
    default: []
  },

  // Metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    registrationSource: String,
    deviceInfo: String
  },

  // ========================
  // Admin Panel Fields
  // ========================
  // Marks a non-human system account (e.g. the "SkillKart Support" chat identity
  // used for admin↔user messaging). Excluded from public/admin user listings.
  isSystemAccount: { type: Boolean, default: false },
  suspendedAt: { type: Date },
  suspendedReason: { type: String },
  suspendedBy: { type: String }, // Admin email

  // Soft delete — data preserved, user can't log in
  deletedAt: { type: Date },
  deletedBy: { type: String }   // Admin email

}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ email: 1, role: 1 });
// Create unique partial index for oauthId - only enforces uniqueness when value is not null
userSchema.index({ oauthId: 1, authProvider: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ isActive: 1, isBlocked: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  if (!this.firstName && !this.lastName) return null;
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  // Only hash password if it's modified and exists
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if account is locked
userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function () {
  // Reset attempts if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2 hours

  // Lock account after max attempts
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }

  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

// Static method to get user with role check
userSchema.statics.findByIdWithRole = async function (userId, allowedRoles) {
  const user = await this.findById(userId);
  if (!user) return null;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new Error('Insufficient permissions');
  }

  return user;
};

// Static method to find by Supabase ID
userSchema.statics.findBySupabaseId = async function (supabaseId) {
  return await this.findOne({ supabaseId });
};

// Static method to find or create from Supabase
userSchema.statics.findOrCreateFromSupabase = async function (supabaseUser) {
  let user = await this.findOne({ supabaseId: supabaseUser.id });

  if (!user) {
    user = await this.findOne({ email: supabaseUser.email });

    if (user) {
      // Link existing user to Supabase
      user.supabaseId = supabaseUser.id;
      user.isSyncedToSupabase = true;
      user.lastSyncedAt = new Date();
      await user.save();
    } else {
      // Create new user from Supabase data
      user = new this({
        email: supabaseUser.email,
        supabaseId: supabaseUser.id,
        firstName: supabaseUser.user_metadata?.firstName || supabaseUser.user_metadata?.first_name,
        lastName: supabaseUser.user_metadata?.lastName || supabaseUser.user_metadata?.last_name,
        profilePicture: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture,
        authProvider: supabaseUser.app_metadata?.provider || 'supabase',
        isEmailVerified: supabaseUser.email_confirmed_at ? true : false,
        emailVerifiedAt: supabaseUser.email_confirmed_at ? new Date(supabaseUser.email_confirmed_at) : null,
        role: supabaseUser.user_metadata?.role || 'publicviewer',
        isOnBoardingCompleted: false,
        isSyncedToSupabase: true,
        lastSyncedAt: new Date(),
        metadata: {
          registrationSource: 'supabase'
        }
      });

      await user.save();
    }
  }

  return user;
};

// Method to sanitize user data for response
userSchema.methods.toAuthJSON = function () {
  return {
    id: this._id,
    email: this.email,
    username: this.username,
    firstName: this.firstName,
    lastName: this.lastName,
    fullName: this.fullName,
    profilePicture: this.profilePicture,
    role: this.role,
    isEmailVerified: this.isEmailVerified,
    authProvider: this.authProvider,
    isOnBoardingCompleted: this.isOnBoardingCompleted,
    supabaseId: this.supabaseId,
    isBlocked: this.isBlocked,
    blockedReason: this.blockedReason,
    createdAt: this.createdAt
  };
};

// Method to get public profile (for other users to see)
userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    fullName: this.fullName,
    profilePicture: this.profilePicture,
    role: this.role,
    isOnBoardingCompleted: this.isOnBoardingCompleted
  };
};

const User = mongoose.model('User', userSchema);

module.exports = User;