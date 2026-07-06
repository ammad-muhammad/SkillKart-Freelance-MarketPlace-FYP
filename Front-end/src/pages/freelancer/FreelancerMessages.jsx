import { useState, useEffect, useRef } from 'react';
import { messagesAPI } from '../../api/messages';
import { useAuth } from '../../hooks/useAuth';
import { useFreelancer } from '../../context/FreelancerContext';
import { uploadMessageAttachment, validateFile } from '../../utils/uploadHelper';
import { MessageSquare, FileText, Loader, Paperclip, Send } from 'lucide-react';
import EmptyState from '../../Components/common/EmptyState/EmptyState';
import '../client/ClientDashboard.css';

const FreelancerMessages = () => {
  const { user } = useAuth();
  const { showToast } = useFreelancer();
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const chatFeedRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat._id);
      const interval = setInterval(() => fetchMessages(activeChat._id), 3000);
      return () => clearInterval(interval);
    }
  }, [activeChat]);

  useEffect(() => {
    if (chatFeedRef.current) {
      chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await messagesAPI.getConversations();
      setError(null);
      setConversations(res.data.data);
      if (!activeChat && res.data.data.length > 0) {
        setActiveChat(res.data.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
      setError('Could not load your conversations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      const res = await messagesAPI.getMessages(chatId);
      setMessages(res.data.data);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!msgInput.trim() || !activeChat) return;

    const recipient = activeChat.participants.find(p => p._id !== user._id);
    try {
      await messagesAPI.sendMessage(recipient._id, msgInput);
      setMsgInput('');
      fetchMessages(activeChat._id);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send message', 'error');
    }
  };

  const handleAttach = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeChat) return;

    const check = validateFile(file, {
      maxSizeMB: 10,
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    });
    if (!check.valid) { showToast(check.error, 'error'); return; }

    const recipient = activeChat.participants.find(p => p._id !== user._id);
    setUploading(true);
    try {
      const att = await uploadMessageAttachment(file);
      await messagesAPI.sendMessage(recipient._id, att.name, [att]);
      fetchMessages(activeChat._id);
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not send attachment. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const filteredConversations = conversations.filter(c => {
    if (!search.trim()) return true;
    const other = c.participants.find(p => p._id !== user._id);
    return `${other?.firstName || ''} ${other?.lastName || ''}`.toLowerCase().includes(search.toLowerCase());
  });

  if (loading) return <div className="fl-loading">Loading chats...</div>;

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
            <input
              type="text"
              placeholder="Search chats..."
              className="fl-input fl-input--sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="fl-chat-list__items">
            {error && (
              <div style={{ padding: '1rem', fontSize: '0.8rem', color: '#ef4444', textAlign: 'center' }}>
                {error} <button onClick={fetchConversations} style={{ display: 'block', margin: '0.5rem auto 0', textDecoration: 'underline' }}>Retry</button>
              </div>
            )}
            {!error && filteredConversations.length === 0 && (
              <div style={{ padding: '2rem 1rem', fontSize: '0.82rem', color: '#94a3b8', textAlign: 'center' }}>
                {search ? 'No chats match your search.' : 'No conversations yet.'}
              </div>
            )}
            {filteredConversations.map(chat => {
              const otherUser = chat.participants.find(p => p._id !== user._id);
              const unread = chat.unreadCount?.[user._id] || 0;
              return (
                <div 
                  key={chat._id} 
                  className={`fl-chat-item${activeChat?._id === chat._id ? ' fl-chat-item--active' : ''}`}
                  onClick={() => setActiveChat(chat)}
                >
                  <div className="fl-chat-item__avatar">
                    {otherUser?.profilePicture ? (
                      <img src={otherUser.profilePicture} alt="" />
                    ) : (
                      <span>{otherUser?.firstName?.charAt(0)}</span>
                    )}
                  </div>
                  <div className="fl-chat-item__info">
                    <div className="fl-chat-item__top">
                      <h4 className="fl-chat-item__name">{otherUser?.firstName} {otherUser?.lastName}</h4>
                      <span className="fl-chat-item__time">
                        {chat.lastMessage ? new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="fl-chat-item__last-msg">{chat.lastMessage?.content || 'No messages yet'}</p>
                  </div>
                  {unread > 0 && <span className="fl-chat-item__unread">{unread}</span>}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Chat window */}
        <main className="fl-chat-window">
          {activeChat ? (
            <>
              {/* Chat Header */}
              <header className="fl-chat-window__header">
                {(() => {
                  const otherUser = activeChat.participants.find(p => p._id !== user._id);
                  const isOnline = otherUser?.lastActive && (new Date() - new Date(otherUser.lastActive) < 5 * 60 * 1000);
                  
                  return (
                    <>
                      <div className="fl-chat-window__avatar">
                        {otherUser?.profilePicture ? (
                          <img src={otherUser.profilePicture} alt="" />
                        ) : (
                          <span>{otherUser?.firstName?.charAt(0)}</span>
                        )}
                        {isOnline && <div className="fl-chat-status-dot active"></div>}
                      </div>
                      <div>
                        <h4 className="fl-chat-window__name">{otherUser?.firstName} {otherUser?.lastName}</h4>
                        <span className="fl-chat-window__status">
                          {isOnline ? 'Active' : 'Offline'}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </header>

              {/* Messages Feed */}
              <div className="fl-chat-feed" ref={chatFeedRef}>
                {messages.map(msg => (
                  <div key={msg._id} className={`fl-msg${msg.sender._id === user._id ? ' fl-msg--own' : ''}`}>
                    <div className="fl-msg__bubble">
                      {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                        <div className="fl-msg__attachments">
                          {msg.attachments.map((att, i) => {
                            const a = typeof att === 'string' ? { url: att, name: 'Attachment' } : att;
                            const isImg = /\.(png|jpe?g|webp|gif)$/i.test(a.url || '') || (a.mimeType || '').startsWith('image/');
                            return isImg ? (
                              <a key={i} href={a.url} target="_blank" rel="noopener noreferrer">
                                <img src={a.url} alt={a.name} className="fl-msg__att-img" />
                              </a>
                            ) : (
                              <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="fl-msg__att-file">
                                <FileText size={14} style={{ marginRight: '4px' }} /> {a.name || 'Document'}
                              </a>
                            );
                          })}
                        </div>
                      )}
                      {msg.content}
                      <span className="fl-msg__time">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <form className="fl-chat-input" onSubmit={handleSendMessage}>
                <input
                  type="file"
                  ref={fileRef}
                  style={{ display: 'none' }}
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleAttach}
                />
                <button
                  type="button"
                  className="fl-chat-input__attach"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  title="Attach a file"
                >
                  {uploading ? <Loader size={18} className="spin" /> : <Paperclip size={18} />}
                </button>
                <input
                  type="text"
                  placeholder="Start typing..."
                  value={msgInput}
                  onChange={e => setMsgInput(e.target.value)}
                  className="fl-input"
                />
                <button className="fl-btn fl-btn--primary">Send</button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
              <EmptyState 
                icon={MessageSquare}
                title="Your Messages"
                message="Select a conversation from the sidebar to start chatting."
              />
            </div>
          )}
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
          overflow: hidden;
        }
        .fl-chat-item__avatar img { width: 100%; height: 100%; object-fit: cover; }
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
          width: 45px; height: 45px; border-radius: 50%; background: #e5edf5; 
          display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--color-primary);
          position: relative;
        }
        .fl-chat-window__avatar img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
        
        .fl-chat-status-dot {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 12px;
          height: 12px;
          background-color: #94a3b8;
          border: 2px solid #fff;
          border-radius: 50%;
        }
        .fl-chat-status-dot.active { background-color: #22c55e; }
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
        .fl-chat-input__attach:disabled { cursor: wait; }
        .fl-msg__attachments { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 0.4rem; }
        .fl-msg__att-img { max-width: 200px; max-height: 200px; border-radius: 8px; display: block; }
        .fl-msg__att-file {
          display: inline-block; padding: 0.4rem 0.7rem; background: rgba(0,0,0,0.06);
          border-radius: 8px; font-size: 0.8rem; font-weight: 600; text-decoration: none; color: inherit;
        }
        .fl-msg--own .fl-msg__att-file { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
};

export default FreelancerMessages;
