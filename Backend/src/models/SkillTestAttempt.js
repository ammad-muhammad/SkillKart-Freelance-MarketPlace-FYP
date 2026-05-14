const mongoose = require('mongoose');

const skillTestAttemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skillsTested: [String],
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
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  completedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('SkillTestAttempt', skillTestAttemptSchema);
