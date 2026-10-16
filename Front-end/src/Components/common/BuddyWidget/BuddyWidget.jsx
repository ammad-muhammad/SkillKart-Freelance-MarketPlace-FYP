import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { aiAPI } from '../../../api/ai';
import { useAuth } from '../../../hooks/useAuth';
import { isMobileApp } from '../../../utils/platform';
import {
  Sparkles, Send, X, Paperclip, MessageSquare, Search,
  Edit3, Briefcase, Zap, CheckCircle2
} from 'lucide-react';
import './BuddyWidget.css';

const GUEST_LIMIT = 3;
const GUEST_KEY = 'buddyGuestUsed';

const WELCOME_MESSAGES = [
  {
    role: 'assistant',
    text: "Hi! I'm Buddy 👋, your SkillKart AI assistant.",
  },
  {
    role: 'highlight',
    text: "🚀 AI Matching, Project Estimator & Proposals ready.",
  },
  {
    role: 'assistant',
    text: "Ask me about finding work, hiring, writing proposals, or pricing a project.",
  },
];

const PROMPT_SUGGESTIONS = [
  { label: 'How do I find work?', Icon: Search, query: 'How do I find work on SkillKart?' },
  { label: 'Help me write a proposal', Icon: Edit3, query: 'Help me write a winning proposal for a micro-task' },
  { label: 'How does hiring work?', Icon: Briefcase, query: 'How does hiring student freelancers work?' },
  { label: 'Tips for pricing a project', Icon: Zap, query: 'What are the best tips and strategies for pricing a freelance project?' },
];

export default function BuddyWidget() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(WELCOME_MESSAGES);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const feedRef = useRef(null);
  const inputRef = useRef(null);

  const guestUsed = () => Number(sessionStorage.getItem(GUEST_KEY) || 0);
  const guestRemaining = isAuthenticated ? Infinity : Math.max(0, GUEST_LIMIT - guestUsed());

  const AUTH_SCREENS = ['/login', '/registration', '/role', '/otp-verification', '/forgot-password', '/auth/consent'];
  const FULL_BUDDY_PAGES = ['/ai/buddy', '/freelancer/buddy', '/client/buddy'];
  const ADMIN_PREFIXES = ['/admin', '/admin-panel'];

  const path = location.pathname;
  const isFullBuddyPage = FULL_BUDDY_PAGES.some((p) => path === p || path.startsWith(`${p}/`));
  const isAdminRoute = ADMIN_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  const hidden = isMobileApp() || isFullBuddyPage || isAdminRoute || AUTH_SCREENS.some((p) => path.startsWith(p));

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages, open, sending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (isAuthenticated) { setLimitReached(false); sessionStorage.removeItem(GUEST_KEY); }
  }, [isAuthenticated]);

  if (hidden) return null;

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || sending || limitReached) return;

    if (!isAuthenticated && guestUsed() >= GUEST_LIMIT) {
      setLimitReached(true);
      return;
    }

    const history = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.text }));

    setMessages((prev) => [...prev, { role: 'user', text: msg }]);
    setInput('');
    setSending(true);

    try {
      const { data } = await aiAPI.buddy(msg, history);
      const d = data?.data || {};
      setMessages((prev) => [...prev, { role: 'assistant', text: d.reply || "I've analyzed your request and prepared matching results." }]);
      if (!isAuthenticated) {
        const used = d.guestRemaining != null ? (GUEST_LIMIT - d.guestRemaining) : guestUsed() + 1;
        sessionStorage.setItem(GUEST_KEY, String(used));
        if (d.guestRemaining === 0) setLimitReached(true);
      }
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.data?.loginRequired) {
        sessionStorage.setItem(GUEST_KEY, String(GUEST_LIMIT));
        setLimitReached(true);
      } else {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          text: "I'm available to help you explore gigs, verified student freelancers, or calculate project milestones. Feel free to ask another query!",
        }]);
      }
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <>
      {/* ── Floating Launcher matching Image 3 ── */}
      {!open && (
        <div
          className="buddy-fab"
          onClick={() => setOpen(true)}
          role="button"
          tabIndex={0}
          aria-label="Open Buddy AI Assistant"
        >
          <div className="buddy-fab__glow" />
          <div className="buddy-fab__avatar-wrap">
            <img
              src="/assets/buddy-robot.png"
              alt="Buddy AI"
              className="buddy-fab__avatar-img"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          <div className="buddy-fab__status-pill">
            <span className="buddy-fab__dot" />
            <span>AI ACTIVE</span>
          </div>
        </div>
      )}

      {/* ── Chatbot Window matching Image 3 EXACTLY ── */}
      {open && (
        <div className="buddy-panel-v3" role="dialog" aria-label="Buddy AI Assistant">
          {/* Header */}
          <div className="buddy-panel-v3__head">
            <div className="buddy-panel-v3__brand">
              <div className="buddy-panel-v3__avatar">
                <img
                  src="/assets/buddy-robot.png"
                  alt="Buddy"
                  className="buddy-panel-v3__avatar-img"
                />
              </div>

              <div className="buddy-panel-v3__title-box">
                <h3 className="buddy-panel-v3__title">Buddy AI</h3>
                <div className="buddy-panel-v3__status">
                  <span className="buddy-panel-v3__live-dot" />
                  <span>Online / Smart assistant</span>
                </div>
              </div>
            </div>

            <div className="buddy-panel-v3__actions">
              <button
                type="button"
                className="buddy-panel-v3__quick-pill"
                onClick={() => send("Show me available quick tools and project templates")}
              >
                <Sparkles size={11} />
                <span>Quick Actions</span>
              </button>

              <button
                type="button"
                className="buddy-panel-v3__close"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* 98% Match Ready Progress Bar */}
          <div className="buddy-panel-v3__meter">
            <div className="buddy-panel-v3__meter-bar">
              <div className="buddy-panel-v3__meter-fill" style={{ width: '98%' }} />
            </div>
            <span className="buddy-panel-v3__meter-label">98% Match Ready</span>
          </div>

          {/* Messages Feed */}
          <div className="buddy-panel-v3__feed" ref={feedRef}>
            {messages.map((m, idx) => {
              if (m.role === 'highlight') {
                return (
                  <div key={idx} className="buddy-v3-highlight-card">
                    {m.text}
                  </div>
                );
              }

              const isUser = m.role === 'user';
              return (
                <div
                  key={idx}
                  className={`buddy-v3-msg ${isUser ? 'buddy-v3-msg--user' : 'buddy-v3-msg--assistant'}`}
                >
                  <div className="buddy-v3-msg__text">{m.text}</div>
                </div>
              );
            })}

            {sending && (
              <div className="buddy-v3-action-bubble">
                <span>Analyzing available gigs...</span>
                <span className="buddy-v3-pulse-dots">
                  <span className="b-dot" />
                  <span className="b-dot" />
                  <span className="b-dot" />
                </span>
              </div>
            )}

            {limitReached && (
              <div className="buddy-v3-limit-box">
                <p>You've used all {GUEST_LIMIT} free guest queries. Log in for unlimited assistance.</p>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="buddy-v3-login-btn"
                >
                  Log In to Continue
                </button>
              </div>
            )}
          </div>

          {/* Quick Action Prompt Chips */}
          <div className="buddy-v3-chips-dock">
            {PROMPT_SUGGESTIONS.map((chip, i) => (
              <button
                key={i}
                type="button"
                className="buddy-v3-chip-btn"
                onClick={() => send(chip.query)}
                disabled={sending}
              >
                <chip.Icon size={12} className="buddy-v3-chip-icon" />
                <span>{chip.label}</span>
              </button>
            ))}
          </div>

          {/* Input Dock */}
          <div className="buddy-v3-input-area">
            <div className="buddy-v3-input-bar">
              {/* Attachment icon */}
              <button
                type="button"
                className="buddy-v3-icon-btn"
                title="Attach project brief"
                onClick={() => send("Help me estimate project from a brief")}
              >
                <Paperclip size={16} />
              </button>

              {/* Chat template icon */}
              <button
                type="button"
                className="buddy-v3-icon-btn"
                title="Templates"
                onClick={() => send("Show proposal template")}
              >
                <MessageSquare size={16} />
              </button>

              {/* Text Input */}
              <input
                ref={inputRef}
                type="text"
                className="buddy-v3-input-field"
                placeholder="Ask Buddy anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={sending || limitReached}
              />

              {/* Send Button */}
              <button
                type="button"
                className="buddy-v3-send-btn"
                onClick={() => send()}
                disabled={sending || limitReached || !input.trim()}
                aria-label="Send"
              >
                <Send size={14} />
              </button>
            </div>

            <div className="buddy-v3-footer-tag">
              <Zap size={11} className="buddy-v3-zap" />
              <span>Powered by SkillKart AI</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
