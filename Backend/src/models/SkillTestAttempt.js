const mongoose = require('mongoose');

const skillTestAttemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skillsTested: [String],
  // The level the freelancer picked before the test (sets the question count —
  // easy 5 / intermediate 10 / expert 15 — and how hard the questions are).
  // Attempts from before the picker existed have no value.
  level: { type: String, enum: ['easy', 'intermediate', 'expert'] },
  questions: [{
    question: String,
    skill: String,
    category: String,
    type: { type: String }, // 'mcq' or 'text'
    options: [String],
    correctAnswer: String, // Store the correct answer for MCQs
    userAnswer: String,
    aiEvaluation: String,
    score: Number // 0 to 1
  }],

  totalScore: { type: Number },
  passed: { type: Boolean },
  // 'evaluating' is a transient claim state — see skillTest.controller.js's
  // submitTest, which atomically flips pending -> evaluating before the (slow,
  // costs real AI quota) evaluation call so a concurrent duplicate submit
  // (timer auto-submit racing a manual click) can't double-evaluate.
  status: { type: String, enum: ['pending', 'evaluating', 'completed', 'failed'], default: 'pending' },
  completedAt: { type: Date, default: Date.now },

  // Proctoring audit trail — browser-integrity (tab/window/fullscreen) and
  // camera/face (no-face, multiple-faces, looking-away) violations logged
  // client-side during the attempt. Recorded for review only; does not
  // affect scoring (a serious violation aborts the attempt client-side
  // before it ever reaches submission).
  violations: [{
    // 'looking_away' = older attempts (before head/eyes/body were split up).
    type: { type: String, enum: ['tab_switch', 'window_blur', 'fullscreen_exit', 'no_face', 'multiple_faces', 'head_turn', 'eyes_away', 'body_movement', 'looking_away', 'other'] },
    source: { type: String, enum: ['browser', 'camera'] },
    reason: String,
    at: Date
  }],

  // How strict proctoring was for this attempt (SKILL_TEST_PROCTOR_STRICTNESS
  // at submit time) plus the live movement counters the candidate saw.
  proctoring: {
    strictness: Number,
    movements: {
      face_missing: Number,
      extra_face: Number,
      head_turn: Number,
      eyes_away: Number,
      body_movement: Number
    },
    cameraStrikes: Number,
    browserStrikes: Number
  }
}, { timestamps: true });

module.exports = mongoose.model('SkillTestAttempt', skillTestAttemptSchema);
