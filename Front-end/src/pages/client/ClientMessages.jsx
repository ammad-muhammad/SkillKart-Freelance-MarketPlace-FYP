import { useState } from 'react';
import { useClient } from '../../context/ClientContext';
import './ClientDashboard.css';

const MOCK_CHATS = [
  { id: 1, name: 'Alex Rivera', lastMsg: 'I have updated the design as requested.', time: '10:30 AM', online: true, unread: 2 },
  { id: 2, name: 'Sophia Chen', lastMsg: 'What is the deadline for the logo?', time: 'Yesterday', online: false, unread: 0 },
  { id: 3, name: 'Jordan Smith', lastMsg: 'Thanks, I will start working on it!', time: 'Yesterday', online: true, unread: 0 },
  { id: 4, name: 'Lisa Ray', lastMsg: 'The invoice has been sent.', time: 'Monday', online: false, unread: 0 },
];

const ClientMessages = () => {
  const { profile } = useClient();
  const [activeChat, setActiveChat] = useState(MOCK_CHATS[0]);
  const [msgInput, setMsgInput] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, sender: 'Alex Rivera', text: 'Hi Sarah, I have some updates on the project.', time: '10:15 AM' },
    { id: 2, sender: 'You', text: 'Great! Can you share the latest mockups?', time: '10:20 AM' },
    { id: 3, sender: 'Alex Rivera', text: 'Yes, just sent them over.', time: '10:25 AM' },
    { id: 4, sender: 'Alex Rivera', text: 'I have updated the design as requested.', time: '10:30 AM' },
  ]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!msgInput.trim()) return;
    setMessages(prev => [...prev, { id: Date.now(), sender: 'You', text: msgInput, time: 'Now' }]);
    setMsgInput('');
  };

  return (
    <div className="cl-messages-page">
      <div className="cl-page-header">
        <h1 className="cl-page-title">Messages</h1>
        <p className="cl-page-sub">Chat with your freelancers and manage project communications.</p>
      </div>

      <div className="cl-messages-layout animate-fade-in">
        {/* Chat List */}
        <aside className="cl-chat-list">
          <div className="cl-chat-list__search">
            <input type="text" placeholder="Search conversations..." className="cl-input cl-input--sm" />
          </div>
          <div className="cl-chat-list__items">
            {MOCK_CHATS.map(chat => (
              <div 
                key={chat.id} 
                className={`cl-chat-item${activeChat.id === chat.id ? ' cl-chat-item--active' : ''}`}
                onClick={() => setActiveChat(chat)}
              >
                <div className="cl-chat-item__avatar">
                  <span>{chat.name.charAt(0)}</span>
                  {chat.online && <div className="cl-chat-item__online" />}
                </div>
                <div className="cl-chat-item__info">
                  <div className="cl-chat-item__top">
                    <h4 className="cl-chat-item__name">{chat.name}</h4>
                    <span className="cl-chat-item__time">{chat.time}</span>
                  </div>
                  <p className="cl-chat-item__last-msg">{chat.lastMsg}</p>
                </div>
                {chat.unread > 0 && <span className="cl-chat-item__unread">{chat.unread}</span>}
              </div>
            ))}
          </div>
        </aside>

        {/* Chat window */}
        <main className="cl-chat-window">
          {/* Chat Header */}
          <header className="cl-chat-window__header">
            <div className="cl-chat-window__avatar">
              <span>{activeChat.name.charAt(0)}</span>
              {activeChat.online && <div className="cl-chat-window__online" />}
            </div>
            <div>
              <h4 className="cl-chat-window__name">{activeChat.name}</h4>
              <span className="cl-chat-window__status">{activeChat.online ? 'Online' : 'Offline'}</span>
            </div>
            <div className="cl-chat-window__actions">
              <button className="cl-btn cl-btn--ghost cl-btn--sm">📞</button>
              <button className="cl-btn cl-btn--ghost cl-btn--sm">🎥</button>
            </div>
          </header>

          {/* Messages Feed */}
          <div className="cl-chat-feed">
            {messages.map(msg => (
              <div key={msg.id} className={`cl-msg${msg.sender === 'You' ? ' cl-msg--own' : ''}`}>
                <div className="cl-msg__bubble">
                  {msg.text}
                  <span className="cl-msg__time">{msg.time}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <form className="cl-chat-input" onSubmit={sendMessage}>
            <button type="button" className="cl-chat-input__attach">📎</button>
            <input 
              type="text" 
              placeholder="Type a message..." 
              value={msgInput}
              onChange={e => setMsgInput(e.target.value)}
              className="cl-input"
            />
            <button className="cl-btn cl-btn--primary">Send</button>
          </form>
        </main>
      </div>

      <style>{`
        .cl-messages-layout {
          display: flex;
          height: calc(100vh - 250px);
          min-height: 500px;
          background: #fff;
          border-radius: 16px;
          border: 1px solid #e5edf5;
          box-shadow: 0 4px 20px rgba(4,46,76,0.06);
          overflow: hidden;
        }
        
        /* Chat List */
        .cl-chat-list {
          width: 320px; border-right: 1px solid #e5edf5; background: #f8fafc;
          display: flex; flex-direction: column;
        }
        .cl-chat-list__search { padding: 1rem; border-bottom: 1px solid #eaeff5; }
        .cl-chat-list__items { flex: 1; overflow-y: auto; }
        .cl-chat-item {
          display: flex; align-items: center; gap: 0.75rem; padding: 1rem;
          cursor: pointer; border-bottom: 1px solid #f0f4f8; position: relative;
        }
        .cl-chat-item:hover { background: #f1f5f9; }
        .cl-chat-item--active { background: #fff !important; }
        .cl-chat-item__avatar {
          width: 42px; height: 42px; border-radius: 50%;
          background: var(--gradient-primary); color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; position: relative; flex-shrink: 0;
        }
        .cl-chat-item__online {
          position: absolute; bottom: 2px; right: -2px; width: 10px; height: 10px;
          border-radius: 50%; background: #22c55e; border: 2px solid #fff;
        }
        .cl-chat-item__info { min-width: 0; flex: 1; }
        .cl-chat-item__top { display: flex; justify-content: space-between; align-items: center; }
        .cl-chat-item__name { font-size: 0.875rem; font-weight: 700; color: var(--color-primary); }
        .cl-chat-item__time { font-size: 0.7rem; color: #94a3b8; }
        .cl-chat-item__last-msg {
          font-size: 0.75rem; color: #64748b; font-weight: 500;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;
        }
        .cl-chat-item__unread {
          min-width: 18px; padding: 0 5px; height: 18px; background: #ef4444; color: #fff;
          font-size: 0.65rem; font-weight: 800; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
        }
        
        /* Chat Window */
        .cl-chat-window { flex: 1; display: flex; flex-direction: column; background: #fff; }
        .cl-chat-window__header { padding: 0.75rem 1.25rem; border-bottom: 1px solid #e5edf5; display: flex; align-items: center; gap: 0.85rem; }
        .cl-chat-window__avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: var(--gradient-primary); color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; position: relative;
        }
        .cl-chat-window__online {
          position: absolute; bottom: 0; right: -2px; width: 8px; height: 8px;
          border-radius: 50%; background: #22c55e; border: 2px solid #fff;
        }
        .cl-chat-window__name { font-size: 0.95rem; font-weight: 700; color: var(--color-primary); }
        .cl-chat-window__status { font-size: 0.72rem; color: #64748b; font-weight: 500; }
        .cl-chat-window__actions { margin-left: auto; display: flex; gap: 0.5rem; }
        
        .cl-chat-feed { flex: 1; padding: 1.5rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; background: #f8fafc; }
        .cl-msg { display: flex; max-width: 75%; }
        .cl-msg--own { align-self: flex-end; }
        .cl-msg__bubble {
          padding: 0.75rem 1rem; border-radius: 12px; font-size: 0.875rem; background: #fff;
          color: #1e293b; border: 1px solid #e2e8f0; position: relative;
          box-shadow: 0 2px 6px rgba(0,0,0,0.03);
        }
        .cl-msg--own .cl-msg__bubble {
          background: var(--color-primary); color: #fff; border: none;
        }
        .cl-msg__time {
          display: block; font-size: 0.65rem; margin-top: 0.4rem; opacity: 0.7; font-weight: 600;
        }
        
        .cl-chat-input { padding: 1rem; border-top: 1px solid #e5edf5; display: flex; align-items: center; gap: 0.75rem; }
        .cl-chat-input__attach { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: #64748b; }
      `}</style>
    </div>
  );
};

export default ClientMessages;
