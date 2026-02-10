const mongoose = require('mongoose');

const cmsContentSchema = new mongoose.Schema({
  // Page Identification
  pageId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },

  pageName: {
    type: String,
    required: true
  },

  pageType: {
    type: String,
    enum: ['home', 'about', 'contact', 'services', 'pricing', 'blog', 'faq', 'terms', 'privacy', 'custom'],
    default: 'custom',
    index: true
  },

  // Content Structure
  content: {
    // Hero Section
    hero: {
      title: String,
      subtitle: String,
      description: String,
      backgroundImage: String,
      backgroundVideo: String,
      ctaButtons: [{
        text: String,
        link: String,
        style: { type: String, enum: ['primary', 'secondary', 'outline', 'ghost'], default: 'primary' },
        icon: String,
        openInNewTab: { type: Boolean, default: false }
      }],
      overlayOpacity: { type: Number, default: 0.5, min: 0, max: 1 }
    },

    // Sections (flexible array for different page structures)
    sections: [{
      sectionId: String,
      sectionType: {
        type: String,
        enum: [
          'text',
          'image',
          'video',
          'features',
          'testimonials',
          'pricing',
          'faq',
          'stats',
          'team',
          'gallery',
          'form',
          'cta',
          'custom'
        ]
      },
      title: String,
      subtitle: String,
      content: mongoose.Schema.Types.Mixed, // Flexible content structure
      order: Number,
      isVisible: { type: Boolean, default: true },
      styling: {
        backgroundColor: String,
        textColor: String,
        padding: String,
        margin: String,
        customCSS: String,
        alignment: { type: String, enum: ['left', 'center', 'right'], default: 'left' }
      },
      animation: {
        enabled: { type: Boolean, default: false },
        type: String,
        duration: Number,
        delay: Number
      }
    }],

    // SEO Data
    seo: {
      metaTitle: String,
      metaDescription: String,
      metaKeywords: [String],
      ogImage: String,
      ogTitle: String,
      ogDescription: String,
      ogType: { type: String, default: 'website' },
      twitterCard: { type: String, default: 'summary_large_image' },
      twitterImage: String,
      canonicalUrl: String,
      robots: {
        index: { type: Boolean, default: true },
        follow: { type: Boolean, default: true }
      }
    },

    // Global Settings
    settings: {
      showHeader: { type: Boolean, default: true },
      showFooter: { type: Boolean, default: true },
      showSidebar: { type: Boolean, default: false },
      template: String,
      customScripts: {
        header: String,
        footer: String,
        bodyStart: String,
        bodyEnd: String
      },
      customStyles: String
    }
  },

  // Publication Status
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'scheduled'],
    default: 'draft',
    index: true
  },

  publishedAt: {
    type: Date
  },

  scheduledPublishAt: {
    type: Date,
    index: true
  },

  archivedAt: {
    type: Date
  },

  // Version Control
  version: {
    type: Number,
    default: 1
  },

  previousVersions: [{
    versionNumber: Number,
    content: mongoose.Schema.Types.Mixed,
    status: String,
    savedAt: Date,
    savedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    comment: String
  }],

  // Access Control
  isPublic: {
    type: Boolean,
    default: true
  },

  allowedRoles: [{
    type: String,
    enum: ['superadmin', 'admin', 'contenteditor', 'freelancer', 'client', 'publicviewer']
  }],

  // Audit Trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  modificationHistory: [{
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    modifiedAt: {
      type: Date,
      default: Date.now
    },
    changes: String,
    fieldsChanged: [String],
    action: {
      type: String,
      enum: ['created', 'updated', 'published', 'unpublished', 'archived', 'restored']
    }
  }],

  // Analytics
  viewCount: {
    type: Number,
    default: 0
  },

  lastViewedAt: {
    type: Date
  },

  uniqueViewers: {
    type: Number,
    default: 0
  },

  // Comments/Collaboration
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    resolved: {
      type: Boolean,
      default: false
    }
  }]

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
cmsContentSchema.index({ pageType: 1, status: 1 });
cmsContentSchema.index({ createdBy: 1 });
cmsContentSchema.index({ publishedAt: -1 });
cmsContentSchema.index({ status: 1, scheduledPublishAt: 1 });
cmsContentSchema.index({ 'content.seo.metaKeywords': 1 });

// Virtual for URL slug
cmsContentSchema.virtual('slug').get(function() {
  return this.pageId.toLowerCase().replace(/[^a-z0-9]+/g, '-');
});

// Virtual for version history count
cmsContentSchema.virtual('versionCount').get(function() {
  return this.previousVersions.length + 1; // +1 for current version
});

// Pre-save middleware to create version history
cmsContentSchema.pre('save', function(next) {
  if (this.isModified('content') && !this.isNew) {
    // Save previous version before updating
    this.previousVersions.push({
      versionNumber: this.version,
      content: this.content,
      status: this.status,
      savedAt: new Date(),
      savedBy: this.lastModifiedBy,
      comment: `Auto-saved version ${this.version}`
    });

    // Keep only last 20 versions
    if (this.previousVersions.length > 20) {
      this.previousVersions = this.previousVersions.slice(-20);
    }

    this.version += 1;
  }

  next();
});

// Method to publish content
cmsContentSchema.methods.publish = async function(userId, comment = '') {
  this.status = 'published';
  this.publishedAt = new Date();
  this.lastModifiedBy = userId;
  
  this.modificationHistory.push({
    modifiedBy: userId,
    modifiedAt: new Date(),
    changes: comment || 'Content published',
    action: 'published'
  });

  await this.save();
};

// Method to unpublish content
cmsContentSchema.methods.unpublish = async function(userId, comment = '') {
  this.status = 'draft';
  this.lastModifiedBy = userId;
  
  this.modificationHistory.push({
    modifiedBy: userId,
    modifiedAt: new Date(),
    changes: comment || 'Content unpublished',
    action: 'unpublished'
  });

  await this.save();
};

// Method to archive content
cmsContentSchema.methods.archive = async function(userId, comment = '') {
  this.status = 'archived';
  this.archivedAt = new Date();
  this.lastModifiedBy = userId;
  
  this.modificationHistory.push({
    modifiedBy: userId,
    modifiedAt: new Date(),
    changes: comment || 'Content archived',
    action: 'archived'
  });

  await this.save();
};

// Method to schedule publishing
cmsContentSchema.methods.schedulePublish = async function(publishDate, userId) {
  this.status = 'scheduled';
  this.scheduledPublishAt = publishDate;
  this.lastModifiedBy = userId;
  
  this.modificationHistory.push({
    modifiedBy: userId,
    modifiedAt: new Date(),
    changes: `Scheduled for publication on ${publishDate.toISOString()}`,
    action: 'updated'
  });

  await this.save();
};

// Method to restore previous version
cmsContentSchema.methods.restoreVersion = async function(versionNumber, userId) {
  const version = this.previousVersions.find(v => v.versionNumber === versionNumber);
  
  if (!version) {
    throw new Error('Version not found');
  }

  // Save current as a version before restoring
  this.previousVersions.push({
    versionNumber: this.version,
    content: this.content,
    status: this.status,
    savedAt: new Date(),
    savedBy: userId,
    comment: `Before restore to version ${versionNumber}`
  });

  // Restore the old version
  this.content = version.content;
  this.version += 1;
  this.lastModifiedBy = userId;

  this.modificationHistory.push({
    modifiedBy: userId,
    modifiedAt: new Date(),
    changes: `Restored to version ${versionNumber}`,
    action: 'restored'
  });

  await this.save();
};

// Method to add comment
cmsContentSchema.methods.addComment = async function(userId, comment) {
  this.comments.push({
    userId,
    comment,
    createdAt: new Date()
  });

  await this.save();
};

// Method to resolve comment
cmsContentSchema.methods.resolveComment = async function(commentId) {
  const comment = this.comments.id(commentId);
  if (comment) {
    comment.resolved = true;
    await this.save();
  }
};

// Method to increment view count
cmsContentSchema.methods.incrementViews = async function(isUnique = false) {
  this.viewCount += 1;
  this.lastViewedAt = new Date();
  
  if (isUnique) {
    this.uniqueViewers += 1;
  }

  await this.save();
};

// Static method to get published content for public API
cmsContentSchema.statics.getPublicContent = async function(pageId) {
  const content = await this.findOne({
    pageId,
    status: 'published',
    isPublic: true
  }).select('-previousVersions -modificationHistory -comments');

  return content;
};

// Static method to get all published pages
cmsContentSchema.statics.getAllPublishedPages = async function() {
  return await this.find({
    status: 'published',
    isPublic: true
  })
    .select('pageId pageName pageType publishedAt content.seo')
    .sort({ publishedAt: -1 });
};

// Static method to process scheduled publications
cmsContentSchema.statics.publishScheduledContent = async function() {
  const now = new Date();
  
  const scheduled = await this.find({
    status: 'scheduled',
    scheduledPublishAt: { $lte: now }
  });

  const results = [];
  
  for (const content of scheduled) {
    content.status = 'published';
    content.publishedAt = now;
    
    content.modificationHistory.push({
      modifiedAt: now,
      changes: 'Auto-published from schedule',
      action: 'published'
    });

    await content.save();
    results.push(content.pageId);
  }

  return results;
};

// Method to export as JSON for frontend
cmsContentSchema.methods.toPublicJSON = function() {
  return {
    pageId: this.pageId,
    pageName: this.pageName,
    pageType: this.pageType,
    slug: this.slug,
    content: this.content,
    seo: this.content.seo,
    publishedAt: this.publishedAt
  };
};

// Method to export with version info
cmsContentSchema.methods.toEditorJSON = function() {
  return {
    pageId: this.pageId,
    pageName: this.pageName,
    pageType: this.pageType,
    content: this.content,
    status: this.status,
    version: this.version,
    versionCount: this.versionCount,
    publishedAt: this.publishedAt,
    scheduledPublishAt: this.scheduledPublishAt,
    createdBy: this.createdBy,
    lastModifiedBy: this.lastModifiedBy,
    viewCount: this.viewCount,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Static method to search content
cmsContentSchema.statics.searchContent = async function(query, options = {}) {
  const {
    status = 'published',
    pageType,
    limit = 10,
    skip = 0
  } = options;

  const searchCriteria = {
    $or: [
      { pageName: { $regex: query, $options: 'i' } },
      { 'content.hero.title': { $regex: query, $options: 'i' } },
      { 'content.seo.metaDescription': { $regex: query, $options: 'i' } },
      { 'content.seo.metaKeywords': { $in: [new RegExp(query, 'i')] } }
    ]
  };

  if (status) {
    searchCriteria.status = status;
  }

  if (pageType) {
    searchCriteria.pageType = pageType;
  }

  return await this.find(searchCriteria)
    .limit(limit)
    .skip(skip)
    .select('pageId pageName pageType content.seo publishedAt')
    .sort({ publishedAt: -1 });
};

const CMSContent = mongoose.model('CMSContent', cmsContentSchema);

module.exports = CMSContent;
