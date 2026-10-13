const mongoose = require('mongoose');

/**
 * SkillNode — a vertex in the Universal Skill Graph.
 *
 * A node can represent any concept on the platform: an individual skill
 * (React), a tool (Figma), a category (UI Design), an industry
 * (Software & Technology), a profession (Frontend Developer), or a
 * technology concept (REST APIs).  Every feature that references skills,
 * categories, or professions should ultimately resolve to a SkillNode.
 */
const skillNodeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    /**
     * node type — drives UI rendering and graph traversal defaults.
     *   industry    : top-level group  (Software & Technology)
     *   category    : second-level     (Web Development)
     *   profession  : role name        (Frontend Developer)
     *   skill       : individual skill (React)
     *   technology  : language/framework (JavaScript)
     *   tool        : software app    (Figma, Adobe Photoshop)
     *   concept     : abstract idea   (REST, Agile)
     */
    type: {
      type: String,
      enum: ['industry', 'category', 'profession', 'skill', 'technology', 'tool', 'concept'],
      default: 'skill',
    },
    description: { type: String, default: '' },

    /** Alternate names that resolve to this node (e.g. "JS", "ECMAScript" → JavaScript). */
    aliases: [{ type: String, trim: true }],

    /** Synonymous phrases treated as identical (e.g. "Video Editing", "Video Post Production"). */
    synonyms: [{ type: String, trim: true }],

    /** Search/match weight 0–1.  Higher = more relevant in rankings. */
    weight: { type: Number, default: 1.0, min: 0, max: 1 },

    /** Display hints */
    icon:  { type: String, default: '' },
    color: { type: String, default: '' },

    status: {
      type: String,
      enum: ['active', 'deprecated', 'merged'],
      default: 'active',
    },
    /** If status === 'merged', all lookups redirect to this node. */
    mergedInto: { type: mongoose.Schema.Types.ObjectId, ref: 'SkillNode', default: null },

    /* ── Hierarchical Display Metadata ── */
    canonicalParent: { type: mongoose.Schema.Types.ObjectId, ref: 'SkillNode', default: null },
    displayPriority: { type: Number, default: 0 },
    navigationWeight: { type: Number, default: 1.0 },
    menuOrder: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    hiddenInMenu: { type: Boolean, default: false },

    /* ── Popularity Metrics ── */
    searchVolume: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

/* ── Indexes ──────────────────────────────────────────────────────────── */
skillNodeSchema.index({ type: 1 });
skillNodeSchema.index({ canonicalParent: 1 });
skillNodeSchema.index({ status: 1 });
skillNodeSchema.index({ aliases: 1 });
skillNodeSchema.index({ synonyms: 1 });

/* ── Static helpers ───────────────────────────────────────────────────── */

/** Resolve a name, alias, or synonym string to its canonical SkillNode. */
skillNodeSchema.statics.resolveByName = async function (term) {
  if (!term) return null;
  const t = String(term).trim();
  return this.findOne({
    status: { $in: ['active', 'merged'] },
    $or: [
      { name: { $regex: `^${t}$`, $options: 'i' } },
      { aliases: { $regex: `^${t}$`, $options: 'i' } },
      { synonyms: { $regex: `^${t}$`, $options: 'i' } },
      { slug: t.toLowerCase() },
    ],
  });
};

module.exports = mongoose.model('SkillNode', skillNodeSchema);
