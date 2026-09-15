import { useState, useRef, useEffect } from 'react';
import { Bot, Send } from 'lucide-react';
import { aiAPI } from '../../../api/ai';
import './BuddyChatPage.css';

const WELCOME = "Hi! I'm Buddy 🤖 — your SkillKart assistant. Ask me about finding work, hiring, writing proposals, or pricing a project.";
const SUGGESTIONS = ['How do I find work?', 'Help me write a proposal', 'How does hiring work?', 'Tips for pricing a project'];

/**
 * Full-page Buddy AI chat — shared by the client and freelancer dashboards
 * (their own routes render this same component, mirroring NotificationsPage).
 * Unlike the floating BuddyWidget (marketing/guest-facing, with a message
 * quota), every visitor here is already authenticated, so there's no guest
 * limit to track.
 */
export default function BuddyChatPage() {
  const [messages, setMessages] = useState([{ role: 'assistant', text: WELCOME }]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const feedRef = useRef(null);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages, sending]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;

    const history = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.text }));

    setMessages((prev) => [...prev, { role: 'user', text: msg }]);
    setInput('');
    setSending(true);

    try {
      const { data } = await aiAPI.buddy(msg, history);
      const reply = data?.data?.reply;
      setMessages((prev) => [...prev, { role: 'assistant', text: reply || "Sorry, I couldn't think of a reply just now." }]);
    } catch (err) {
      const aiDown = err.response?.status === 503 || !err.response;
      setMessages((prev) => [...prev, {
        role: 'assistant',
        text: aiDown
          ? 'Buddy AI is temporarily out of service. Please try again in a little while.'
          : "I'm having trouble right now — please try again in a moment.",
      }]);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="bc-page">
      <div className="bc-header">
        <span className="bc-header__avatar"><Bot size={20} /></span>
        <div>
          <h1 className="bc-title">Buddy AI</h1>
          <p className="bc-sub">● Online — ask me anything about freelancing</p>
        </div>
      </div>

      <div className="bc-feed" ref={feedRef}>
        {messages.map((m, i) => (
          <div key={i} className={`bc-msg bc-msg--${m.role === 'user' ? 'user' : 'bot'}`}>
            {m.text}
          </div>
        ))}
        {sending && <div className="bc-msg bc-msg--bot bc-msg--typing"><span /><span /><span /></div>}
      </div>

      {messages.length === 1 && (
        <div className="bc-chips">
          {SUGGESTIONS.map((q) => (
            <button key={q} className="bc-chip" onClick={() => send(q)} disabled={sending}>{q}</button>
          ))}
        </div>
      )}

      <div className="bc-input">
        <input
          type="text"
          placeholder="Ask Buddy anything…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={sending}
        />
        <button onClick={() => send()} disabled={sending || !input.trim()} aria-label="Send">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
