import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { aiAPI } from '../../../api/ai';
import { useAuth } from '../../../hooks/useAuth';
import './BuddyWidget.css';

const GUEST_LIMIT = 3;
const GUEST_KEY = 'buddyGuestUsed';

const WELCOME = "Hi! I'm Buddy 🤖 — your SkillKart assistant. Ask me about finding work, hiring, writing proposals, or pricing a project.";

export default function BuddyWidget() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', text: WELCOME }]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const feedRef = useRef(null);

  // Guest usage counter (persisted so it survives navigation within the session).
  const guestUsed = () => Number(sessionStorage.getItem(GUEST_KEY) || 0);
  const guestRemaining = isAuthenticated ? Infinity : Math.max(0, GUEST_LIMIT - guestUsed());

  // Hide the floating widget on auth screens + on the dedicated Buddy page and
  // the real messaging pages (to avoid overlapping their UIs).
  const HIDDEN_ON = ['/login', '/registration', '/role', '/otp-verification', '/forgot-password', '/auth/consent', '/ai/buddy', '/client/messages', '/freelancer/messages'];
  const hidden = HIDDEN_ON.some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages, open]);

  // If a guest logs in, clear the limit lock.
  useEffect(() => {
    if (isAuthenticated) { setLimitReached(false); sessionStorage.removeItem(GUEST_KEY); }
  }, [isAuthenticated]);

  if (hidden) return null;

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || sending || limitReached) return;

    // Guest gate (client-side) — the server enforces it too.
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
      setMessages((prev) => [...prev, { role: 'assistant', text: d.reply || "Sorry, I couldn't think of a reply just now." }]);
      if (!isAuthenticated) {
        // Sync the guest counter with the server's authoritative remaining count.
        const used = d.guestRemaining != null ? (GUEST_LIMIT - d.guestRemaining) : guestUsed() + 1;
        sessionStorage.setItem(GUEST_KEY, String(used));
        if (d.guestRemaining === 0) setLimitReached(true);
      }
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.data?.loginRequired) {
        sessionStorage.setItem(GUEST_KEY, String(GUEST_LIMIT));
        setLimitReached(true);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', text: "I'm having trouble right now — please try again in a moment." }]);
      }
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* Launcher bubble */}
      {!open && (
        <button className="buddy-fab" onClick={() => setOpen(true)} aria-label="Open Buddy AI chat">
          <span className="buddy-fab__icon">🤖</span>
          <span className="buddy-fab__pulse" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="buddy-panel" role="dialog" aria-label="Buddy AI assistant">
          <div className="buddy-panel__header">
            <div className="buddy-panel__title">
              <span className="buddy-panel__avatar">🤖</span>
              <div>
                <strong>Buddy AI</strong>
                <span className="buddy-panel__status">● Online</span>
              </div>
            </div>
            <button className="buddy-panel__close" onClick={() => setOpen(false)} aria-label="Close chat">✕</button>
          </div>

          <div className="buddy-panel__feed" ref={feedRef}>
            {messages.map((m, i) => (
              <div key={i} className={`buddy-msg buddy-msg--${m.role === 'user' ? 'user' : 'bot'}`}>
                {m.text}
              </div>
            ))}
            {sending && <div className="buddy-msg buddy-msg--bot buddy-msg--typing"><span /><span /><span /></div>}

            {limitReached && (
              <div className="buddy-limit">
                <p>You've used your {GUEST_LIMIT} free messages. Log in to keep chatting with Buddy — it's free.</p>
                <button className="buddy-limit__btn" onClick={() => navigate('/login')}>Log in to continue</button>
              </div>
            )}
          </div>

          {/* Quick prompts (only at the very start) */}
          {messages.length === 1 && !limitReached && (
            <div className="buddy-chips">
              {['How do I find work?', 'Help me write a proposal', 'How does hiring work?'].map((q) => (
                <button key={q} className="buddy-chip" onClick={() => send(q)} disabled={sending}>{q}</button>
              ))}
            </div>
          )}

          <div className="buddy-panel__input">
            <input
              type="text"
              placeholder={limitReached ? 'Log in to continue…' : 'Ask Buddy anything…'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={sending || limitReached}
            />
            <button onClick={() => send()} disabled={sending || limitReached || !input.trim()} aria-label="Send">
              ➤
            </button>
          </div>
          {!isAuthenticated && !limitReached && guestRemaining <= GUEST_LIMIT && (
            <div className="buddy-panel__quota">{guestRemaining} free message{guestRemaining === 1 ? '' : 's'} left · <button onClick={() => navigate('/login')}>log in</button> for unlimited</div>
          )}
        </div>
      )}
    </>
  );
}
