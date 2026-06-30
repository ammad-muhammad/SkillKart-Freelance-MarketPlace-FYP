const mongoose = require('mongoose');

/**
 * SkillRelationship — a directed, typed, weighted edge in the Skill Graph.
 *
 * Relationship semantics (from → type → to):
 *
 *   React      BELONGS_TO     Web Development
 *   React      BELONGS_TO     Frontend Development
 *   React      DEPENDS_ON     JavaScript
 *   React      RELATED_TO     Vue.js
 *   Next.js    PREDECESSOR    React              (Next.js builds on React)
 *   HTML       PREREQUISITE   CSS                (learn HTML before CSS)
 *   Photoshop  PART_OF        Adobe Creative Cloud
 *   Figma      USED_IN        UI Design
 *   JavaScript ALIAS_OF       ECMAScript         (canonical → alias)
 *
 * The graph is directed: from→to.  To represent a bidirectional relation,
 * insert two edges with complementary types (e.g. PARENT + CHILD).
 */
const skillRelationshipSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SkillNode',
      required: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SkillNode',
      required: true,
    },
    /**
     * Relationship type — keep this open for extension:
     * adding a new type needs only a new enum value here (and a re-seed).
     */
    type: {
      type: String,
      enum: [
        'BELONGS_TO',      // skill belongs to a category/industry
        'PARENT',          // hierarchical parent
        'CHILD',           // hierarchical child
        'RELATED_TO',      // peer-level relatedness
        'USES',            // skill/profession uses a tool/technology
        'DEPENDS_ON',      // depends on another skill to function
        'PREREQUISITE',    // must learn before this skill
        'PART_OF',         // is a sub-component of
        'SPECIALIZES_IN',  // a specialisation of
        'ALIAS_OF',        // name alias (handled at node level too)
        'CERTIFIED_BY',    // a cert validates this skill
        'SIMILAR_TO',      // fuzzy similarity (not identical)
        'SUCCESSOR',       // next evolution
        'PREDECESSOR',     // prior evolution / foundation
        'USED_IN',         // a tool/technology used inside a category
      ],
      required: true,
    },
    /**
     * Edge weight 0–1.
     * Used by the graph matcher to produce partial scores.
     *   1.0 = definitive relationship (React DEPENDS_ON JavaScript)
     *   0.7 = strong relationship     (Photoshop RELATED_TO Graphic Design)
     *   0.4 = loose association       (Marketing SIMILAR_TO Branding)
     */
    weight: { type: Number, default: 1.0, min: 0, max: 1 },

    metadata: {
      note: { type: String, default: '' },
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

/* ── Indexes ──────────────────────────────────────────────────────────── */
skillRelationshipSchema.index({ from: 1, type: 1 });
skillRelationshipSchema.index({ to: 1, type: 1 });
// Prevent duplicate edges of the same type between the same pair
skillRelationshipSchema.index({ from: 1, to: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('SkillRelationship', skillRelationshipSchema);
