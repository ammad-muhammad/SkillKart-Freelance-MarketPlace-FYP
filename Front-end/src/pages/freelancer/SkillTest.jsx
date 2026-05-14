import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronRight, CheckCircle2, AlertCircle, Timer, Award, Save } from 'lucide-react';
import { toast } from 'react-toastify';
import { skillTestAPI } from '../../api/skillTest';
import { useFreelancer } from '../../context/FreelancerContext';
import './SkillTest.css';

const SkillTest = () => {
  const navigate = useNavigate();
  const { refreshProfile } = useFreelancer();
  
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [skills, setSkills] = useState([]);
  
  const autoSaveTimer = useRef(null);

  useEffect(() => {
    fetchTest();
    return () => clearTimeout(autoSaveTimer.current);
  }, []);

  const fetchTest = async () => {
    try {
      setLoading(true);
      const res = await skillTestAPI.generateTest();
      const { questions: qList, answers: savedAnswers, skills: sList } = res.data.data;
      
      setQuestions(qList);
      setSkills(sList);
      
      if (savedAnswers) {
        setAnswers(savedAnswers);
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to load skill test. Please check your connection.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (val) => {
    const newAnswers = {
      ...answers,
      [currentIndex]: val
    };
    setAnswers(newAnswers);

    // Auto-save logic (debounced)
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveProgress(newAnswers);
    }, 2000);
  };

  const saveProgress = async (currentAnswers) => {
    setSaving(true);
    try {
      await skillTestAPI.saveProgress(currentAnswers);
    } catch (error) {
      console.error('Failed to auto-save progress');
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
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
      await refreshProfile();
      toast.success('Test evaluated successfully!');
    } catch (error) {
      const msg = error.response?.data?.message || 'Submission failed. Please try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="st-loading">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
          <Brain size={48} className="st-loading-icon" />
        </motion.div>
        <h3>AI is preparing your unique verification set...</h3>
        <p>This ensures randomization and prevents gaming.</p>
      </div>
    );
  }

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
              <button onClick={() => window.location.reload()} className="st-btn-retry">
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

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="st-page">
      <div className="st-header">
        <div className="st-header-left">
          <Brain className="st-logo-icon" />
          <div>
            <h1>Skill Verification Test</h1>
            <p>Prove your expertise: {skills.join(', ')}</p>
          </div>
        </div>
        <div className="st-header-right">
          {saving && (
            <div className="st-saving-indicator">
              <Save size={14} className="spin" />
              <span>Auto-saving...</span>
            </div>
          )}
          <div className="st-timer">
            <Timer size={18} />
            <span>Anti-Gaming Active</span>
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
    </div>
  );
};

export default SkillTest;
