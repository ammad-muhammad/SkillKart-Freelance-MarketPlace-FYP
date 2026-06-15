import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronRight, CheckCircle2, AlertCircle, Award, ShieldAlert, Eye, Maximize2, Ban } from 'lucide-react';
import { toast } from 'react-toastify';
import { skillTestAPI } from '../../api/skillTest';
import { useFreelancer } from '../../context/FreelancerContext';
import useAntiCheat from './useAntiCheat';
import './SkillTest.css';

// Test flow phases:
//   'rules'   — proctoring rules shown; freelancer must accept to begin
//   'testing' — locked-down full-screen test (no menus, anti-cheat armed)
//   'aborted' — cheating detected; offer to restart from 0 with fresh questions
const SkillTest = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const specificSkill = searchParams.get('skill');
  const { refreshProfile } = useFreelancer();

  const [phase, setPhase] = useState('rules');
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [skills, setSkills] = useState([]);
  const [warning, setWarning] = useState(null);   // 1st-violation warning text
  const [abortReason, setAbortReason] = useState('');
  const [attemptId, setAttemptId] = useState(0);  // bumped each (re)start → resets strikes

  // Anti-cheat is armed only while actually taking the test.
  const { requestFullscreen, exitFullscreen } = useAntiCheat({
    active: phase === 'testing' && !result,
    attemptId,
    onWarn: (reason) => {
      setWarning(reason);
      toast.warn('⚠ Final warning: leaving the test again will cancel it.');
    },
    onAbort: (reason) => {
      setAbortReason(reason);
      setPhase('aborted');
      exitFullscreen();
      // Discard the in-progress attempt entirely.
      setQuestions([]);
      setAnswers({});
      setCurrentIndex(0);
    },
  });

  const fetchTest = async (skill = null, force = false) => {
    try {
      setLoading(true);
      const res = await skillTestAPI.generateTest(skill, force);
      const testData = res.data.data;
      const qList = testData?.questions || [];
      const sList = testData?.skills || [];

      setQuestions(qList);
      setSkills(sList);
      setCurrentIndex(0);
      setAnswers({});
      return qList.length > 0;
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to load skill test. Please check your connection.';
      toast.error(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Begin (or restart) the test: pull FRESH questions, enter fullscreen, arm guard.
  const startTest = async () => {
    setWarning(null);
    setAbortReason('');
    setResult(null);
    // force=true so a restart never reuses the previous question set.
    const ok = await fetchTest(specificSkill, true);
    if (!ok) {
      toast.error('Could not generate a test right now. Please try again.');
      return;
    }
    const fs = await requestFullscreen();
    if (!fs) {
      // Fullscreen was blocked — the test still runs locked-down (overlay) and
      // the tab-switch / blur guards stay active, but tell the user so the
      // "full-screen" promise on the rules screen isn't silently broken.
      toast.info('Full-screen could not be enabled, but the test is still proctored. Avoid switching tabs or windows.');
    }
    // New attempt → reset strike counter (via attemptId) before arming.
    setAttemptId((n) => n + 1);
    setPhase('testing');
  };

  const handleAnswerChange = (val) => {
    setAnswers(prev => ({ ...prev, [currentIndex]: val }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleSubmit = async () => {
    const answeredCount = Object.keys(answers).filter(k => answers[k]?.trim()).length;
    if (answeredCount < questions.length) {
      toast.warn(`Please answer all ${questions.length} questions. You've answered ${answeredCount}.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await skillTestAPI.submitTest(answers);
      setResult(res.data.data);
      exitFullscreen();
      await refreshProfile();
      toast.success('Test evaluated successfully!');
    } catch (error) {
      const msg = error.response?.data?.message || 'Submission failed. Please try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Make sure we never leave the browser stuck in fullscreen on unmount.
  useEffect(() => () => exitFullscreen(), [exitFullscreen]);

  const testTitle = specificSkill ? `${specificSkill} Verification` : 'Skill Verification Test';

  /* ───────────────── RESULT SCREEN ───────────────── */
  if (result) {
    return (
      <div className="st-result-container">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="st-result-card">
          {result.passed ? (
            <div className="st-result-success">
              <Award size={80} className="st-success-icon" />
              <h1>Verified Expert!</h1>
              <div className="st-score-ring">
                <span className="st-score-val">{result.score.toFixed(0)}%</span>
                <span className="st-score-label">Technical Score</span>
              </div>
              <p className="st-result-desc">
                Impressive! You've been ranked as a <strong>Verified Expert</strong> in these skills.
                Your profile will now rank higher in client searches.
              </p>
              <div className="st-skill-badges">
                {skills.map(s => <span key={s} className="st-badge expert">Verified {s}</span>)}
              </div>
              <button onClick={() => navigate('/freelancer/dashboard')} className="st-btn-finish">
                Claim My Expert Profile
              </button>
            </div>
          ) : (
            <div className="st-result-failed">
              <CheckCircle2 size={80} style={{ color: result.level === 'Intermediate' ? '#f59e0b' : '#64748b' }} />
              <h1>Skill Ranking: {result.level}</h1>
              <div className="st-score-ring" style={{ borderColor: result.level === 'Intermediate' ? '#f59e0b' : '#94a3b8' }}>
                <span className="st-score-val">{result.score.toFixed(0)}%</span>
                <span className="st-score-label">Score</span>
              </div>
              <p className="st-result-desc">
                You've been ranked as <strong>{result.level}</strong>.
                {result.level === 'Intermediate'
                  ? " You're very close! Reach 80% to earn the Expert badge."
                  : " Take some time to improve your skills and retake the test for a better ranking."}
              </p>
              <button onClick={() => { setResult(null); setPhase('rules'); }} className="st-btn-retry">
                Retake to Improve Ranking
              </button>
              <button onClick={() => navigate('/freelancer/dashboard')} className="st-btn-later">
                Continue to Dashboard
              </button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  /* ───────────────── ABORTED (CHEATING DETECTED) ───────────────── */
  if (phase === 'aborted') {
    return (
      <div className="st-result-container">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="st-result-card">
          <div className="st-result-failed">
            <Ban size={80} style={{ color: '#ef4444' }} />
            <h1>Cheating Detected</h1>
            <p className="st-result-desc">
              {abortReason || 'Suspicious activity was detected during the test.'} As a result, this attempt
              has been <strong>cancelled</strong>. To keep verification fair, you'll start over from question 1
              with a brand-new set of questions.
            </p>
            <button onClick={startTest} disabled={loading} className="st-btn-retry">
              {loading ? 'Generating new test…' : 'Restart Test from Scratch'}
            </button>
            <button onClick={() => navigate('/freelancer/dashboard')} className="st-btn-later">
              Back to Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ───────────────── RULES / CONSENT SCREEN ───────────────── */
  if (phase === 'rules') {
    return (
      <div className="st-page">
        <div className="st-rules-wrap">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="st-rules-card">
            <div className="st-rules-head">
              <ShieldAlert size={42} className="st-rules-icon" />
              <div>
                <h1>{testTitle}</h1>
                <p>Read the proctoring rules carefully before you begin.</p>
              </div>
            </div>

            <ul className="st-rules-list">
              <li><Maximize2 size={18} /><span>The test runs in <strong>full-screen</strong>. Other menus are hidden — only the test is shown.</span></li>
              <li><Eye size={18} /><span><strong>Do not switch tabs, minimize, or leave the window.</strong> The first time you do, you get one warning.</span></li>
              <li><Ban size={18} /><span>A <strong>second</strong> violation (or exiting full-screen) <strong>cancels the test</strong> for cheating — you restart from question 1 with new questions.</span></li>
              <li><AlertCircle size={18} /><span>Copy, paste, right-click and dev-tools shortcuts are disabled. AI also detects paraphrased / AI-generated answers.</span></li>
              <li><CheckCircle2 size={18} /><span>Answer <strong>every</strong> question. You need <strong>80%</strong> to be verified as an Expert for the skill.</span></li>
            </ul>

            <div className="st-rules-actions">
              <button onClick={startTest} disabled={loading} className="st-btn-submit">
                {loading ? 'Preparing your test…' : 'I Understand — Start Test'}
              </button>
              <button onClick={() => navigate('/freelancer/dashboard')} className="st-btn-later">
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  /* ───────────────── LOADING (between rules and testing) ───────────────── */
  if (loading || (phase === 'testing' && questions.length === 0)) {
    return createPortal(
      <div className="st-loading st-lockdown">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}>
          <Brain size={48} className="st-loading-icon" />
        </motion.div>
        <h3>AI is preparing your unique verification set...</h3>
        <p>This ensures randomization and prevents gaming.</p>
      </div>,
      document.body
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  /* ───────────────── LOCKED-DOWN TEST ─────────────────
     Portaled to <body> so the fixed full-viewport overlay can never be clipped
     by a transform/filter on the layout (which would re-expose the sidebar). */
  return createPortal(
    <div className="st-page st-lockdown">
      {/* Warning banner after the first violation */}
      {warning && (
        <div className="st-cheat-banner">
          <ShieldAlert size={18} />
          <span><strong>Warning:</strong> {warning} Leaving again will cancel the test.</span>
        </div>
      )}

      <div className="st-header">
        <div className="st-header-left">
          <Brain className="st-logo-icon" />
          <div>
            <h1>{testTitle}</h1>
            <p>{specificSkill ? `Focusing on ${specificSkill} expertise` : `Prove your expertise: ${skills.join(', ')}`}</p>
          </div>
        </div>
        <div className="st-header-right">
          <div className="st-timer st-proctor">
            <Eye size={18} />
            <span>Proctoring Active</span>
          </div>
        </div>
      </div>

      <div className="st-progress-container">
        <div className="st-progress-bar" style={{ width: `${progress}%` }} />
        <span className="st-progress-text">Question {currentIndex + 1} of {questions.length}</span>
      </div>

      <div className="st-content">
        <AnimatePresence mode="wait">
          <motion.div key={currentIndex} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="st-question-card">
            <div className="st-q-meta">
              <span className="st-q-skill">{currentQuestion.skill}</span>
              <span className="st-q-cat">{currentQuestion.category}</span>
            </div>
            <h2 className="st-q-text">{currentQuestion.question}</h2>

            <div className="st-input-wrap">
              {currentQuestion.type === 'mcq' && currentQuestion.options ? (
                <div className="st-mcq-options">
                  {currentQuestion.options.map((opt, idx) => (
                    <label key={idx} className={`st-mcq-option ${answers[currentIndex] === opt ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name={`question-${currentIndex}`}
                        value={opt}
                        checked={answers[currentIndex] === opt}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <>
                  <textarea
                    placeholder="Type your technical response..."
                    value={answers[currentIndex] || ''}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    onPaste={(e) => e.preventDefault()}
                    rows={6}
                  />
                  <p className="st-hint">Don't copy-paste. AI detects paraphrasing and AI-generated content.</p>
                </>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="st-footer">
          <button onClick={handlePrev} disabled={currentIndex === 0} className="st-btn-prev">
            Previous
          </button>

          <div className="st-nav-info">
            {Object.keys(answers).filter(k => answers[k]?.trim()).length} / {questions.length} Answered
          </div>

          {currentIndex === questions.length - 1 ? (
            <button onClick={handleSubmit} disabled={submitting} className="st-btn-submit">
              {submitting ? 'AI Ranking Profile...' : 'Complete Verification'}
            </button>
          ) : (
            <button onClick={handleNext} className="st-btn-next">
              Next Question <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SkillTest;
