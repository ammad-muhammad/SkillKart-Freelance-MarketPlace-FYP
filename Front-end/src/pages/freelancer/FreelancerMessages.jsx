import Loader from '../../Components/common/Loader/Loader';
import { useState, useEffect, useRef } from 'react';
import { messagesAPI } from '../../api/messages';
import { useAuth } from '../../hooks/useAuth';
import { useFreelancer } from '../../context/FreelancerContext';
import { uploadMessageAttachment, validateFile } from '../../utils/uploadHelper';
import { MessageSquare, FileText, Loader2, Paperclip, Send } from 'lucide-react';
import EmptyState from '../../Components/common/EmptyState/EmptyState';
import ImageSourcePicker from '../../Components/common/ImageSourcePicker/ImageSourcePicker';
import { openExternal } from '../../utils/externalLink';
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
  // Tracks whether the user is currently pinned to the bottom of the feed.
  // The poll below refreshes `messages` every 3s even when nothing changed,
  // so auto-scrolling unconditionally would yank the user back down every
  // time they scroll up to read older messages.
  const isNearBottomRef = useRef(true);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeChat) {
      isNearBottomRef.current = true; // opening a chat always starts pinned to the latest message
      fetchMessages(activeChat._id);
      const interval = setInterval(() => fetchMessages(activeChat._id), 3000);
      return () => clearInterval(interval);
    }
  }, [activeChat]);

  useEffect(() => {
    if (chatFeedRef.current && isNearBottomRef.current) {
      chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFeedScroll = () => {
    const el = chatFeedRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const fetchConversations = async () => {
    try {
      const res = await messagesAPI.getConversations();
      setError(null);
      setConversations(res.data.data);
      // Auto-open the first conversation on desktop only. On mobile the layout is
      // single-pane, so we leave the user on the conversation LIST until they tap one.
      if (!activeChat && res.data.data.length > 0 && window.innerWidth > 768) {
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

  if (loading) return <Loader text="Loading chats..." fullScreen={true} />;

  return (
    <div className="fl-messages-page">
      <div className="fl-page-header">
        <h1 className="fl-page-title">Direct Messages</h1>
        <p className="fl-page-sub">Communicate with your clients and agencies.</p>
      </div>

      <div className={`fl-messages-layout animate-fade-in${activeChat ? ' fl-messages-layout--chat-open' : ''}`}>
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
              <div style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--color-error)', textAlign: 'center' }}>
                {error} <button onClick={fetchConversations} style={{ display: 'block', margin: '0.5rem auto 0', textDecoration: 'underline' }}>Retry</button>
              </div>
            )}
            {!error && filteredConversations.length === 0 && (
              <div style={{ padding: '2rem 1rem', fontSize: '0.82rem', color: 'var(--color-text-light)', textAlign: 'center' }}>
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
                      <img src={otherUser.profilePicture} alt="" loading="lazy" />
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
                      <button className="fl-chat-back" onClick={() => setActiveChat(null)} aria-label="Back to conversations">‹</button>
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
              <div className="fl-chat-feed" ref={chatFeedRef} onScroll={handleFeedScroll}>
                {messages.map(msg => (
                  <div key={msg._id} className={`fl-msg${msg.sender._id === user._id ? ' fl-msg--own' : ''}`}>
                    <div className="fl-msg__bubble">
                      {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                        <div className="fl-msg__attachments">
                          {msg.attachments.map((att, i) => {
                            const a = typeof att === 'string' ? { url: att, name: 'Attachment' } : att;
                            const isImg = /\.(png|jpe?g|webp|gif)$/i.test(a.url || '') || (a.mimeType || '').startsWith('image/');
                            return isImg ? (
                              <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.preventDefault(); openExternal(a.url); }}>
                                <img src={a.url} alt={a.name} className="fl-msg__att-img" loading="lazy" />
                              </a>
                            ) : (
                              <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="fl-msg__att-file" onClick={(e) => { e.preventDefault(); openExternal(a.url); }}>
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
                <ImageSourcePicker
                  ref={fileRef}
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
                  {uploading ? <Loader2 size={18} className="spin" /> : <Paperclip size={18} />}
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
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-secondary)' }}>
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
          background: var(--color-white);
          border-radius: 16px;
          border: 1px solid rgba(183, 201, 226, 0.35);
          box-shadow: 0 4px 20px rgba(4,46,76,0.06);
          overflow: hidden;
        }

        .fl-chat-list {
          width: 320px; border-right: 1px solid rgba(183, 201, 226, 0.35); background: var(--color-secondary);
          display: flex; flex-direction: column;
        }
        .fl-chat-list__search { padding: 1rem; border-bottom: 1px solid rgba(183, 201, 226, 0.25); }
        .fl-chat-list__items { flex: 1; overflow-y: auto; }
        .fl-chat-item {
          display: flex; align-items: center; gap: 0.75rem; padding: 1rem;
          cursor: pointer; border-bottom: 1px solid rgba(183, 201, 226, 0.2); position: relative;
        }
        .fl-chat-item:hover { background: rgba(183, 201, 226, 0.15); }
        .fl-chat-item--active { background: var(--color-white) !important; }
        .fl-chat-item__avatar {
          width: 42px; height: 42px; border-radius: 50%;
          background: var(--gradient-primary); color: var(--color-white);
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; position: relative; flex-shrink: 0;
          overflow: hidden;
        }
        .fl-chat-item__avatar img { width: 100%; height: 100%; object-fit: cover; }
        .fl-chat-item__online {
          position: absolute; bottom: 2px; right: -2px; width: 10px; height: 10px;
          border-radius: 50%; background: var(--color-success); border: 2px solid var(--color-white);
        }
        .fl-chat-item__info { min-width: 0; flex: 1; }
        .fl-chat-item__top { display: flex; justify-content: space-between; align-items: center; }
        .fl-chat-item__name { font-size: 0.875rem; font-weight: 700; color: var(--color-primary); }
        .fl-chat-item__time { font-size: 0.7rem; color: var(--color-text-light); }
        .fl-chat-item__last-msg {
          font-size: 0.75rem; color: var(--color-text-mid); font-weight: 500;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;
        }
        .fl-chat-item__unread {
          min-width: 18px; padding: 0 5px; height: 18px; background: var(--color-error); color: var(--color-white);
          font-size: 0.65rem; font-weight: 800; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
        }

        .fl-chat-window { flex: 1; display: flex; flex-direction: column; background: var(--color-white); }
        .fl-chat-window__header { padding: 0.75rem 1.25rem; border-bottom: 1px solid rgba(183, 201, 226, 0.35); display: flex; align-items: center; gap: 0.85rem; }
        .fl-chat-window__avatar {
          width: 45px; height: 45px; border-radius: 50%; background: rgba(183, 201, 226, 0.35);
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
          background-color: var(--color-text-light);
          border: 2px solid var(--color-white);
          border-radius: 50%;
        }
        .fl-chat-status-dot.active { background-color: var(--color-success); }
        .fl-chat-window__online {
          position: absolute; bottom: 0; right: -2px; width: 8px; height: 8px;
          border-radius: 50%; background: var(--color-success); border: 2px solid var(--color-white);
        }
        .fl-chat-window__name { font-size: 0.95rem; font-weight: 700; color: var(--color-primary); }
        .fl-chat-window__status { font-size: 0.72rem; color: var(--color-text-mid); font-weight: 500; }
        .fl-chat-window__actions { margin-left: auto; display: flex; gap: 0.5rem; }

        .fl-chat-feed { flex: 1; padding: 1.5rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; background: var(--color-secondary); }
        .fl-msg { display: flex; max-width: 75%; }
        .fl-msg--own { align-self: flex-end; }
        .fl-msg__bubble {
          padding: 0.75rem 1rem; border-radius: 12px; font-size: 0.875rem; background: var(--color-white);
          color: var(--color-text-dark); border: 1px solid rgba(183, 201, 226, 0.35); position: relative;
          box-shadow: 0 2px 6px rgba(4, 46, 76, 0.05);
        }
        .fl-msg--own .fl-msg__bubble {
          background: var(--color-primary); color: var(--color-white); border: none;
        }
        .fl-msg__time {
          display: block; font-size: 0.65rem; margin-top: 0.4rem; opacity: 0.7; font-weight: 600;
        }

        .fl-chat-input { padding: 1rem; border-top: 1px solid rgba(183, 201, 226, 0.35); display: flex; align-items: center; gap: 0.75rem; }
        .fl-chat-input__attach { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--color-text-mid); }
        .fl-chat-input__attach:disabled { cursor: wait; }
        .fl-msg__attachments { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 0.4rem; }
        .fl-msg__att-img { max-width: 200px; max-height: 200px; border-radius: 8px; display: block; }
        .fl-msg__att-file {
          display: inline-block; padding: 0.4rem 0.7rem; background: rgba(4, 46, 76, 0.06);
          border-radius: 8px; font-size: 0.8rem; font-weight: 600; text-decoration: none; color: inherit;
        }
        .fl-msg--own .fl-msg__att-file { background: rgba(255,255,255,0.2); }

        /* Mobile back button — hidden on desktop (two-pane view). */
        .fl-chat-back {
          display: none;
          background: none; border: none; cursor: pointer;
          font-size: 1.75rem; line-height: 1; color: var(--color-primary);
          padding: 0 0.25rem; margin-right: 0.25rem;
        }

        /* ── Mobile: single-pane messenger ──────────────────────────
           The desktop layout is a fixed 320px list + flexible chat window. On
           phones that squeezes the chat window off-screen. Instead show ONE pane
           at a time: the conversation list by default, and the chat window
           full-width once a chat is open (toggled by --chat-open + a back button). */
        @media (max-width: 768px) {
          .fl-messages-layout {
            height: calc(100vh - 190px);
            min-height: 420px;
          }
          .fl-chat-list {
            width: 100%;
            border-right: none;
          }
          .fl-chat-window { display: none; }
          .fl-chat-back { display: block; }

          /* When a chat is open, swap: hide the list, show the window full-width. */
          .fl-messages-layout--chat-open .fl-chat-list { display: none; }
          .fl-messages-layout--chat-open .fl-chat-window { display: flex; }
        }
      `}</style>
    </div>
  );
};

export default FreelancerMessages;
