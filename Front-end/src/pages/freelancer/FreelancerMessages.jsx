import { useState } from 'react';
import { useFreelancer } from '../../context/FreelancerContext';
import '../client/ClientDashboard.css'; // Reusing client CSS for messages as it's the same UI pattern

const MOCK_CHATS = [
  { id: 1, name: 'Google (Mark)', lastMsg: 'The project proposal looks good. When can we start?', time: '9:45 AM', online: true, unread: 1 },
  { id: 2, name: 'Meta (Sophia Chen)', lastMsg: 'I have shared the asset link for the UI development.', time: 'Yesterday', online: false, unread: 0 },
  { id: 3, name: 'Sarah Miller', lastMsg: 'Can you please update the hero section?', time: 'Yesterday', online: true, unread: 0 },
];

const FreelancerMessages = () => {
  const { profile } = useFreelancer();
  const [activeChat, setActiveChat] = useState(MOCK_CHATS[0]);
  const [msgInput, setMsgInput] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, sender: 'Google (Mark)', text: 'Hello! Thanks for applying to the Full Stack position.', time: '9:30 AM' },
    { id: 2, sender: 'You', text: 'Hi Mark, thanks for reaching out. I am excited to discuss the role!', time: '9:35 AM' },
    { id: 3, sender: 'Google (Mark)', text: 'The project proposal looks good. When can we start?', time: '9:45 AM' },
  ]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!msgInput.trim()) return;
    setMessages(prev => [...prev, { id: Date.now(), sender: 'You', text: msgInput, time: 'Now' }]);
    setMsgInput('');
  };

  return (
    <div className="fl-messages-page">
      <div className="fl-page-header">
        <h1 className="fl-page-title">Direct Messages</h1>
        <p className="fl-page-sub">Communicate with your clients and agencies.</p>
      </div>

      <div className="fl-messages-layout animate-fade-in">
        {/* Chat List */}
        <aside className="fl-chat-list">
          <div className="fl-chat-list__search">
            <input type="text" placeholder="Search chats..." className="fl-input fl-input--sm" />
          </div>
          <div className="fl-chat-list__items">
            {MOCK_CHATS.map(chat => (
              <div 
                key={chat.id} 
                className={`fl-chat-item${activeChat.id === chat.id ? ' fl-chat-item--active' : ''}`}
                onClick={() => setActiveChat(chat)}
              >
                <div className="fl-chat-item__avatar">
                  <span>{chat.name.charAt(0)}</span>
                  {chat.online && <div className="fl-chat-item__online" />}
                </div>
                <div className="fl-chat-item__info">
                  <div className="fl-chat-item__top">
                    <h4 className="fl-chat-item__name">{chat.name}</h4>
                    <span className="fl-chat-item__time">{chat.time}</span>
                  </div>
                  <p className="fl-chat-item__last-msg">{chat.lastMsg}</p>
                </div>
                {chat.unread > 0 && <span className="fl-chat-item__unread">{chat.unread}</span>}
              </div>
            ))}
          </div>
        </aside>

        {/* Chat window */}
        <main className="fl-chat-window">
          {/* Chat Header */}
          <header className="fl-chat-window__header">
            <div className="fl-chat-window__avatar">
              <span>{activeChat.name.charAt(0)}</span>
              {activeChat.online && <div className="fl-chat-window__online" />}
            </div>
            <div>
              <h4 className="fl-chat-window__name">{activeChat.name}</h4>
              <span className="fl-chat-window__status">{activeChat.online ? 'Online' : 'Offline'}</span>
            </div>
            <div className="fl-chat-window__actions">
              <button className="fl-btn fl-btn--ghost fl-btn--sm">📞</button>
              <button className="fl-btn fl-btn--ghost fl-btn--sm">🎥</button>
            </div>
          </header>

          {/* Messages Feed */}
          <div className="fl-chat-feed">
            {messages.map(msg => (
              <div key={msg.id} className={`fl-msg${msg.sender === 'You' ? ' fl-msg--own' : ''}`}>
                <div className="fl-msg__bubble">
                  {msg.text}
                  <span className="fl-msg__time">{msg.time}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <form className="fl-chat-input" onSubmit={sendMessage}>
            <button type="button" className="fl-chat-input__attach">📎</button>
            <input 
              type="text" 
              placeholder="Start typing..." 
              value={msgInput}
              onChange={e => setMsgInput(e.target.value)}
              className="fl-input"
            />
            <button className="fl-btn fl-btn--primary">Send</button>
          </form>
        </main>
      </div>

      <style>{`
        .fl-messages-layout {
          display: flex;
          height: calc(100vh - 250px);
          min-height: 500px;
          background: #fff;
          border-radius: 16px;
          border: 1px solid #e5edf5;
          box-shadow: 0 4px 20px rgba(4,46,76,0.06);
          overflow: hidden;
        }
        
        .fl-chat-list {
          width: 320px; border-right: 1px solid #e5edf5; background: #f8fafc;
          display: flex; flex-direction: column;
        }
        .fl-chat-list__search { padding: 1rem; border-bottom: 1px solid #eaeff5; }
        .fl-chat-list__items { flex: 1; overflow-y: auto; }
        .fl-chat-item {
          display: flex; align-items: center; gap: 0.75rem; padding: 1rem;
          cursor: pointer; border-bottom: 1px solid #f0f4f8; position: relative;
        }
        .fl-chat-item:hover { background: #f1f5f9; }
        .fl-chat-item--active { background: #fff !important; }
        .fl-chat-item__avatar {
          width: 42px; height: 42px; border-radius: 50%;
          background: var(--gradient-primary); color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; position: relative; flex-shrink: 0;
        }
        .fl-chat-item__online {
          position: absolute; bottom: 2px; right: -2px; width: 10px; height: 10px;
          border-radius: 50%; background: #22c55e; border: 2px solid #fff;
        }
        .fl-chat-item__info { min-width: 0; flex: 1; }
        .fl-chat-item__top { display: flex; justify-content: space-between; align-items: center; }
        .fl-chat-item__name { font-size: 0.875rem; font-weight: 700; color: var(--color-primary); }
        .fl-chat-item__time { font-size: 0.7rem; color: #94a3b8; }
        .fl-chat-item__last-msg {
          font-size: 0.75rem; color: #64748b; font-weight: 500;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;
        }
        .fl-chat-item__unread {
          min-width: 18px; padding: 0 5px; height: 18px; background: #ef4444; color: #fff;
          font-size: 0.65rem; font-weight: 800; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
        }
        
        .fl-chat-window { flex: 1; display: flex; flex-direction: column; background: #fff; }
        .fl-chat-window__header { padding: 0.75rem 1.25rem; border-bottom: 1px solid #e5edf5; display: flex; align-items: center; gap: 0.85rem; }
        .fl-chat-window__avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: var(--gradient-primary); color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; position: relative;
        }
        .fl-chat-window__online {
          position: absolute; bottom: 0; right: -2px; width: 8px; height: 8px;
          border-radius: 50%; background: #22c55e; border: 2px solid #fff;
        }
        .fl-chat-window__name { font-size: 0.95rem; font-weight: 700; color: var(--color-primary); }
        .fl-chat-window__status { font-size: 0.72rem; color: #64748b; font-weight: 500; }
        .fl-chat-window__actions { margin-left: auto; display: flex; gap: 0.5rem; }
        
        .fl-chat-feed { flex: 1; padding: 1.5rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; background: #f8fafc; }
        .fl-msg { display: flex; max-width: 75%; }
        .fl-msg--own { align-self: flex-end; }
        .fl-msg__bubble {
          padding: 0.75rem 1rem; border-radius: 12px; font-size: 0.875rem; background: #fff;
          color: #1e293b; border: 1px solid #e2e8f0; position: relative;
          box-shadow: 0 2px 6px rgba(0,0,0,0.03);
        }
        .fl-msg--own .fl-msg__bubble {
          background: var(--color-primary); color: #fff; border: none;
        }
        .fl-msg__time {
          display: block; font-size: 0.65rem; margin-top: 0.4rem; opacity: 0.7; font-weight: 600;
        }
        
        .fl-chat-input { padding: 1rem; border-top: 1px solid #e5edf5; display: flex; align-items: center; gap: 0.75rem; }
        .fl-chat-input__attach { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: #64748b; }
      `}</style>
    </div>
  );
};

export default FreelancerMessages;
