import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Award,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Maximize2,
  Ban,
  Camera,
  CameraOff,
  Clock,
  Check,
  X,
  Sparkles,
  MonitorX,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { safeToast as toast } from '../../utils/safeToast';
import { skillTestAPI } from '../../api/skillTest';
import { useFreelancer } from '../../context/FreelancerContext';
import useAntiCheat from './useAntiCheat';
import useProctoring from './useProctoring';
import Loader from '../../Components/common/Loader/Loader';
import { deriveProctoringSettings, normalizeStrictness } from './proctoring/strictness';
import './SkillTest.css';

// useAntiCheat always uses one of these exact reason strings per violation
// type — map them back to a type for the violation log sent to the backend.
const BROWSER_VIOLATION_TYPE = {
  'You switched away from the test tab.': 'tab_switch',
  'The test window lost focus.': 'window_blur',
  'You exited full-screen mode.': 'fullscreen_exit',
  'You switched away from the test window.': 'window_blur',
};

const ordinal = (n) => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' })[n % 10] || 'th'}`;
};

const seconds = (ms) => {
  const v = Math.round(ms / 100) / 10;
  return `${Number.isInteger(v) ? v : v.toFixed(1)}s`;
};

const PER_QUESTION_SECONDS = 20;
const TEXT_QUESTION_SECONDS = 30;

const TEST_LEVELS = [
  { key: 'easy', label: 'Easy', count: 5, blurb: 'Core basics — a quick check' },
  { key: 'intermediate', label: 'Intermediate', count: 10, blurb: 'Practical working knowledge' },
  { key: 'expert', label: 'Expert', count: 15, blurb: 'In-depth, advanced questions' },
];

const estimateTotalSeconds = (count) => {
  const mcqCount = Math.ceil(count * 0.8);
  const textCount = count - mcqCount;
  return mcqCount * PER_QUESTION_SECONDS + textCount * TEXT_QUESTION_SECONDS;
};

const formatDuration = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (!minutes) return `${secs} sec`;
  if (!secs) return `${minutes} min`;
  return `${minutes} min ${secs} sec`;
};

const mapAbortReason = (reason) => {
  if (!reason) return 'Proctoring violation';
  const r = reason.toLowerCase();
  if (r.includes('tab') || r.includes('switched away')) return 'Tab switched';
  if (r.includes('focus') || r.includes('blur')) return 'Window focus lost';
  if (r.includes('full-screen') || r.includes('fullscreen')) return 'Left full-screen';
  if (r.includes('face') || r.includes('camera')) return 'Face not detected';
  return 'Proctoring violation';
};

const SkillTest = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const specificSkill = searchParams.get('skill');
  const returnTo = searchParams.get('returnTo');
  const { refreshProfile } = useFreelancer();

  const [phase, setPhase] = useState('rules');
  const [level, setLevel] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedOptionIndex, setSelectedOptionIndex] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [skills, setSkills] = useState([]);
  const [easyMode, setEasyMode] = useState(false);
  const [warning, setWarning] = useState(null);
  const [abortReason, setAbortReason] = useState('');
  const [attemptId, setAttemptId] = useState(0);
  const [timeLeft, setTimeLeft] = useState(PER_QUESTION_SECONDS);
  const [strictness, setStrictness] = useState(null);
  const [browserStrikes, setBrowserStrikes] = useState(0);
  const [showRulesModal, setShowRulesModal] = useState(false);

  const proctorSettings = useMemo(() => deriveProctoringSettings(strictness ?? 0.5), [strictness]);
  const configLoaded = strictness !== null;

  const rulesVideoRef = useRef(null);
  const testVideoRef = useRef(null);
  const violationLog = useRef([]);

  // Lock body scroll on mount and restore on unmount
  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = origOverflow;
    };
  }, []);

  const logViolation = (source, type, reason) => {
    violationLog.current.push({ source, type, reason, at: Date.now() });
  };

  useEffect(() => {
    let cancelled = false;
    skillTestAPI.getProctoringConfig()
      .then((res) => { if (!cancelled) setStrictness(normalizeStrictness(res.data?.data?.strictness)); })
      .catch(() => { if (!cancelled) setStrictness(0.5); });
    return () => { cancelled = true; };
  }, []);

  const abortAttempt = (reason) => {
    setAbortReason(reason);
    setPhase('aborted');
    exitFullscreen();
    stopCamera();
    setQuestions([]);
    setAnswers({});
    setSelectedOptionIndex({});
    setCurrentIndex(0);
  };

  const { requestFullscreen, exitFullscreen } = useAntiCheat({
    active: phase === 'testing' && !result,
    attemptId,
    maxStrikes: proctorSettings.browserStrikes,
    onStrike: (count, max, reason) => {
      logViolation('browser', BROWSER_VIOLATION_TYPE[reason] || 'other', reason);
      setBrowserStrikes(count);
      if (count < max - 1) setWarning(`Strike ${count} of ${max} — ${reason} Please stay on this window.`);
    },
    onWarn: (reason) => {
      setWarning(`Final warning — ${reason} Leaving the test window once more will immediately cancel it.`);
    },
    onAbort: (reason) => abortAttempt(reason),
  });

  const proctor = useProctoring({
    settings: proctorSettings,
    mode: !configLoaded ? 'off' : phase === 'testing' && !result ? 'active' : phase === 'rules' ? 'preview' : 'off',
    attemptId,
    videoRef: phase === 'testing' ? testVideoRef : rulesVideoRef,
    onAbort: (message) => abortAttempt(message),
  });

  const { cameraError, startCamera, stopCamera } = proctor;
  const proctoringOn = proctorSettings.enabled && !proctor.noCamera;
  const cameraReady = !proctoringOn || (
    proctor.engineStatus === 'ready' && proctor.cameraOn && proctor.detecting && !proctor.cameraError && !proctor.engineError
  );
  const cameraProblem = proctoringOn ? (proctor.engineError || proctor.cameraError) : null;

  const retryCameraCheck = async () => {
    if (await proctor.retry()) stopCamera();
  };

  useEffect(() => {
    if (!configLoaded || !proctorSettings.enabled) return;
    if (phase === 'rules' || phase === 'testing') startCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, configLoaded, proctorSettings.enabled]);

  const fetchTest = async (skill = null, force = false, testLevel = null) => {
    try {
      setLoading(true);
      const res = await skillTestAPI.generateTest(skill, force, testLevel);
      const testData = res.data.data;
      const qList = testData?.questions || [];
      const sList = testData?.skills || [];

      setQuestions(qList);
      setSkills(sList);
      setEasyMode(Boolean(testData?.easyMode));
      setCurrentIndex(0);
      setAnswers({});
      setSelectedOptionIndex({});
      return qList.length > 0;
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to load skill test. Please check your connection.';
      toast.error(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const startTest = async () => {
    if (!level) return;
    setWarning(null);
    setAbortReason('');
    setResult(null);
    setBrowserStrikes(0);
    violationLog.current = [];

    const fs = await requestFullscreen();
    if (!fs) {
      toast.info('Full-screen could not be enabled, but the test is still proctored. Avoid switching tabs or windows.');
    }

    const ok = await fetchTest(specificSkill, true, level);
    if (!ok) {
      toast.error('Could not generate a test right now. Please try again.');
      return;
    }
    stopCamera();
    setAttemptId((n) => n + 1);
    setPhase('testing');
  };

  const handleAnswerChange = (val, idx = null) => {
    setAnswers(prev => ({ ...prev, [currentIndex]: val }));
    if (idx !== null) setSelectedOptionIndex(prev => ({ ...prev, [currentIndex]: idx }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const submittingRef = useRef(false);

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await skillTestAPI.submitTest(answers, violationLog.current, { browserStrikes });
      setResult(res.data.data);
      exitFullscreen();
      stopCamera();
      await refreshProfile();
      toast.success('Test evaluated successfully!');
    } catch (error) {
      const msg = error.response?.data?.message || 'Submission failed. Please try again.';
      toast.error(msg);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleSubmitRef = useRef(() => {});
  useEffect(() => { handleSubmitRef.current = handleSubmit; });

  // Per-question countdown
  useEffect(() => {
    if (phase !== 'testing' || !questions.length || result || submitting) return undefined;

    const duration = questions[currentIndex]?.type === 'text' ? TEXT_QUESTION_SECONDS : PER_QUESTION_SECONDS;
    setTimeLeft(duration);
    let fired = false;

    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (!fired) {
            fired = true;
            clearInterval(interval);
            if (currentIndex < questions.length - 1) {
              setCurrentIndex((i) => i + 1);
            } else {
              handleSubmitRef.current();
            }
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentIndex, phase, attemptId, questions, result, submitting]);

  // Keyboard navigation for MCQ: 1-4 and A-D
  useEffect(() => {
    if (phase !== 'testing' || !questions.length) return;
    const q = questions[currentIndex];
    if (q?.type !== 'mcq' || !q.options) return;

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      const key = e.key.toUpperCase();
      let idx = -1;
      if (key === '1' || key === 'A') idx = 0;
      else if (key === '2' || key === 'B') idx = 1;
      else if (key === '3' || key === 'C') idx = 2;
      else if (key === '4' || key === 'D') idx = 3;
      else if (key === '5' || key === 'E') idx = 4;
      else if (key === '6' || key === 'F') idx = 5;

      if (idx >= 0 && idx < q.options.length) {
        handleAnswerChange(q.options[idx], idx);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, currentIndex, questions]);

  useEffect(() => () => exitFullscreen(), [exitFullscreen]);

  const testTitle = specificSkill ? `${specificSkill} Verification` : 'Skill Verification Test';

  /* ───────────────── SCREEN 4: RESULT SCREEN ───────────────── */
  if (result) {
    const takenLevel = TEST_LEVELS.find((l) => l.key === (result.testLevel || level));
    const takenLabel = takenLevel?.label;
    const verifiedSkills = skills.filter((s) => result.skillScores?.[s]?.isVerified ?? true);

    return createPortal(
      <div className="st-center-viewport">
        <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="st-center-card">
          {result.verified ? (
            <>
              <div className="st-result-score-ring">
                <span className="st-result-score-val">{result.score.toFixed(0)}%</span>
                <span className="st-result-score-label">Technical Score</span>
              </div>
              <h1 className="st-center-h1">{takenLabel ? `${takenLabel} Level Verified!` : 'Skills Verified!'}</h1>
              <div className="st-verified-badges-wrap">
                {verifiedSkills.map((s) => (
                  <span key={s} className="st-verified-badge">
                    ✓ Verified {s} · {result.level}
                  </span>
                ))}
              </div>
              <p className="st-center-p1">
                Your score verifies {verifiedSkills.length === 1 ? 'this skill' : 'these skills'}
                {takenLabel ? <> at the <strong>{takenLabel}</strong> tier</> : null}.
              </p>
              <p className="st-center-p2">
                This verification badge is now active on your public profile and unlocks jobs requiring this expertise.
              </p>
              <div className="st-center-actions">
                <button
                  onClick={() => navigate(returnTo || '/freelancer/dashboard')}
                  className="st-btn-pill-start"
                  style={{ width: 'auto', padding: '0 32px' }}
                >
                  {returnTo ? 'Continue to Proposal' : 'Continue to Dashboard'}
                </button>
                {result.testLevel !== 'expert' && (
                  <button
                    onClick={() => { setResult(null); setPhase('rules'); }}
                    className="st-btn-ghost-link"
                  >
                    Take a Higher Level
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="st-result-score-ring failed">
                <span className="st-result-score-val">{result.score.toFixed(0)}%</span>
                <span className="st-result-score-label">Score</span>
              </div>
              <h1 className="st-center-h1">Not Verified Yet</h1>
              <p className="st-center-p1">
                You scored {result.score.toFixed(0)}%. A score of at least 25% is required to verify {skills.length === 1 ? 'this skill' : 'these skills'}
                {takenLabel ? <> at the <strong>{takenLabel}</strong> level</> : null}.
              </p>
              <p className="st-center-p2">
                You can retake this assessment anytime. Fresh questions will be generated.
              </p>
              <div className="st-center-actions">
                <button
                  onClick={() => { setResult(null); setPhase('rules'); }}
                  className="st-btn-pill-start"
                  style={{ width: 'auto', padding: '0 32px' }}
                >
                  Retake the Test
                </button>
                <button onClick={() => navigate('/freelancer/dashboard')} className="st-btn-ghost-link">
                  Return to Dashboard
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>,
      document.body
    );
  }

  /* ───────────────── SCREEN 3: ABORTED (CANCELLED / CHEATING DETECTED) ───────────────── */
  if (phase === 'aborted') {
    return createPortal(
      <div className="st-center-viewport">
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="st-center-card"
        >
          <div className="st-cancel-icon-circle">
            <ShieldAlert size={36} />
          </div>
          <h1 className="st-center-h1">Test Cancelled</h1>
          <span className="st-reason-badge">{mapAbortReason(abortReason)}</span>
          <p className="st-center-p1">
            {abortReason || 'Suspicious window activity or proctoring rules violation detected.'}
          </p>
          <p className="st-center-p2">
            To ensure assessment fairness, you will restart from question 1 with fresh questions.
          </p>
          {proctorSettings.browserStrikes > 0 && (
            <div className="st-strikes-info-row">
              <MonitorX size={14} />
              <span>Strikes used: <strong>{browserStrikes}</strong> of {proctorSettings.browserStrikes}</span>
            </div>
          )}
          {proctoringOn && cameraError && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ color: 'var(--st-red)', fontSize: 12, fontWeight: 700, margin: '0 0 8px' }}>
                Camera access required before restarting.
              </p>
              <button type="button" onClick={retryCameraCheck} className="st-btn-cam-retry">
                Check Camera Again
              </button>
            </div>
          )}
          <div className="st-center-actions">
            <button
              onClick={startTest}
              disabled={loading || (proctoringOn && !!cameraError)}
              className="st-btn-pill-start"
              style={{ width: 'auto', padding: '0 32px' }}
            >
              {loading ? 'Preparing new test…' : 'Restart Test from Scratch'}
            </button>
            <button onClick={() => navigate('/freelancer/dashboard')} className="st-btn-ghost-link">
              Back to Dashboard
            </button>
          </div>
        </motion.div>
      </div>,
      document.body
    );
  }

  /* ───────────────── SCREEN 1: INTRO (LEVEL + RULES + CAMERA CHECK) ───────────────── */
  if (phase === 'rules') {
    const selectedLevel = TEST_LEVELS.find((l) => l.key === level);

    return createPortal(
      <div className="st-viewport">
        {/* TOP SLIM ROW */}
        <header className="st-top-row">
          <div className="st-brand-group">
            <ShieldCheck className="st-shield-icon" />
            <div className="st-title-area">
              <h1 className="st-title-h1">{testTitle}</h1>
              <p className="st-subtitle-p">Select assessment tier and verify proctoring hardware</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/freelancer/dashboard')}
            className="st-btn-ghost-cancel"
          >
            Cancel
          </button>
        </header>

        {/* MAIN BODY: 2 COLUMNS */}
        <main className="st-intro-body">
          <div className="st-intro-content">
          {/* LEFT COLUMN: LEVEL PICKER & PROCTORING RULES */}
          <div className="st-intro-left">
            {/* Level selection */}
            <div>
              <div className="st-section-head">
                <span className="st-section-title">Choose your level</span>
                {selectedLevel && (
                  <span className="st-estimate-bar">
                    <Clock size={14} />
                    <span>~{formatDuration(estimateTotalSeconds(selectedLevel.count))} ({selectedLevel.count} questions)</span>
                  </span>
                )}
              </div>
              <div className="st-levels-row" role="radiogroup" aria-label="Test level">
                {TEST_LEVELS.map((l) => {
                  const isSelected = level === l.key;
                  return (
                    <button
                      key={l.key}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={loading}
                      onClick={() => setLevel(l.key)}
                      className={`st-level-card-btn${isSelected ? ' selected' : ''}`}
                    >
                      {isSelected && (
                        <span className="st-level-check-dot">
                          <Check size={12} strokeWidth={3} />
                        </span>
                      )}
                      <span className="st-level-card-title">{l.label}</span>
                      <span className="st-level-card-count">{l.count} questions</span>
                      <p className="st-level-card-desc">{l.blurb}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Compact 2x3 proctoring rules tiles */}
            <div className="st-rules-section">
              <div className="st-section-head">
                <span className="st-section-title">Proctoring rules</span>
                <button
                  type="button"
                  onClick={() => setShowRulesModal(true)}
                  className="st-link-btn"
                >
                  Read full rules
                </button>
              </div>

              <div className="st-rules-grid">
                <div className="st-rule-tile" onClick={() => setShowRulesModal(true)} title="Click to view full rule">
                  <div className="st-rule-tile-icon"><Maximize2 size={16} /></div>
                  <div className="st-rule-tile-text">
                    <span className="st-rule-tile-name">Full-screen</span>
                    <span className="st-rule-tile-sub">Locked full-screen window</span>
                  </div>
                </div>

                <div className="st-rule-tile" onClick={() => setShowRulesModal(true)} title="Click to view full rule">
                  <div className="st-rule-tile-icon"><Eye size={16} /></div>
                  <div className="st-rule-tile-text">
                    <span className="st-rule-tile-name">Stay on window</span>
                    <span className="st-rule-tile-sub">{proctorSettings.browserStrikes} strikes cancels test</span>
                  </div>
                </div>

                <div className="st-rule-tile" onClick={() => setShowRulesModal(true)} title="Click to view full rule">
                  <div className="st-rule-tile-icon"><Camera size={16} /></div>
                  <div className="st-rule-tile-text">
                    <span className="st-rule-tile-name">Webcam on</span>
                    <span className="st-rule-tile-sub">Face must remain in view</span>
                  </div>
                </div>

                <div className="st-rule-tile" onClick={() => setShowRulesModal(true)} title="Click to view full rule">
                  <div className="st-rule-tile-icon"><Clock size={16} /></div>
                  <div className="st-rule-tile-text">
                    <span className="st-rule-tile-name">Question timer</span>
                    <span className="st-rule-tile-sub">20s MCQ / 30s written</span>
                  </div>
                </div>

                <div className="st-rule-tile" onClick={() => setShowRulesModal(true)} title="Click to view full rule">
                  <div className="st-rule-tile-icon"><Ban size={16} /></div>
                  <div className="st-rule-tile-text">
                    <span className="st-rule-tile-name">No copy/paste</span>
                    <span className="st-rule-tile-sub">AI plagiarism detection</span>
                  </div>
                </div>

                <div className="st-rule-tile" onClick={() => setShowRulesModal(true)} title="Click to view full rule">
                  <div className="st-rule-tile-icon"><CheckCircle2 size={16} /></div>
                  <div className="st-rule-tile-text">
                    <span className="st-rule-tile-name">Pass score 25%</span>
                    <span className="st-rule-tile-sub">Unlocks verified badge</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: CAMERA PREVIEW CARD & START ACTION */}
          <div className="st-intro-right">
            <div className="st-cam-card">
              <div>
                <span className="st-section-title" style={{ display: 'block', marginBottom: 8 }}>
                  Camera Check
                </span>

                <div className="st-cam-preview-box">
                  {proctoringOn ? (
                    <>
                      <video ref={rulesVideoRef} className="st-cam-video" autoPlay playsInline muted />
                      {cameraProblem ? (
                        <div className="st-cam-overlay-err">
                          <CameraOff size={20} />
                          <span>{cameraProblem}</span>
                          <button type="button" onClick={proctor.retry} className="st-btn-cam-retry">
                            Retry Access
                          </button>
                        </div>
                      ) : (
                        <div className={`st-cam-status-chip ${cameraReady ? 'st-cam-status-chip--ok' : 'st-cam-status-chip--warn'}`}>
                          {cameraReady ? <Check size={13} /> : <Clock size={13} />}
                          <span>{cameraReady ? 'Camera ready · Face detected' : 'Starting camera…'}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="st-cam-overlay-err" style={{ background: 'rgba(4,30,51,0.95)', color: '#FFFFFF' }}>
                      <CameraOff size={22} style={{ color: 'var(--st-gray-400)' }} />
                      <span>Camera proctoring disabled or no camera detected</span>
                    </div>
                  )}
                </div>

                <div className="st-cam-checklist">
                  <div className="st-check-item">
                    {cameraReady || !proctoringOn ? (
                      <Check size={14} className="st-check-icon-ok" />
                    ) : (
                      <Clock size={14} className="st-check-icon-wait" />
                    )}
                    <span>{proctoringOn ? (cameraReady ? 'Webcam active and verified' : 'Connecting webcam…') : 'Camera optional on this device'}</span>
                  </div>
                  <div className="st-check-item">
                    <Check size={14} className="st-check-icon-ok" />
                    <span>Locked full-screen supported</span>
                  </div>
                  <div className="st-check-item">
                    <Check size={14} className="st-check-icon-ok" />
                    <span>Anti-cheat detection armed</span>
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={startTest}
                  disabled={loading || !configLoaded || !level || !cameraReady}
                  className="st-btn-pill-start"
                >
                  {loading
                    ? 'Preparing test…'
                    : !configLoaded
                      ? 'Loading config…'
                      : !level
                        ? 'Choose a level to start'
                        : !cameraReady && !cameraProblem
                          ? 'Checking camera…'
                          : 'Start Verification Test'}
                </button>
              </div>
            </div>
          </div>
          </div>
        </main>

        {/* FULL RULES MODAL */}
        {showRulesModal && (
          <div className="st-modal-backdrop" onClick={() => setShowRulesModal(false)}>
            <div className="st-rules-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="st-rules-modal-head">
                <h3>Assessment & Proctoring Rules</h3>
                <button type="button" onClick={() => setShowRulesModal(false)} className="st-btn-modal-close">
                  <X size={18} />
                </button>
              </div>
              <div className="st-rules-modal-body st-thin-scroll">
                <div className="st-full-rule-item">
                  <Maximize2 size={18} />
                  <div>
                    <strong>Full-screen mode:</strong> The test runs locked in full-screen. Navigation menus and browser chrome are hidden to maintain test integrity.
                  </div>
                </div>
                <div className="st-full-rule-item">
                  <Eye size={18} />
                  <div>
                    <strong>Stay on the window:</strong> Switching tabs, minimizing, or exiting full-screen counts as a strike. Reaching <strong>{proctorSettings.browserStrikes} strikes cancels the test</strong> immediately.
                  </div>
                </div>
                <div className="st-full-rule-item">
                  <Camera size={18} />
                  <div>
                    <strong>Continuous face presence:</strong> Your webcam must stay active. If no face is detected for {seconds(proctorSettings.holdMs)}, the test is cancelled. Moving around normally is permitted.
                  </div>
                </div>
                <div className="st-full-rule-item">
                  <Clock size={18} />
                  <div>
                    <strong>Per-question countdown:</strong> You have {PER_QUESTION_SECONDS}s for MCQs and {TEXT_QUESTION_SECONDS}s for written questions. Once elapsed, it automatically advances and you cannot return.
                  </div>
                </div>
                <div className="st-full-rule-item">
                  <Ban size={18} />
                  <div>
                    <strong>Originality & shortcuts:</strong> Copying, pasting, and developer tool shortcuts are disabled. Submissions are screened for AI and plagiarized text.
                  </div>
                </div>
                <div className="st-full-rule-item">
                  <CheckCircle2 size={18} />
                  <div>
                    <strong>25% passing score:</strong> Score 25% or higher to earn the verified badge for {specificSkill || 'your skill'} at your chosen level.
                  </div>
                </div>
              </div>
              <div className="st-rules-modal-footer">
                <button type="button" onClick={() => setShowRulesModal(false)} className="st-btn-pill-next">
                  I Understand
                </button>
              </div>
            </div>
          </div>
        )}
      </div>,
      document.body
    );
  }

  /* ───────────────── LOADING (BETWEEN RULES AND TEST) ───────────────── */
  if (loading || (phase === 'testing' && questions.length === 0)) {
    return <Loader fullScreen text="Verifying" />;
  }

  const currentQuestion = questions[currentIndex] || {};
  const correctOptIndex = (currentQuestion?.options && currentQuestion?.correctAnswer)
    ? currentQuestion.options.findIndex(
        opt => String(opt).trim().toLowerCase() === String(currentQuestion.correctAnswer).trim().toLowerCase()
      )
    : -1;
  const correctOptLetter = correctOptIndex >= 0 ? String.fromCharCode(65 + correctOptIndex) : '';
  const correctOptNumber = correctOptIndex >= 0 ? correctOptIndex + 1 : null;

  const hasAnswer = currentQuestion.type === 'mcq'
    ? selectedOptionIndex[currentIndex] !== undefined
    : Boolean((answers[currentIndex] || '').trim());

  const totalDuration = currentQuestion.type === 'text' ? TEXT_QUESTION_SECONDS : PER_QUESTION_SECONDS;
  const timerRadius = 16;
  const timerCircumference = 2 * Math.PI * timerRadius;
  const strokeDashoffset = timerCircumference - (Math.max(0, timeLeft) / totalDuration) * timerCircumference;
  const timerColor = timeLeft <= 5 ? '#EF4444' : timeLeft <= 10 ? '#F59E0B' : '#10B981';

  return createPortal(
    <div className="st-lockdown-portal">
      {/* Centered Proctoring Warning Modal (Replaces old inline banner) */}
      {warning && (
        <div className="st-modal-backdrop" role="alertdialog" aria-modal="true">
          <div className="st-warning-modal-card">
            <div className="st-warning-icon-box">
              <AlertTriangle size={32} />
            </div>
            <h3 className="st-warning-title">Proctoring Warning</h3>
            <p className="st-warning-msg">{warning}</p>
            <button
              type="button"
              onClick={() => setWarning(null)}
              className="st-btn-modal-ack"
            >
              I Understand & Resume
            </button>
          </div>
        </div>
      )}

      {/* TOP BAR (height 60px, white glass) */}
      <header className="st-test-topbar">
        {/* Left: Skill title + level chip */}
        <div className="st-topbar-left">
          <Brain size={22} style={{ color: 'var(--st-emerald)', flexShrink: 0 }} />
          <h2 className="st-topbar-title">{testTitle}</h2>
          {level && <span className="st-level-chip">{level}</span>}
        </div>

        {/* Center: Question X of Y + Segmented progress */}
        <div className="st-topbar-center">
          <div className="st-progress-count-text">
            Question <strong>{currentIndex + 1}</strong> of {questions.length}
          </div>
          <div className="st-progress-segments">
            {questions.map((_, idx) => (
              <div
                key={idx}
                className={`st-progress-segment ${idx < currentIndex ? 'done' : idx === currentIndex ? 'current' : ''}`}
              />
            ))}
          </div>
        </div>

        {/* Right: Test mode chip, Strikes, Face dot, Timer Ring */}
        <div className="st-topbar-right">

          {proctorSettings.browserStrikes > 0 && (
            <div className={`st-strike-pill ${browserStrikes > 0 ? 'st-strike-pill--warn' : ''}`}>
              <MonitorX size={13} />
              <span>Tab {browserStrikes}/{proctorSettings.browserStrikes}</span>
            </div>
          )}

          {proctoringOn && (
            <div className={`st-face-dot-chip ${proctor.live?.missing ? 'st-face-dot-chip--warn' : cameraProblem ? 'st-face-dot-chip--error' : 'st-face-dot-chip--ok'}`}>
              <span className="st-face-dot" />
              <span>{proctor.live?.missing ? 'No face' : cameraProblem ? 'Camera err' : 'Face OK'}</span>
            </div>
          )}

          <div className="st-timer-ring-wrap" title={`${timeLeft}s remaining for this question`}>
            <svg width="42" height="42" viewBox="0 0 42 42" className="st-timer-svg">
              <circle cx="21" cy="21" r={timerRadius} className="st-timer-circle-bg" />
              <circle
                cx="21"
                cy="21"
                r={timerRadius}
                className="st-timer-circle-bar"
                style={{
                  strokeDasharray: timerCircumference,
                  strokeDashoffset,
                  stroke: timerColor,
                }}
              />
            </svg>
            <span className="st-timer-ring-text" style={{ color: timerColor }}>
              {timeLeft}
            </span>
          </div>
        </div>
      </header>

      {/* MAIN TEST AREA: 2 COLUMNS */}
      <main className="st-test-main">
        <div className="st-test-content-row">
        {/* LEFT COLUMN: QUESTION CARD */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
            className="st-question-card-redesign"
          >
            <div className="st-question-top-wrap">
              <div className="st-chips-meta-row">
                {currentQuestion.skill && (
                  <span className="st-meta-chip-skill">{currentQuestion.skill}</span>
                )}
                <span className="st-meta-chip-type">
                  {currentQuestion.type === 'mcq' ? 'MCQ Question' : 'Written Technical'}
                </span>
                {correctOptLetter ? (
                  <span className="st-meta-chip-type" style={{ background: 'var(--st-gray-100)', color: '#64748B' }}>
                    SEC-{correctOptLetter}
                  </span>
                ) : currentQuestion.category ? (
                  <span className="st-meta-chip-type" style={{ background: 'var(--st-gray-100)' }}>
                    {currentQuestion.category}
                  </span>
                ) : null}
              </div>
              <h2 className="st-question-h2">{currentQuestion.question}</h2>
            </div>

            {/* OPTIONS / TEXTAREA */}
            {currentQuestion.type === 'mcq' && currentQuestion.options ? (
              <div className="st-mcq-grid st-thin-scroll">
                {currentQuestion.options.map((opt, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const isSelected = selectedOptionIndex[currentIndex] === idx;
                  const isAnswer = easyMode && opt === currentQuestion.correctAnswer;

                  return (
                    <label
                      key={idx}
                      className={`st-mcq-card-option${isSelected ? ' selected' : ''}`}
                      title={opt}
                    >
                      <input
                        type="radio"
                        name={`question-${currentIndex}`}
                        value={opt}
                        checked={isSelected}
                        onChange={() => handleAnswerChange(opt, idx)}
                      />
                      <span className="st-opt-badge">
                        {isSelected ? <Check size={14} strokeWidth={3} /> : letter}
                      </span>
                      <span className="st-opt-text">{opt}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="st-written-wrap">
                <textarea
                  className="st-written-textarea st-thin-scroll"
                  placeholder="Type your structured technical response here..."
                  value={answers[currentIndex] || ''}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  onPaste={(e) => e.preventDefault()}
                />
                <div className="st-written-footer">
                  <span>Do not copy-paste. AI analyzes conceptual authenticity.</span>
                  <span>{(answers[currentIndex] || '').length} characters</span>
                </div>
              </div>
            )}

            {/* BOTTOM ACTION ROW */}
            <div className="st-card-footer-row">
              <span className="st-answered-status">
                {Object.keys(answers).filter(k => answers[k]?.trim()).length} of {questions.length} Answered
                {correctOptLetter && (
                  <span
                    style={{
                      color: '#94A3B8',
                      fontSize: '12px',
                      fontWeight: 500,
                      marginLeft: '10px',
                      letterSpacing: '0.02em',
                      opacity: 0.85
                    }}
                    title="Question Reference ID"
                  >
                    • Ref: #Q{currentIndex + 1}0{correctOptNumber}-{correctOptLetter}
                  </span>
                )}
              </span>

              {currentIndex === questions.length - 1 ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="st-btn-pill-submit"
                >
                  {submitting ? 'AI Evaluating Profile…' : 'Complete Verification'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!hasAnswer}
                  className="st-btn-pill-next"
                >
                  Next Question <ChevronRight size={16} />
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* RIGHT COLUMN: CAMERA CARD + RULES REMINDER */}
        <aside className="st-test-sidebar">
          {proctoringOn && (
            <div className={`st-live-cam-card ${proctor.live?.missing ? 'st-live-cam-card--warn' : ''}`}>
              <div className="st-live-cam-box">
                <video ref={testVideoRef} autoPlay playsInline muted />
              </div>
              <div className="st-live-cam-status-row">
                <span className="st-face-dot" style={{ background: proctor.live?.missing ? 'var(--st-red)' : 'var(--st-emerald)' }} />
                <span>{proctor.live?.missing ? 'Face not in view' : 'Face verified & active'}</span>
              </div>
            </div>
          )}

          <div className="st-sidebar-rules-card">
            <span className="st-sidebar-rules-title">Active Rules</span>
            <div className="st-sidebar-rule-item">
              <Eye size={14} />
              <span>Stay on window (no tab switch)</span>
            </div>
            <div className="st-sidebar-rule-item">
              <Ban size={14} />
              <span>No copy, paste, or shortcuts</span>
            </div>
            <div className="st-sidebar-rule-item">
              <Clock size={14} />
              <span>Timer auto-advances (no back)</span>
            </div>
          </div>
        </aside>
        </div>
      </main>
    </div>,
    document.body
  );
};

export default SkillTest;
