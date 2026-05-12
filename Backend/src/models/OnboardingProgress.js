const mongoose = require('mongoose');

const onboardingProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  userType: {
    type: String,
    enum: ['freelancer', 'client'],
    required: true
  },

  // Common Steps for Both
  steps: {
    emailVerified: {
      completed: { type: Boolean, default: false },
      completedAt: Date,
      required: { type: Boolean, default: true }
    },
    
    profileCompleted: {
      completed: { type: Boolean, default: false },
      completedAt: Date,
      required: { type: Boolean, default: true },
      completionPercentage: { type: Number, default: 0 }
    },

    // Freelancer Specific Steps
    skillTestPassed: {
      completed: { type: Boolean, default: false },
      completedAt: Date,
      required: { type: Boolean, default: true },
      testScore: Number,
      testAttempts: { type: Number, default: 0 },
      maxAttempts: { type: Number, default: 3 },
      lastAttemptDate: Date,
      passingScore: { type: Number, default: 70 }
    },

    cvUploaded: {
      completed: { type: Boolean, default: false },
      completedAt: Date,
      required: { type: Boolean, default: true },
      cvUrl: String,
      cvFileName: String,
      cvFileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FileUpload'
      }
    },

    portfolioAdded: {
      completed: { type: Boolean, default: false },
      completedAt: Date,
      required: { type: Boolean, default: false },
      portfolioItems: { type: Number, default: 0 },
      minItemsRequired: { type: Number, default: 1 }
    },

    // Client Specific Steps
    companyVerified: {
      completed: { type: Boolean, default: false },
      completedAt: Date,
      required: { type: Boolean, default: true },
      verificationDocuments: [String],
      verificationStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      rejectionReason: String,
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },

    paymentMethodAdded: {
      completed: { type: Boolean, default: false },
      completedAt: Date,
      required: { type: Boolean, default: true },
      paymentMethods: [{
        type: { type: String, enum: ['card', 'bank', 'paypal', 'stripe'] },
        last4: String,
        addedAt: Date
      }]
    },

    firstJobPosted: {
      completed: { type: Boolean, default: false },
      completedAt: Date,
      required: { type: Boolean, default: false },
      jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job'
      }
    }
  },

  // Overall Progress
  overallProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  isOnboardingComplete: {
    type: Boolean,
    default: false
  },

  completedAt: {
    type: Date
  },

  // Current Step
  currentStep: {
    type: String
  },

  // Notifications
  remindersSent: {
    type: Number,
    default: 0
  },
  lastReminderSent: {
    type: Date
  },
  nextReminderDue: {
    type: Date
  },

  // Admin Notes
  adminNotes: [{
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Skip options (for optional steps)
  skippedSteps: [{
    stepName: String,
    skippedAt: Date,
    reason: String
  }]

}, {
  timestamps: true
});

// Index for queries
onboardingProgressSchema.index({ userId: 1, userType: 1 });
onboardingProgressSchema.index({ isOnboardingComplete: 1 });
onboardingProgressSchema.index({ overallProgress: 1 });

// Calculate overall progress
onboardingProgressSchema.methods.calculateProgress = function() {
  const steps = this.steps;
  let completedRequired = 0;
  let totalRequired = 0;

  Object.keys(steps).forEach(key => {
    if (steps[key].required) {
      totalRequired++;
      if (steps[key].completed) {
        completedRequired++;
      }
    }
  });

  this.overallProgress = totalRequired > 0 
    ? Math.round((completedRequired / totalRequired) * 100) 
    : 0;

  // Check if onboarding is complete
  this.isOnboardingComplete = this.overallProgress === 100;

  if (this.isOnboardingComplete && !this.completedAt) {
    this.completedAt = new Date();
  }

  // Determine current step
  if (!this.isOnboardingComplete) {
    this.currentStep = this.getNextIncompleteStep();
  }
};

// Pre-save hook to calculate progress
onboardingProgressSchema.pre('save', function(next) {
  this.calculateProgress();
  next();
});

// Method to mark step as complete
onboardingProgressSchema.methods.completeStep = async function(stepName, additionalData = {}) {
  if (this.steps[stepName]) {
    this.steps[stepName].completed = true;
    this.steps[stepName].completedAt = new Date();
    
    // Add any additional data
    Object.keys(additionalData).forEach(key => {
      if (this.steps[stepName][key] !== undefined) {
        this.steps[stepName][key] = additionalData[key];
      }
    });

    await this.save();
    return true;
  }
  return false;
};

// Method to update step data without marking complete
onboardingProgressSchema.methods.updateStep = async function(stepName, data = {}) {
  if (this.steps[stepName]) {
    Object.keys(data).forEach(key => {
      if (this.steps[stepName][key] !== undefined) {
        this.steps[stepName][key] = data[key];
      }
    });

    await this.save();
    return true;
  }
  return false;
};

// Method to get pending steps
onboardingProgressSchema.methods.getPendingSteps = function() {
  const pending = [];
  
  Object.keys(this.steps).forEach(key => {
    if (this.steps[key].required && !this.steps[key].completed) {
      pending.push({
        step: key,
        ...this.steps[key].toObject()
      });
    }
  });

  return pending;
};

// Method to get next incomplete step
onboardingProgressSchema.methods.getNextIncompleteStep = function() {
  const stepOrder = this.userType === 'freelancer' 
    ? ['emailVerified', 'profileCompleted', 'skillTestPassed', 'cvUploaded', 'portfolioAdded']
    : ['emailVerified', 'profileCompleted', 'companyVerified', 'paymentMethodAdded', 'firstJobPosted'];

  for (const stepName of stepOrder) {
    if (this.steps[stepName] && this.steps[stepName].required && !this.steps[stepName].completed) {
      return stepName;
    }
  }

  return null;
};

// Method to skip optional step
onboardingProgressSchema.methods.skipStep = async function(stepName, reason = '') {
  if (this.steps[stepName] && !this.steps[stepName].required) {
    this.skippedSteps.push({
      stepName,
      skippedAt: new Date(),
      reason
    });
    await this.save();
    return true;
  }
  return false;
};

// Method to schedule reminder
onboardingProgressSchema.methods.scheduleReminder = function(daysFromNow = 3) {
  const nextReminder = new Date();
  nextReminder.setDate(nextReminder.getDate() + daysFromNow);
  
  this.nextReminderDue = nextReminder;
  this.remindersSent += 1;
  this.lastReminderSent = new Date();
};

// Method to add admin note
onboardingProgressSchema.methods.addAdminNote = async function(note, adminId) {
  this.adminNotes.push({
    note,
    addedBy: adminId,
    addedAt: new Date()
  });
  await this.save();
};

// Static method to initialize onboarding for user
onboardingProgressSchema.statics.initializeForUser = async function(userId, userType) {
  const existing = await this.findOne({ userId });
  if (existing) return existing;

  const onboarding = new this({
    userId,
    userType,
    currentStep: 'emailVerified'
  });

  // Set required steps based on user type
  if (userType === 'freelancer') {
    // Disable client-specific steps
    onboarding.steps.companyVerified.required = false;
    onboarding.steps.paymentMethodAdded.required = false;
    onboarding.steps.firstJobPosted.required = false;
  } else if (userType === 'client') {
    // Disable freelancer-specific steps
    onboarding.steps.skillTestPassed.required = false;
    onboarding.steps.cvUploaded.required = false;
    onboarding.steps.portfolioAdded.required = false;
  }

  await onboarding.save();
  return onboarding;
};

// Static method to get incomplete onboardings
onboardingProgressSchema.statics.getIncompleteOnboardings = async function(daysOld = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return await this.find({
    isOnboardingComplete: false,
    createdAt: { $lt: cutoffDate }
  }).populate('userId', 'email firstName lastName');
};

// Static method to get statistics
onboardingProgressSchema.statics.getStats = async function(userType = null) {
  const match = userType ? { userType } : {};

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: ['$isOnboardingComplete', 1, 0] }
        },
        averageProgress: { $avg: '$overallProgress' },
        inProgress: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gt: ['$overallProgress', 0] },
                  { $lt: ['$overallProgress', 100] }
                ]
              },
              1,
              0
            ]
          }
        },
        notStarted: {
          $sum: { $cond: [{ $eq: ['$overallProgress', 0] }, 1, 0] }
        }
      }
    }
  ]);

  return stats[0] || {
    total: 0,
    completed: 0,
    averageProgress: 0,
    inProgress: 0,
    notStarted: 0
  };
};

// Method to export onboarding status
onboardingProgressSchema.methods.toJSON = function() {
  const obj = this.toObject();
  
  return {
    userId: obj.userId,
    userType: obj.userType,
    overallProgress: obj.overallProgress,
    isComplete: obj.isOnboardingComplete,
    currentStep: obj.currentStep,
    completedAt: obj.completedAt,
    steps: obj.steps,
    pendingSteps: this.getPendingSteps(),
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt
  };
};

const OnboardingProgress = mongoose.model('OnboardingProgress', onboardingProgressSchema);

module.exports = OnboardingProgress;
