import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronRight, CheckCircle2, AlertCircle, Award, ShieldAlert, Eye, Maximize2, Ban, Camera, CameraOff, Clock } from 'lucide-react';
import { safeToast as toast } from '../../utils/safeToast';
import { skillTestAPI } from '../../api/skillTest';
import { useFreelancer } from '../../context/FreelancerContext';
import useAntiCheat from './useAntiCheat';
import useProctoring from './useProctoring';
import ProctorPanel, { PreviewStatus } from './proctoring/ProctorPanel';
import { deriveProctoringSettings, normalizeStrictness } from './proctoring/strictness';
import './SkillTest.css';

// useAntiCheat always uses one of these exact reason strings per violation
// type — map them back to a type for the violation log sent to the backend.
const BROWSER_VIOLATION_TYPE = {
  'You switched away from the test tab.': 'tab_switch',
  'The test window lost focus.': 'window_blur',
  'You exited full-screen mode.': 'fullscreen_exit',
  // Polling-based backup check (see useAntiCheat's watchdog effect) — same
  // underlying signal as a blur/visibility event, just caught a different way.
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
// Written-answer questions need more time to type than an MCQ click —
// applies unconditionally (demo and real, easy mode or not).
const TEXT_QUESTION_SECONDS = 30;

// The level the freelancer picks before starting decides how many questions
// they get (and how hard the AI writes them). Keep `count` in sync with
// Backend/src/utils/skillTestDifficulty.js's TEST_LEVELS — the server is the
// source of truth, this is only so the rules screen can show it up front.
const TEST_LEVELS = [
  { key: 'easy', label: 'Easy', count: 5, blurb: 'Core basics — a quick check' },
  { key: 'intermediate', label: 'Intermediate', count: 10, blurb: 'Practical working knowledge' },
  { key: 'expert', label: 'Expert', count: 15, blurb: 'In-depth, advanced questions' },
];

// The server targets ~80% MCQ / ~20% text — used only to give the rules
// screen a realistic upfront time estimate before the real mix is known.
const estimateTotalSeconds = (count) => {
  const mcqCount = Math.ceil(count * 0.8);
  const textCount = count - mcqCount;
  return mcqCount * PER_QUESTION_SECONDS + textCount * TEXT_QUESTION_SECONDS;
};

const formatDuration = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (!minutes) return `${seconds} sec`;
  if (!seconds) return `${minutes} min`;
  return `${minutes} min ${seconds} sec`;
};

// Test flow phases:
//   'rules'   — proctoring rules shown; freelancer must accept to begin
//   'testing' — locked-down full-screen test (no menus, anti-cheat armed)
//   'aborted' — cheating detected; offer to restart from 0 with fresh questions
const SkillTest = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const specificSkill = searchParams.get('skill');
  // When arriving here because a proposal was blocked pending verification
  // (JobDetails.jsx's skill-gate handling), this points back at that exact
  // job (e.g. "/jobs/:id?openApply=1") so passing the test resumes applying
  // instead of dropping the freelancer on the dashboard.
  const returnTo = searchParams.get('returnTo');
  const { refreshProfile } = useFreelancer();

  const [phase, setPhase] = useState('rules');
  // 'easy' | 'intermediate' | 'expert' — picked on the rules screen (null until
  // then). Kept across a cancelled attempt / retake so a restart reuses it.
  const [level, setLevel] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  // Which option INDEX is selected per question — kept separate from
  // `answers` (which stores the option TEXT for submission) because the AI
  // can generate MCQs with duplicate/near-duplicate option text; matching
  // "selected" by text would then highlight every option with that text.
  const [selectedOptionIndex, setSelectedOptionIndex] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [skills, setSkills] = useState([]);
  // Testing-only: backend sets this from SKILL_TEST_EASY_MODE — when true, the
  // correct MCQ answer is highlighted below so a tester can breeze through.
  const [easyMode, setEasyMode] = useState(false);
  const [warning, setWarning] = useState(null);   // latest strike / final-warning text (in-test banner)
  const [abortReason, setAbortReason] = useState('');
  const [attemptId, setAttemptId] = useState(0);  // bumped each (re)start → resets strikes
  const [timeLeft, setTimeLeft] = useState(PER_QUESTION_SECONDS);
  // SKILL_TEST_PROCTOR_STRICTNESS from the backend (0–1). null = still loading.
  const [strictness, setStrictness] = useState(null);
  const [browserStrikes, setBrowserStrikes] = useState(0);
  const proctorSettings = useMemo(() => deriveProctoringSettings(strictness ?? 0.5), [strictness]);
  const configLoaded = strictness !== null;

  const rulesVideoRef = useRef(null);
  const testVideoRef = useRef(null);
  const violationLog = useRef([]); // browser violations (tab / blur / full-screen), sent on submit

  const logViolation = (source, type, reason) => {
    violationLog.current.push({ source, type, reason, at: Date.now() });
  };

  // Load the single proctoring knob once. A failed request falls back to
  // medium (0.5), never to "off" — a network hiccup must not disable proctoring.
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
    // Discard the in-progress attempt entirely.
    setQuestions([]);
    setAnswers({});
    setSelectedOptionIndex({});
    setCurrentIndex(0);
  };

  // Tab switch / window blur / leaving full-screen. How many are tolerated
  // comes from the same strictness value (0 = never penalised).
  const { requestFullscreen, exitFullscreen } = useAntiCheat({
    active: phase === 'testing' && !result,
    attemptId,
    maxStrikes: proctorSettings.browserStrikes,
    onStrike: (count, max, reason) => {
      logViolation('browser', BROWSER_VIOLATION_TYPE[reason] || 'other', reason);
      setBrowserStrikes(count);
      if (count < max - 1) setWarning(`Strike ${count} of ${max} — ${reason} Stay on this window.`);
    },
    onWarn: (reason) => {
      setWarning(`Final warning — ${reason} Leaving the test once more will cancel it.`);
    },
    onAbort: (reason) => abortAttempt(reason),
  });

  // Camera proctoring — face presence only. 'preview' on the rules screen
  // shows the live face check without enforcing anything; 'active' during the
  // test cancels it when no face has been in view for 3s.
  const proctor = useProctoring({
    settings: proctorSettings,
    mode: !configLoaded ? 'off' : phase === 'testing' && !result ? 'active' : phase === 'rules' ? 'preview' : 'off',
    attemptId,
    videoRef: phase === 'testing' ? testVideoRef : rulesVideoRef,
    onAbort: (message) => abortAttempt(message),
  });
  const { cameraError, startCamera, stopCamera } = proctor;
  // Camera proctoring applies unless it's switched off or the device has no
  // camera at all — then the test simply runs without it.
  const proctoringOn = proctorSettings.enabled && !proctor.noCamera;
  // "Start Test" waits until the face check is genuinely working — camera
  // streaming AND at least one frame analysed — so a device where detection
  // can't run finds out here, not silently halfway through the test.
  const cameraReady = !proctoringOn || (
    proctor.engineStatus === 'ready' && proctor.cameraOn && proctor.detecting && !proctor.cameraError && !proctor.engineError
  );
  const cameraProblem = proctoringOn ? (proctor.engineError || proctor.cameraError) : null;
  // The cancelled screen has no <video> to preview in, so "Retry Camera" there only
  // checks that the camera opens again (clearing a leftover error) and releases it —
  // the restart opens its own stream.
  const retryCameraCheck = async () => {
    if (await proctor.retry()) stopCamera();
  };

  // Request the webcam as soon as the rules screen is shown, so the freelancer
  // can confirm they're in frame before committing to "Start Test". Camera
  // access is now REQUIRED — "Start Test" stays disabled while `cameraError`
  // is set (see the rules-screen JSX below), with a "Retry Camera" button
  // that just re-calls startCamera() once they've granted permission.
  // The rules-preview and in-test thumbnail are different <video> elements
  // (separate conditional render branches below), so the stream is re-grabbed
  // and re-attached whenever the phase switches — startTest() stops the old
  // one first, and the browser doesn't re-prompt once permission is granted.
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

  // Begin (or restart) the test: enter fullscreen, pull FRESH questions, arm guard.
  const startTest = async () => {
    if (!level) return; // the level decides the question set — it must be picked first
    setWarning(null);
    setAbortReason('');
    setResult(null);
    setBrowserStrikes(0);
    violationLog.current = [];

    // MUST happen first, synchronously within this click's user-activation
    // window. Browsers silently reject document.requestFullscreen() once an
    // `await` has yielded control back to the event loop — awaiting the test
    // generation call (a network round-trip) BEFORE requesting fullscreen was
    // exactly that bug: fullscreen would near-always fail, invisibly, and the
    // test would silently fall back to running without it.
    const fs = await requestFullscreen();
    if (!fs) {
      // Fullscreen was blocked — the test still runs locked-down (overlay) and
      // the tab-switch / blur guards stay active, but tell the user so the
      // "full-screen" promise on the rules screen isn't silently broken.
      toast.info('Full-screen could not be enabled, but the test is still proctored. Avoid switching tabs or windows.');
    }

    // force=true so a restart never reuses the previous question set.
    const ok = await fetchTest(specificSkill, true, level);
    if (!ok) {
      toast.error('Could not generate a test right now. Please try again.');
      return;
    }
    // Drop the rules-preview camera stream — a fresh one attaches to the
    // in-test thumbnail once the 'testing' phase mounts (see effect above).
    stopCamera();
    // New attempt → reset strike counter (via attemptId) before arming.
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

  // Backward navigation is intentionally not supported — each question locks
  // once you move past it (manually or via the 20s timer running out).

  // Synchronous ref guard — the per-question timer can call this directly on
  // timeout in the same tick as a manual "Complete Verification" click, before
  // the `setSubmitting(true)` state update has re-rendered to disable the
  // button. A plain state check here would still race; the ref doesn't.
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

  // Always points at the latest handleSubmit closure (fresh answers/violation
  // log), so the timer below can safely call it from an interval that may
  // have been set up several questions ago.
  const handleSubmitRef = useRef(() => {});
  useEffect(() => { handleSubmitRef.current = handleSubmit; });

  // Per-question countdown (20s for MCQs, 30s for written answers): whether
  // answered or not, time running out advances to the next question — or, on
  // the last question, submits the whole test automatically. Resets on every
  // question/attempt change; there is no way back to a question once its
  // timer has moved on.
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

  // Make sure we never leave the browser stuck in fullscreen on unmount.
  useEffect(() => () => exitFullscreen(), [exitFullscreen]);

  const testTitle = specificSkill ? `${specificSkill} Verification` : 'Skill Verification Test';

  /* ───────────────── RESULT SCREEN ───────────────── */
  if (result) {
    // The rank follows the level that was picked (Easy → Beginner, Intermediate,
    // Expert) — the score only decides whether the skill verifies at all.
    const takenLevel = TEST_LEVELS.find((l) => l.key === (result.testLevel || level));
    const takenLabel = takenLevel?.label;
    // A mixed test can verify some skills and not others — only badge the ones that did.
    const verifiedSkills = skills.filter((s) => result.skillScores?.[s]?.isVerified ?? true);
    return (
      <div className="st-result-container">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="st-result-card">
          {result.verified ? (
            <div className="st-result-success">
              <Award size={80} className="st-success-icon" />
              <h1>{takenLabel ? `${takenLabel} Level Verified!` : 'Skills Verified!'}</h1>
              <div className="st-score-ring">
                <span className="st-score-val">{result.score.toFixed(0)}%</span>
                <span className="st-score-label">Technical Score</span>
              </div>
              <p className="st-result-desc">
                Your score verifies {verifiedSkills.length === 1 ? 'this skill' : 'these skills'}
                {takenLabel ? <> at the <strong>{takenLabel}</strong> level</> : null}.{' '}
                {verifiedSkills.length === 1 ? "It's" : "They're"} now marked <strong>{result.level}</strong> on your
                profile, and you can apply to work that requires {verifiedSkills.length === 1 ? 'it' : 'them'}.
              </p>
              <div className="st-skill-badges">
                {verifiedSkills.map((s) => (
                  <span key={s} className={`st-badge${result.level === 'Expert' ? ' expert' : ''}`}>Verified {s} · {result.level}</span>
                ))}
              </div>
              <button onClick={() => navigate(returnTo || '/freelancer/dashboard')} className="st-btn-finish">
                {returnTo ? 'Continue to Proposal' : 'Continue to Dashboard'}
              </button>
              {result.testLevel !== 'expert' && (
                <button onClick={() => { setResult(null); setPhase('rules'); }} className="st-btn-later">
                  Take a Higher Level
                </button>
              )}
            </div>
          ) : (
            <div className="st-result-failed">
              <CheckCircle2 size={80} style={{ color: 'var(--color-error)' }} />
              <h1>Not Verified Yet</h1>
              <div className="st-score-ring" style={{ borderColor: 'var(--color-error)' }}>
                <span className="st-score-val">{result.score.toFixed(0)}%</span>
                <span className="st-score-label">Score</span>
              </div>
              <p className="st-result-desc">
                That score is too low to verify {skills.length === 1 ? 'this skill' : 'these skills'}
                {takenLabel ? <> at the <strong>{takenLabel}</strong> level</> : null}.
                Retake the test and score at least 25% to unlock applying to work that requires {skills.length === 1 ? 'it' : 'them'}.
              </p>
              <button onClick={() => { setResult(null); setPhase('rules'); }} className="st-btn-retry">
                Retake the Test
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
            <Ban size={80} style={{ color: 'var(--color-error)' }} />
            <h1>Cheating Detected</h1>
            <p className="st-result-desc">
              {abortReason || 'Suspicious activity was detected during the test.'} As a result, this attempt
              has been <strong>cancelled</strong>. To keep verification fair, you'll start over from question 1
              with a brand-new set of questions.
            </p>
            {proctoringOn && cameraError && (
              <>
                <p className="st-result-desc" style={{ color: 'var(--color-error)', fontWeight: 600 }}>
                  Camera required — please allow camera access or use a device with a working camera before restarting.
                </p>
                <button type="button" onClick={retryCameraCheck} className="st-btn-later">
                  Retry Camera
                </button>
              </>
            )}
            <button onClick={startTest} disabled={loading || (proctoringOn && !!cameraError)} className="st-btn-retry">
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
    const selectedLevel = TEST_LEVELS.find((l) => l.key === level);
    return (
      <div className="st-page">
        <div className="st-rules-wrap">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="st-rules-card">
            <div className="st-rules-head">
              <ShieldAlert size={42} className="st-rules-icon" />
              <div>
                <h1>{testTitle}</h1>
                <p>Choose your level, then read the proctoring rules before you begin.</p>
              </div>
            </div>

            <div className="st-level-picker" role="radiogroup" aria-label="Test level">
              <p className="st-level-title">Which level do you want to take?</p>
              <div className="st-level-options">
                {TEST_LEVELS.map((l) => (
                  <button
                    key={l.key}
                    type="button"
                    role="radio"
                    aria-checked={level === l.key}
                    disabled={loading}
                    onClick={() => setLevel(l.key)}
                    className={`st-level-card${level === l.key ? ' st-level-card--selected' : ''}`}
                  >
                    <span className="st-level-name">{l.label}</span>
                    <span className="st-level-count">{l.count} questions</span>
                    <span className="st-level-blurb">{l.blurb}</span>
                  </button>
                ))}
              </div>
            </div>

            {selectedLevel && (
              <div className="st-total-time">
                <Clock size={18} />
                <span>
                  Total test time: <strong>~{formatDuration(estimateTotalSeconds(selectedLevel.count))}</strong>
                  {' '}({selectedLevel.count} questions — most MCQ)
                </span>
              </div>
            )}

            <ul className="st-rules-list">
              <li><Maximize2 size={18} /><span>The test runs in <strong>full-screen</strong>. Other menus are hidden — only the test is shown.</span></li>
              {proctorSettings.browserStrikes > 0 ? (
                <li><Eye size={18} /><span><strong>Stay on the test window.</strong> Switching tabs, minimizing, or leaving full-screen counts as a strike — the <strong>{ordinal(proctorSettings.browserStrikes)} time cancels the test</strong> and you restart from question 1 with new questions. You get a final warning before that.</span></li>
              ) : (
                <li><Eye size={18} /><span>Please stay on the test window for the whole test.</span></li>
              )}
              {!proctorSettings.enabled ? (
                <li><CameraOff size={18} /><span>Camera proctoring is <strong>turned off</strong> for this test.</span></li>
              ) : proctor.noCamera ? (
                <li><CameraOff size={18} /><span><strong>No camera was detected</strong> on this device, so camera proctoring is skipped — you can take the test without one.</span></li>
              ) : (
                <li><Camera size={18} /><span>Your <strong>webcam must stay on</strong> and a face must stay in view. If <strong>no face is detected for {seconds(proctorSettings.holdMs)}</strong> — you left, covered the camera or it shows a blank picture — the <strong>test is cancelled</strong> and you restart from question 1 with new questions. Moving around is fine.</span></li>
              )}
              <li><Clock size={18} /><span>Each question has a timer — <strong>{PER_QUESTION_SECONDS}s for multiple-choice</strong>, <strong>{TEXT_QUESTION_SECONDS}s for written-answer</strong> questions. It auto-advances whether you've answered or not, and <strong>you cannot go back</strong> to a previous question.</span></li>
              <li><AlertCircle size={18} /><span>Copy, paste, right-click and dev-tools shortcuts are disabled. AI also detects paraphrased / AI-generated answers.</span></li>
              <li><CheckCircle2 size={18} /><span>Score at least <strong>25%</strong> to verify the skill and unlock applying to work that requires it. You're marked at the <strong>level you pick</strong> — Easy (Beginner), Intermediate or Expert.</span></li>
            </ul>

            {proctorSettings.enabled && proctor.noCamera && (
              <div className="st-camera-note">
                <CameraOff size={16} />
                <span>No camera detected on this device. If you connect one, check again.</span>
                <button type="button" onClick={proctor.retry} className="st-btn-ghost-sm st-btn-ghost-sm--neutral">
                  Check Again
                </button>
              </div>
            )}

            {proctoringOn && (
              <>
                <div className="st-camera-preview">
                  <video ref={rulesVideoRef} className="st-camera-preview__video" autoPlay playsInline muted />
                  {cameraProblem ? (
                    <div className="st-camera-preview__overlay">
                      <CameraOff size={20} />
                      <span>{cameraProblem}</span>
                    </div>
                  ) : (
                    <PreviewStatus proctor={proctor} />
                  )}
                </div>

                {cameraProblem && (
                  <div className="st-camera-blocked">
                    <AlertCircle size={16} />
                    <span>{cameraProblem} Allow camera access (or switch to a device with a working camera), then retry.</span>
                    <button type="button" onClick={proctor.retry} className="st-btn-ghost-sm">
                      Retry Camera
                    </button>
                  </div>
                )}
              </>
            )}

            <div className="st-rules-actions">
              <button onClick={startTest} disabled={loading || !configLoaded || !level || !cameraReady} className="st-btn-submit">
                {loading
                  ? 'Preparing your test…'
                  : !configLoaded
                    ? 'Loading…'
                    : !level
                      ? 'Choose a level to start'
                      : !cameraReady && !cameraProblem
                        ? 'Waiting for the face check…'
                        : 'I Understand — Start Test'}
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
  const hasAnswer = currentQuestion.type === 'mcq'
    ? selectedOptionIndex[currentIndex] !== undefined
    : Boolean((answers[currentIndex] || '').trim());

  /* ───────────────── LOCKED-DOWN TEST ─────────────────
     Portaled to <body> so the fixed full-viewport overlay can never be clipped
     by a transform/filter on the layout (which would re-expose the sidebar). */
  return createPortal(
    <div className="st-page st-lockdown">
      {/* Latest strike / final warning — toasts can't show here (the
          lockdown overlay sits above the toast layer on purpose). */}
      {warning && (
        <div className="st-cheat-banner">
          <ShieldAlert size={18} />
          <span>{warning}</span>
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
          {proctoringOn && (
            <div
              className={`st-camera-thumb${cameraProblem ? ' st-camera-thumb--error' : proctor.live?.missing ? ' st-camera-thumb--warn' : ''}`}
              title={cameraProblem || 'Webcam proctoring active'}
            >
              <video ref={testVideoRef} autoPlay playsInline muted />
              {cameraProblem && <CameraOff size={14} className="st-camera-thumb__off" />}
            </div>
          )}
          <div className={`st-timer st-question-timer${timeLeft <= 5 ? ' st-question-timer--danger' : ''}`}>
            <Clock size={18} />
            <span>0:{String(timeLeft).padStart(2, '0')}</span>
          </div>
        </div>
      </div>

      {proctorSettings.enabled && (
        <ProctorPanel
          proctor={proctor}
          cameraActive={proctoringOn}
          holdMs={proctorSettings.holdMs}
          browserStrikes={browserStrikes}
          browserMax={proctorSettings.browserStrikes}
        />
      )}

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
                  {easyMode && (
                    <div className="st-easy-mode-banner">
                      <ShieldAlert size={16} />
                      <span>Testing mode: correct answer highlighted below.</span>
                    </div>
                  )}
                  {currentQuestion.options.map((opt, idx) => {
                    const isAnswer = easyMode && opt === currentQuestion.correctAnswer;
                    const classes = ['st-mcq-option'];
                    if (selectedOptionIndex[currentIndex] === idx) classes.push('selected');
                    if (isAnswer) classes.push('st-mcq-option--answer');
                    return (
                      <label key={idx} className={classes.join(' ')}>
                        <input
                          type="radio"
                          name={`question-${currentIndex}`}
                          value={opt}
                          checked={selectedOptionIndex[currentIndex] === idx}
                          onChange={() => handleAnswerChange(opt, idx)}
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
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
          <div className="st-nav-info">
            {Object.keys(answers).filter(k => answers[k]?.trim()).length} / {questions.length} Answered
          </div>

          {currentIndex === questions.length - 1 ? (
            <button onClick={handleSubmit} disabled={submitting} className="st-btn-submit">
              {submitting ? 'AI Ranking Profile...' : 'Complete Verification'}
            </button>
          ) : (
            <button onClick={handleNext} disabled={!hasAnswer} className="st-btn-next">
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
