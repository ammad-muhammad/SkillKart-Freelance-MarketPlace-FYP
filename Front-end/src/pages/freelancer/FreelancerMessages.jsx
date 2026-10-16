import { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare, FileText, Paperclip, Send, Package,
  Search, X, Check, CheckCheck, ChevronDown, PanelRight,
  ArrowLeft, Download, ExternalLink, Image as ImageIcon,
  User, Info
} from 'lucide-react';
import { messagesAPI } from '../../api/messages';
import { useAuth } from '../../hooks/useAuth';
import { useFreelancer } from '../../context/FreelancerContext';
import { uploadMessageAttachment, validateFile } from '../../utils/uploadHelper';
import CustomOfferCard from '../../Components/common/CustomOffer/CustomOfferCard';
import SendOfferModal from '../../Components/common/CustomOffer/SendOfferModal';
import ConfirmDialog from '../../Components/common/ConfirmDialog/ConfirmDialog';
import { offersAPI } from '../../api/offers';
import { apiErrorMessage } from '../../utils/gigOrderCheckout';
import ImageSourcePicker from '../../Components/common/ImageSourcePicker/ImageSourcePicker';
import { openExternal } from '../../utils/externalLink';
import Loader from '../../Components/common/Loader/Loader';
import './FreelancerMessages.css';

// ── Date Formatting Helpers ─────────────────────────────────────────
const formatMessageDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  return d.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

const formatChatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (isYesterday) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const FreelancerMessages = () => {
  const { user } = useAuth();
  const { showToast } = useFreelancer();

  // Core Data States
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'unread'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Custom Offer Modal States
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [withdrawTarget, setWithdrawTarget] = useState(null);
  const [offerBusy, setOfferBusy] = useState(false);

  // UI States
  const [showDetails, setShowDetails] = useState(false);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearch, setChatSearch] = useState('');
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);

  // Refs
  const chatFeedRef = useRef(null);
  const fileRef = useRef(null);
  const textareaRef = useRef(null);
  const isNearBottomRef = useRef(true);

  // Initial Fetch & Polling
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeChat) {
      isNearBottomRef.current = true;
      fetchMessages(activeChat._id);
      const interval = setInterval(() => fetchMessages(activeChat._id), 3000);
      return () => clearInterval(interval);
    }
  }, [activeChat]);

  // Feed Scroll Tracking
  useEffect(() => {
    if (chatFeedRef.current && isNearBottomRef.current) {
      chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
    }
  }, [messages]);

  // Textarea auto-grow
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [msgInput]);

  // Esc key for lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setLightboxImg(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFeedScroll = () => {
    const el = chatFeedRef.current;
    if (!el) return;
    const isNear = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    isNearBottomRef.current = isNear;
    setShowScrollBottom(!isNear);
  };

  const scrollToBottom = () => {
    if (chatFeedRef.current) {
      chatFeedRef.current.scrollTo({
        top: chatFeedRef.current.scrollHeight,
        behavior: 'smooth'
      });
      isNearBottomRef.current = true;
      setShowScrollBottom(false);
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await messagesAPI.getConversations();
      setError(null);
      setConversations(res.data.data);
      // Auto-open first conversation on desktop
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
    if (e) e.preventDefault();
    if (!msgInput.trim() || !activeChat) return;

    const recipient = activeChat.participants.find(p => p._id !== user._id);
    const content = msgInput.trim();
    setMsgInput('');

    try {
      await messagesAPI.sendMessage(recipient._id, content);
      fetchMessages(activeChat._id);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send message', 'error');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAttach = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeChat) return;

    const check = validateFile(file, {
      maxSizeMB: 10,
      allowedTypes: [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
    });
    if (!check.valid) {
      showToast(check.error, 'error');
      return;
    }

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

  const confirmWithdraw = async () => {
    if (!withdrawTarget) return;
    setOfferBusy(true);
    try {
      await offersAPI.withdraw(withdrawTarget._id);
      showToast('Offer withdrawn.', 'success');
      setWithdrawTarget(null);
      if (activeChat) fetchMessages(activeChat._id);
    } catch (err) {
      showToast(apiErrorMessage(err, 'Could not withdraw the offer.'), 'error');
    } finally {
      setOfferBusy(false);
    }
  };

  // Filtered Conversations List
  const totalUnreadCount = useMemo(() => {
    return conversations.reduce((acc, c) => acc + (c.unreadCount?.[user._id] || 0), 0);
  }, [conversations, user._id]);

  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      const other = c.participants.find(p => p._id !== user._id);
      const fullName = `${other?.firstName || ''} ${other?.lastName || ''}`.toLowerCase();
      const matchesSearch = !search.trim() || fullName.includes(search.toLowerCase());
      const unread = c.unreadCount?.[user._id] || 0;
      const matchesTab = filterTab === 'all' || (filterTab === 'unread' && unread > 0);
      return matchesSearch && matchesTab;
    });
  }, [conversations, user._id, search, filterTab]);

  // Active Chat Participant
  const otherUser = useMemo(() => {
    if (!activeChat) return null;
    return activeChat.participants.find(p => p._id !== user._id);
  }, [activeChat, user._id]);

  const isOnline = useMemo(() => {
    if (!otherUser?.lastActive) return false;
    return new Date() - new Date(otherUser.lastActive) < 5 * 60 * 1000;
  }, [otherUser]);

  // Shared Attachments & Offers in Current Chat
  const sharedMedia = useMemo(() => {
    const list = [];
    messages.forEach(msg => {
      if (Array.isArray(msg.attachments)) {
        msg.attachments.forEach(att => {
          const a = typeof att === 'string' ? { url: att, name: 'Attachment' } : att;
          const isImg = /\.(png|jpe?g|webp|gif)$/i.test(a.url || '') || (a.mimeType || '').startsWith('image/');
          list.push({ ...a, isImg });
        });
      }
    });
    return list;
  }, [messages]);

  // Filter messages by chat search if active
  const displayedMessages = useMemo(() => {
    if (!chatSearch.trim()) return messages;
    return messages.filter(m => (m.content || '').toLowerCase().includes(chatSearch.toLowerCase()));
  }, [messages, chatSearch]);

  if (loading) {
    return <Loader text="Loading conversations..." fullScreen={true} />;
  }

  return (
    <div className="flm-page">
      {/* Fullscreen Edge-to-Edge Workspace */}
      <div className={`flm-workspace ${activeChat ? 'flm-workspace--chat-active' : ''}`}>
        
        {/* ============================================================
            PANE 1: CONVERSATIONS LIST
            ============================================================ */}
        <aside className="flm-pane-convos" aria-label="Conversations List">
          <div className="flm-convos-header">
            <div className="flm-convos-title-row">
              <h1 className="flm-convos-title">
                Messages
                {totalUnreadCount > 0 && (
                  <span className="flm-total-unread-badge" title={`${totalUnreadCount} unread message${totalUnreadCount > 1 ? 's' : ''}`}>
                    {totalUnreadCount}
                  </span>
                )}
              </h1>
            </div>

            {/* Search Input */}
            <div className="flm-search-wrap">
              <Search size={15} className="flm-search-icon" />
              <input
                type="text"
                placeholder="Search conversations..."
                className="flm-search-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                aria-label="Search conversations"
              />
              {search && (
                <button
                  type="button"
                  className="flm-search-clear"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Tabs (All / Unread) */}
            <div className="flm-filter-tabs">
              <button
                type="button"
                className={`flm-filter-tab ${filterTab === 'all' ? 'flm-filter-tab--active' : ''}`}
                onClick={() => setFilterTab('all')}
              >
                All <span className="flm-tab-count">({conversations.length})</span>
              </button>
              <button
                type="button"
                className={`flm-filter-tab ${filterTab === 'unread' ? 'flm-filter-tab--active' : ''}`}
                onClick={() => setFilterTab('unread')}
              >
                Unread {totalUnreadCount > 0 && <span className="flm-tab-count">({totalUnreadCount})</span>}
              </button>
            </div>
          </div>

          {/* Conversations Scroll List */}
          <div className="flm-convos-list" role="list">
            {error && (
              <div className="flm-list-error">
                {error}
                <button type="button" className="flm-retry-btn" onClick={fetchConversations}>
                  Retry
                </button>
              </div>
            )}

            {!error && filteredConversations.length === 0 && (
              <div className="flm-list-empty">
                <MessageSquare size={24} style={{ opacity: 0.4 }} />
                <span>{search ? 'No conversations match your search.' : 'No conversations yet.'}</span>
              </div>
            )}

            {filteredConversations.map(chat => {
              const chatOther = chat.participants.find(p => p._id !== user._id);
              const unread = chat.unreadCount?.[user._id] || 0;
              const isActive = activeChat?._id === chat._id;
              const online = chatOther?.lastActive && (new Date() - new Date(chatOther.lastActive) < 5 * 60 * 1000);

              return (
                <div
                  key={chat._id}
                  role="listitem"
                  tabIndex={0}
                  className={`flm-convo-row ${isActive ? 'flm-convo-row--active' : ''} ${unread > 0 ? 'flm-convo-row--unread' : ''}`}
                  onClick={() => setActiveChat(chat)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveChat(chat);
                    }
                  }}
                >
                  <div className="flm-avatar-wrap">
                    {chatOther?.profilePicture ? (
                      <img src={chatOther.profilePicture} alt="" className="flm-avatar-img" loading="lazy" />
                    ) : (
                      <div className="flm-avatar-fallback">
                        {chatOther?.firstName?.charAt(0) || '?'}
                      </div>
                    )}
                    {online && <span className="flm-online-dot" title="Active now" />}
                  </div>

                  <div className="flm-convo-content">
                    <div className="flm-convo-top">
                      <h4 className="flm-convo-name">
                        {chatOther?.firstName} {chatOther?.lastName}
                      </h4>
                      <span className="flm-convo-time">
                        {formatChatTime(chat.lastMessage?.createdAt || chat.updatedAt)}
                      </span>
                    </div>

                    <div className="flm-convo-bottom">
                      <p className="flm-convo-last-msg">
                        {chat.lastMessage?.content || 'No messages yet'}
                      </p>
                      {unread > 0 && (
                        <span className="flm-unread-pill" aria-label={`${unread} unread`}>
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* ============================================================
            PANE 2: ACTIVE CHAT WINDOW
            ============================================================ */}
        <main className="flm-pane-chat" aria-label="Chat Conversation">
          {activeChat ? (
            <>
              {/* Header */}
              <header className="flm-chat-header">
                <div className="flm-chat-header-left">
                  <button
                    type="button"
                    className="flm-back-btn"
                    onClick={() => setActiveChat(null)}
                    aria-label="Back to conversations list"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <div className="flm-avatar-wrap" style={{ width: 40, height: 40 }}>
                    {otherUser?.profilePicture ? (
                      <img src={otherUser.profilePicture} alt="" className="flm-avatar-img" />
                    ) : (
                      <div className="flm-avatar-fallback" style={{ fontSize: 14 }}>
                        {otherUser?.firstName?.charAt(0) || '?'}
                      </div>
                    )}
                    {isOnline && <span className="flm-online-dot" />}
                  </div>

                  <div className="flm-header-user-info">
                    <div className="flm-header-name-row">
                      <h2 className="flm-header-name">
                        {otherUser?.firstName} {otherUser?.lastName}
                      </h2>
                      {otherUser?.role && (
                        <span className={`flm-role-pill flm-role-pill--${otherUser.role}`}>
                          {otherUser.role}
                        </span>
                      )}
                    </div>
                    <span className="flm-header-status">
                      <span className={`flm-status-dot-inline ${isOnline ? 'flm-status-dot-inline--active' : ''}`} />
                      {isOnline ? 'Active now' : 'Offline'}
                    </span>
                  </div>
                </div>

                {/* Header Actions */}
                <div className="flm-chat-header-actions">
                  {otherUser?.role === 'client' && (
                    <button
                      type="button"
                      className="flm-send-offer-btn"
                      onClick={() => setShowOfferModal(true)}
                      title="Send a custom offer"
                    >
                      <Package size={14} />
                      <span>Send Offer</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className={`flm-header-icon-btn ${showChatSearch ? 'flm-header-icon-btn--active' : ''}`}
                    onClick={() => {
                      setShowChatSearch(prev => !prev);
                      if (showChatSearch) setChatSearch('');
                    }}
                    title="Search messages in this chat"
                    aria-label="Search messages"
                  >
                    <Search size={16} />
                  </button>

                  <button
                    type="button"
                    className={`flm-header-icon-btn ${showDetails ? 'flm-header-icon-btn--active' : ''}`}
                    onClick={() => setShowDetails(prev => !prev)}
                    title={showDetails ? 'Hide conversation details' : 'View conversation details'}
                    aria-label="Toggle details pane"
                  >
                    <PanelRight size={17} />
                  </button>
                </div>
              </header>

              {/* In-Chat Search Bar */}
              {showChatSearch && (
                <div className="flm-inchat-search">
                  <Search size={14} style={{ color: '#94A3B8' }} />
                  <input
                    type="text"
                    placeholder="Search messages in this conversation..."
                    value={chatSearch}
                    onChange={e => setChatSearch(e.target.value)}
                    className="flm-inchat-search-input"
                    autoFocus
                  />
                  {chatSearch && (
                    <button
                      type="button"
                      onClick={() => setChatSearch('')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                      aria-label="Clear chat search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              )}

              {/* Message Feed Area */}
              <div
                className="flm-chat-feed"
                ref={chatFeedRef}
                onScroll={handleFeedScroll}
                role="log"
                aria-live="polite"
              >
                {displayedMessages.map((msg, index) => {
                  const isSent = msg.sender?._id === user._id;
                  const prevMsg = displayedMessages[index - 1];
                  const showDateDivider = !prevMsg || formatMessageDate(msg.createdAt) !== formatMessageDate(prevMsg.createdAt);
                  const isReadByOther = Array.isArray(msg.readBy) && otherUser && msg.readBy.some(id => String(id) === String(otherUser._id));

                  return (
                    <div key={msg._id} style={{ display: 'flex', flexDirection: 'column' }}>
                      {/* Date Divider Pill */}
                      {showDateDivider && (
                        <div className="flm-date-divider">
                          <span className="flm-date-pill">
                            {formatMessageDate(msg.createdAt)}
                          </span>
                        </div>
                      )}

                      {/* Custom Offer Card Message */}
                      {msg.type === 'custom_offer' ? (
                        <div className={`flm-offer-msg ${isSent ? 'flm-offer-msg--own' : ''}`}>
                          <CustomOfferCard
                            offer={msg.customOfferId}
                            viewerRole="freelancer"
                            busy={offerBusy}
                            onWithdraw={setWithdrawTarget}
                          />
                          <div className={`flm-msg-meta ${isSent ? 'flm-msg-meta--sent' : 'flm-msg-meta--received'}`}>
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isSent && (
                              isReadByOther ? (
                                <CheckCheck size={14} className="flm-tick-read" title="Seen" />
                              ) : (
                                <Check size={13} className="flm-tick-sent" title="Sent" />
                              )
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Standard Message Bubble */
                        <div className={`flm-msg-row ${isSent ? 'flm-msg-row--sent' : 'flm-msg-row--received'}`}>
                          {!isSent && (
                            <div className="flm-msg-sender-avatar">
                              {otherUser?.profilePicture ? (
                                <img src={otherUser.profilePicture} alt="" />
                              ) : (
                                <div className="flm-msg-sender-avatar-fallback">
                                  {otherUser?.firstName?.charAt(0) || '?'}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flm-msg-bubble-wrap">
                            <div className={isSent ? 'flm-msg-bubble--sent' : 'flm-msg-bubble--received'}>
                              {/* Attachments */}
                              {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                                <div className="flm-attachments-list">
                                  {msg.attachments.map((att, i) => {
                                    const a = typeof att === 'string' ? { url: att, name: 'Attachment' } : att;
                                    const isImg = /\.(png|jpe?g|webp|gif)$/i.test(a.url || '') || (a.mimeType || '').startsWith('image/');

                                    return isImg ? (
                                      <div
                                        key={i}
                                        className="flm-att-img-wrap"
                                        onClick={() => setLightboxImg(a.url)}
                                        title="Click to view full image"
                                      >
                                        <img src={a.url} alt={a.name} className="flm-att-img" loading="lazy" />
                                      </div>
                                    ) : (
                                      <a
                                        key={i}
                                        href={a.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flm-att-file-pill"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          openExternal(a.url);
                                        }}
                                      >
                                        <FileText size={15} style={{ flexShrink: 0 }} />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {a.name || 'Document'}
                                        </span>
                                      </a>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Message Text Content */}
                              {msg.content}
                            </div>

                            {/* Timestamp & Read Tick */}
                            <div className={`flm-msg-meta ${isSent ? 'flm-msg-meta--sent' : 'flm-msg-meta--received'}`}>
                              <span>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isSent && (
                                isReadByOther ? (
                                  <CheckCheck size={14} className="flm-tick-read" title="Seen" />
                                ) : (
                                  <Check size={13} className="flm-tick-sent" title="Sent" />
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Scroll to bottom button */}
              {showScrollBottom && (
                <button
                  type="button"
                  className="flm-scroll-bottom-btn"
                  onClick={scrollToBottom}
                  aria-label="Scroll to newest messages"
                  title="Scroll to bottom"
                >
                  <ChevronDown size={18} />
                </button>
              )}

              {/* Message Composer Bar */}
              <form className="flm-composer-bar" onSubmit={handleSendMessage}>
                <ImageSourcePicker
                  ref={fileRef}
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleAttach}
                />
                
                <button
                  type="button"
                  className="flm-attach-btn"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  title="Attach file or image"
                  aria-label="Attach file"
                >
                  {uploading ? <Loader size="sm" text="" /> : <Paperclip size={18} />}
                </button>

                <div className="flm-textarea-wrap">
                  <textarea
                    ref={textareaRef}
                    placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                    value={msgInput}
                    onChange={e => setMsgInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flm-textarea"
                    rows={1}
                    aria-label="Type message"
                  />
                </div>

                <button
                  type="submit"
                  className="flm-send-btn"
                  disabled={!msgInput.trim()}
                  title="Send message"
                  aria-label="Send message"
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          ) : (
            /* Empty State when no conversation is selected */
            <div className="flm-chat-empty-center">
              <div className="flm-empty-card">
                <div className="flm-empty-icon-wrap">
                  <MessageSquare size={30} />
                </div>
                <h3 className="flm-empty-title">Select a Conversation</h3>
                <p className="flm-empty-desc">
                  Choose a chat from the left sidebar to start messaging your clients or review project updates.
                </p>
              </div>
            </div>
          )}
        </main>

        {/* ============================================================
            PANE 3: CONVERSATION DETAILS (Right, Collapsible)
            ============================================================ */}
        {showDetails && activeChat && otherUser && (
          <aside className="flm-pane-details" aria-label="Conversation Details">
            <div className="flm-details-header">
              <h3 className="flm-details-title">Details</h3>
              <button
                type="button"
                className="flm-details-close-btn"
                onClick={() => setShowDetails(false)}
                aria-label="Close details pane"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flm-details-content">
              {/* User Profile Card */}
              <div className="flm-details-user-card">
                <div className="flm-details-avatar">
                  {otherUser?.profilePicture ? (
                    <img src={otherUser.profilePicture} alt="" />
                  ) : (
                    <div className="flm-details-avatar-fallback">
                      {otherUser?.firstName?.charAt(0) || '?'}
                    </div>
                  )}
                  {isOnline && <span className="flm-online-dot" />}
                </div>

                <h4 className="flm-details-user-name">
                  {otherUser?.firstName} {otherUser?.lastName}
                </h4>

                <span className="flm-details-online-status">
                  <span className={`flm-status-dot-inline ${isOnline ? 'flm-status-dot-inline--active' : ''}`} />
                  {isOnline ? 'Active now' : 'Offline'}
                </span>

                <a
                  href={`/clients/${otherUser._id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flm-details-profile-link"
                  onClick={(e) => {
                    e.preventDefault();
                    openExternal(`/clients/${otherUser._id}`);
                  }}
                >
                  <User size={13} />
                  <span>View Public Profile</span>
                </a>
              </div>

              {/* Shared Files & Media */}
              <div className="flm-details-section">
                <h4 className="flm-details-sec-title">
                  Shared Media ({sharedMedia.filter(m => m.isImg).length})
                </h4>
                {sharedMedia.filter(m => m.isImg).length > 0 ? (
                  <div className="flm-details-media-grid">
                    {sharedMedia.filter(m => m.isImg).slice(0, 6).map((img, idx) => (
                      <div
                        key={idx}
                        className="flm-details-media-thumb"
                        onClick={() => setLightboxImg(img.url)}
                      >
                        <img src={img.url} alt="" loading="lazy" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>
                    No media shared yet.
                  </span>
                )}
              </div>

              <div className="flm-details-section">
                <h4 className="flm-details-sec-title">
                  Shared Files ({sharedMedia.filter(m => !m.isImg).length})
                </h4>
                {sharedMedia.filter(m => !m.isImg).length > 0 ? (
                  <div className="flm-details-files-list">
                    {sharedMedia.filter(m => !m.isImg).slice(0, 5).map((file, idx) => (
                      <a
                        key={idx}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flm-details-file-item"
                        onClick={(e) => {
                          e.preventDefault();
                          openExternal(file.url);
                        }}
                      >
                        <FileText size={14} style={{ color: '#10B981', flexShrink: 0 }} />
                        <span className="flm-details-file-name">{file.name || 'Document'}</span>
                        <Download size={12} style={{ color: '#94A3B8', flexShrink: 0 }} />
                      </a>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>
                    No files shared yet.
                  </span>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Lightbox Modal for Image Attachments */}
      {lightboxImg && (
        <div
          className="flm-lightbox-backdrop"
          onClick={() => setLightboxImg(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="flm-lightbox-content" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className="flm-lightbox-close"
              onClick={() => setLightboxImg(null)}
              aria-label="Close image lightbox"
            >
              <X size={18} />
            </button>
            <img src={lightboxImg} alt="Attachment Full View" className="flm-lightbox-img" />
          </div>
        </div>
      )}

      {/* Custom Offer Modal */}
      <SendOfferModal
        open={showOfferModal}
        conversationId={activeChat?._id}
        clientName={(() => {
          const other = activeChat?.participants?.find(p => p._id !== user._id);
          return other ? `${other.firstName || ''} ${other.lastName || ''}`.trim() : '';
        })()}
        showToast={showToast}
        onSent={() => activeChat && fetchMessages(activeChat._id)}
        onClose={() => setShowOfferModal(false)}
      />

      {/* Withdraw Offer Confirmation Modal */}
      <ConfirmDialog
        open={!!withdrawTarget}
        title="Withdraw this offer?"
        message={`"${withdrawTarget?.title || ''}" will no longer be available for the client to accept. You can send a new one any time.`}
        confirmLabel="Withdraw"
        cancelLabel="Keep Offer"
        loading={offerBusy}
        onConfirm={confirmWithdraw}
        onClose={() => setWithdrawTarget(null)}
      />
    </div>
  );
};

export default FreelancerMessages;
