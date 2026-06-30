import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import Navbar from '../../Components/common/Navbar/Navbar';
import Footer from '../../Components/common/Footer/Footer';
import './TaxonomyAdmin.css';

const NODE_TYPES = ['industry', 'category', 'profession', 'skill', 'technology', 'tool', 'concept'];
const RELATIONSHIP_TYPES = [
  'BELONGS_TO', 'PARENT', 'CHILD', 'RELATED_TO', 'USES', 'DEPENDS_ON', 
  'PREREQUISITE', 'PART_OF', 'SPECIALIZES_IN', 'ALIAS_OF', 'CERTIFIED_BY', 
  'SIMILAR_TO', 'SUCCESSOR', 'PREDECESSOR', 'USED_IN'
];

const TaxonomyAdmin = () => {
  const [nodes, setNodes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [allNodesList, setAllNodesList] = useState([]); // for relation selection dropdown

  // AI Proposals states
  const [activeTab, setActiveTab] = useState('nodes'); // 'nodes' | 'proposals'
  const [proposals, setProposals] = useState([]);
  const [proposalsCount, setProposalsCount] = useState(0);
  const [selectedProposal, setSelectedProposal] = useState(null);

  // Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNode, setNewNode] = useState({
    name: '', type: 'skill', description: '', weight: 1.0, icon: '', color: '', aliases: '', synonyms: ''
  });

  const [relationForm, setRelationForm] = useState({
    toId: '', type: 'BELONGS_TO', weight: 1.0, note: ''
  });

  const [mergeForm, setMergeForm] = useState({
    targetId: ''
  });

  const [reviewForm, setReviewForm] = useState({
    name: '', type: 'skill', description: '', aliases: '', synonyms: '', weight: 1.0, icon: '', color: '', relationships: []
  });

  const [editNode, setEditNode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
  };

  useEffect(() => {
    fetchNodes();
  }, [page, search, typeFilter]);

  useEffect(() => {
    // Fetch all nodes list for dropdowns (limit 300 to keep it manageable, sort by name)
    adminAPI.getNodes({ limit: 300 }).then(res => {
      if (res.data?.data?.nodes) {
        setAllNodesList(res.data.data.nodes);
      }
    });
    fetchProposals();
  }, []);

  useEffect(() => {
    if (activeTab === 'proposals') {
      fetchProposals();
    }
  }, [activeTab]);

  const fetchProposals = async () => {
    try {
      const res = await adminAPI.getProposals({ status: 'pending_review' });
      if (res.data?.data) {
        setProposals(res.data.data.proposals || []);
        setProposalsCount(res.data.data.total || 0);
      }
    } catch (err) {
      console.error('Failed fetching proposals count:', err);
    }
  };

  const fetchNodes = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getNodes({
        page,
        limit,
        q: search,
        type: typeFilter
      });
      if (res.data?.data) {
        setNodes(res.data.data.nodes);
        setTotal(res.data.data.total);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to fetch nodes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProposal = (p) => {
    setSelectedProposal(p);
    setReviewForm({
      name: p.name,
      type: p.type,
      description: p.description || '',
      aliases: p.aliases?.join(', ') || '',
      synonyms: p.synonyms?.join(', ') || '',
      weight: p.weight ?? 1.0,
      icon: p.icon || '',
      color: p.color || '',
      relationships: p.relationships || []
    });
  };

  const handleReviewProposal = async (status) => {
    if (!selectedProposal) return;
    setActionLoading(true);
    try {
      const payload = {
        status,
        name: reviewForm.name,
        type: reviewForm.type,
        description: reviewForm.description,
        aliases: reviewForm.aliases.split(',').map(s => s.trim()).filter(Boolean),
        synonyms: reviewForm.synonyms.split(',').map(s => s.trim()).filter(Boolean),
        weight: reviewForm.weight,
        icon: reviewForm.icon,
        color: reviewForm.color,
        relationships: reviewForm.relationships
      };

      await adminAPI.reviewProposal(selectedProposal._id, payload);
      showToast(`Proposal successfully ${status}!`);
      setSelectedProposal(null);
      fetchProposals();
      fetchNodes();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to review proposal', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateNode = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const formatted = {
        ...newNode,
        aliases: newNode.aliases.split(',').map(s => s.trim()).filter(Boolean),
        synonyms: newNode.synonyms.split(',').map(s => s.trim()).filter(Boolean),
      };
      await adminAPI.createNode(formatted);
      showToast('Node created successfully!');
      setShowCreateModal(false);
      setNewNode({ name: '', type: 'skill', description: '', weight: 1.0, icon: '', color: '', aliases: '', synonyms: '' });
      fetchNodes();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create node', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateNode = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const formatted = {
        ...editNode,
        aliases: typeof editNode.aliases === 'string' ? editNode.aliases.split(',').map(s => s.trim()).filter(Boolean) : editNode.aliases,
        synonyms: typeof editNode.synonyms === 'string' ? editNode.synonyms.split(',').map(s => s.trim()).filter(Boolean) : editNode.synonyms,
      };
      await adminAPI.updateNode(editNode._id, formatted);
      showToast('Node updated successfully!');
      setSelectedNode(null);
      setEditNode(null);
      fetchNodes();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update node', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateRelation = async (e) => {
    e.preventDefault();
    if (!relationForm.toId) {
      showToast('Please select a target node', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await adminAPI.createRelationship({
        from: selectedNode._id,
        to: relationForm.toId,
        type: relationForm.type,
        weight: relationForm.weight,
        note: relationForm.note
      });
      showToast('Relationship connected!');
      setRelationForm({ toId: '', type: 'BELONGS_TO', weight: 1.0, note: '' });
      // Refresh current node details (re-load selected node to show new edge)
      const res = await adminAPI.getNodes({ limit: 1, q: selectedNode.name });
      if (res.data?.data?.nodes?.length > 0) {
        setSelectedNode(res.data.data.nodes[0]);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to connect relationship', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnectRelation = async (rel) => {
    if (!window.confirm('Are you sure you want to disconnect this relationship?')) return;
    setActionLoading(true);
    try {
      await adminAPI.deleteRelationship({
        from: rel.from,
        to: rel.to,
        type: rel.type
      });
      showToast('Relationship deleted successfully');
      // Refresh current node details
      const res = await adminAPI.getNodes({ limit: 1, q: selectedNode.name });
      if (res.data?.data?.nodes?.length > 0) {
        setSelectedNode(res.data.data.nodes[0]);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete relationship', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMergeNodes = async (e) => {
    e.preventDefault();
    if (!mergeForm.targetId) {
      showToast('Please select target node for merge', 'error');
      return;
    }
    if (!window.confirm('WARNING: Merging will transfer all edges and mark this node as merged. This is irreversible. Proceed?')) return;
    setActionLoading(true);
    try {
      await adminAPI.mergeNodes({
        sourceId: selectedNode._id,
        targetId: mergeForm.targetId
      });
      showToast('Nodes merged successfully!');
      setSelectedNode(null);
      setMergeForm({ targetId: '' });
      fetchNodes();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to merge nodes', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="tax-admin-page">
      <Navbar />
      
      {toast.show && (
        <div className={`tax-toast tax-toast--${toast.type}`}>
          {toast.message}
        </div>
      )}

      <div className="tax-admin-hero">
        <div className="tax-admin-hero__content">
          <h1>Universal Skill Graph Management</h1>
          <p>Centralized platform-wide ontology engine. Connect nodes, build relations, manage aliases and merge duplicates with zero backend redeploys.</p>
        </div>
      </div>

      <div className="tax-tabs-container">
        <button 
          className={`tax-tab-btn ${activeTab === 'nodes' ? 'tax-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('nodes')}
        >
          🌐 Graph Editor
        </button>
        <button 
          className={`tax-tab-btn ${activeTab === 'proposals' ? 'tax-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('proposals')}
        >
          🤖 AI Proposals Queue
          {proposalsCount > 0 && <span className="badge">{proposalsCount}</span>}
        </button>
      </div>

      {activeTab === 'nodes' ? (
        <div className="tax-admin-container">
          <div className="tax-admin-left">
            <div className="tax-panel-header">
              <h2>Skill & Domain Nodes</h2>
              <button className="tax-btn-primary" onClick={() => setShowCreateModal(true)}>
                + Create Node
              </button>
            </div>

            <div className="tax-search-bar">
              <input 
                type="text" 
                placeholder="Search by name, alias or synonym..." 
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
              <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
                <option value="">All Node Types</option>
                {NODE_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>

            <div className="tax-nodes-list">
              {loading ? (
                <div className="tax-loader">Loading nodes...</div>
              ) : nodes.length === 0 ? (
                <div className="tax-empty">No nodes found. Create one to begin.</div>
              ) : (
                nodes.map(node => (
                  <div 
                    key={node._id} 
                    className={`tax-node-item ${selectedNode?._id === node._id ? 'tax-node-item--active' : ''}`}
                    onClick={() => { setSelectedNode(node); setEditNode(null); }}
                  >
                    <span className="tax-node-item__icon">{node.icon || '🔸'}</span>
                    <div className="tax-node-item__info">
                      <h4>{node.name}</h4>
                      <span className={`tax-badge tax-badge--${node.type}`}>{node.type}</span>
                    </div>
                    <span className="tax-node-item__weight">W: {node.weight}</span>
                  </div>
                ))
              )}
            </div>

            <div className="tax-pagination">
              <button 
                disabled={page <= 1} 
                onClick={() => setPage(page - 1)}
              >
                Prev
              </button>
              <span>Page {page} of {Math.ceil(total / limit) || 1}</span>
              <button 
                disabled={page >= Math.ceil(total / limit)} 
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>

          <div className="tax-admin-right">
            {!selectedNode ? (
              <div className="tax-details-placeholder">
                <div className="tax-details-placeholder__icon">🌐</div>
                <h3>Select a Node</h3>
                <p>Choose any domain, technology, tool or skill category from the left panel to inspect its connections, synonyms, merge duplicates or define relationships.</p>
              </div>
            ) : editNode ? (
              <div className="tax-admin-right-card">
                <div className="tax-card-header">
                  <h2>Edit Node Info</h2>
                  <button className="tax-btn-secondary" onClick={() => setEditNode(null)}>Cancel</button>
                </div>
                <form onSubmit={handleUpdateNode} className="tax-form">
                  <div className="tax-form-group">
                    <label>Node Name *</label>
                    <input 
                      type="text" 
                      value={editNode.name} 
                      onChange={e => setEditNode({ ...editNode, name: e.target.value })}
                      required 
                    />
                  </div>
                  <div className="tax-form-group-row">
                    <div className="tax-form-group">
                      <label>Type</label>
                      <select 
                        value={editNode.type} 
                        onChange={e => setEditNode({ ...editNode, type: e.target.value })}
                      >
                        {NODE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="tax-form-group">
                      <label>Weight (0.0 - 1.0)</label>
                      <input 
                        type="number" 
                        step="0.05"
                        min="0"
                        max="1"
                        value={editNode.weight} 
                        onChange={e => setEditNode({ ...editNode, weight: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="tax-form-group-row">
                    <div className="tax-form-group">
                      <label>Icon Emoji</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 🎨"
                        value={editNode.icon || ''} 
                        onChange={e => setEditNode({ ...editNode, icon: e.target.value })}
                      />
                    </div>
                    <div className="tax-form-group">
                      <label>Color Theme Hex</label>
                      <input 
                        type="text" 
                        placeholder="e.g. #ec4899"
                        value={editNode.color || ''} 
                        onChange={e => setEditNode({ ...editNode, color: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="tax-form-group">
                    <label>Description</label>
                    <textarea 
                      value={editNode.description || ''} 
                      onChange={e => setEditNode({ ...editNode, description: e.target.value })}
                    />
                  </div>
                  <div className="tax-form-group">
                    <label>Aliases (Comma-separated)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. JS, ECMAScript"
                      value={Array.isArray(editNode.aliases) ? editNode.aliases.join(', ') : editNode.aliases} 
                      onChange={e => setEditNode({ ...editNode, aliases: e.target.value })}
                    />
                  </div>
                  <div className="tax-form-group">
                    <label>Synonyms (Comma-separated)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. ECMA, ES6"
                      value={Array.isArray(editNode.synonyms) ? editNode.synonyms.join(', ') : editNode.synonyms} 
                      onChange={e => setEditNode({ ...editNode, synonyms: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="tax-btn-primary" disabled={actionLoading}>
                    {actionLoading ? 'Saving...' : 'Save Node Info'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="tax-admin-right-card">
                <div className="tax-card-header">
                  <div className="tax-card-title-group">
                    <span className="tax-card-icon" style={{ backgroundColor: selectedNode.color ? `${selectedNode.color}20` : 'rgba(255,255,255,0.05)', color: selectedNode.color || '#fff' }}>
                      {selectedNode.icon || '📍'}
                    </span>
                    <div>
                      <h2>{selectedNode.name}</h2>
                      <span className={`tax-badge tax-badge--${selectedNode.type}`}>{selectedNode.type}</span>
                    </div>
                  </div>
                  <button className="tax-btn-secondary" onClick={() => setEditNode({ ...selectedNode })}>
                    Edit Info
                  </button>
                </div>

                <div className="tax-details-section">
                  <h3>Description</h3>
                  <p>{selectedNode.description || 'No description provided.'}</p>
                </div>

                <div className="tax-details-section-grid">
                  <div>
                    <h5>Node Weight</h5>
                    <p>{selectedNode.weight}</p>
                  </div>
                  <div>
                    <h5>Slug</h5>
                    <p><code>{selectedNode.slug}</code></p>
                  </div>
                  <div>
                    <h5>Aliases</h5>
                    <p>{selectedNode.aliases?.join(', ') || 'No aliases defined'}</p>
                  </div>
                  <div>
                    <h5>Synonyms</h5>
                    <p>{selectedNode.synonyms?.join(', ') || 'No synonyms defined'}</p>
                  </div>
                </div>

                {/* Merge Tools */}
                <div className="tax-details-section">
                  <h3>Merge Control</h3>
                  <form onSubmit={handleMergeNodes} className="tax-merge-form">
                    <p className="tax-warning-text">⚠️ Warning: Merging moves all relationships to target and redirects queries.</p>
                    <div className="tax-merge-inputs">
                      <select 
                        value={mergeForm.targetId} 
                        onChange={e => setMergeForm({ targetId: e.target.value })}
                        required
                      >
                        <option value="">Select target node...</option>
                        {allNodesList
                          .filter(n => n._id !== selectedNode._id)
                          .map(n => <option key={n._id} value={n._id}>{n.name} ({n.type})</option>)
                        }
                      </select>
                      <button type="submit" className="tax-btn-danger" disabled={actionLoading}>
                        Merge Into Target
                      </button>
                    </div>
                  </form>
                </div>

                {/* Connect Relationship */}
                <div className="tax-details-section">
                  <h3>Connect Relationship (Build Graph Edge)</h3>
                  <form onSubmit={handleCreateRelation} className="tax-relation-form">
                    <div className="tax-form-row">
                      <select 
                        value={relationForm.type} 
                        onChange={e => setRelationForm({ ...relationForm, type: e.target.value })}
                      >
                        {RELATIONSHIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      
                      <span className="relation-arrow">➔</span>

                      <select 
                        value={relationForm.toId} 
                        onChange={e => setRelationForm({ ...relationForm, toId: e.target.value })}
                        required
                      >
                        <option value="">Select target node...</option>
                        {allNodesList
                          .filter(n => n._id !== selectedNode._id)
                          .map(n => <option key={n._id} value={n._id}>{n.name} ({n.type})</option>)
                        }
                      </select>
                    </div>
                    <div className="tax-form-row">
                      <input 
                        type="number" 
                        step="0.05"
                        min="0"
                        max="1"
                        placeholder="Relation weight (e.g. 1.0)"
                        value={relationForm.weight}
                        onChange={e => setRelationForm({ ...relationForm, weight: parseFloat(e.target.value) })}
                      />
                      <input 
                        type="text" 
                        placeholder="Optional notes/metadata..."
                        value={relationForm.note}
                        onChange={e => setRelationForm({ ...relationForm, note: e.target.value })}
                      />
                      <button type="submit" className="tax-btn-primary" disabled={actionLoading}>
                        Connect Edge
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="tax-admin-container">
          <div className="tax-admin-left">
            <div className="tax-panel-header">
              <h2>Pending AI Proposals</h2>
              <span className="tax-badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>
                {proposals.length} Drafts
              </span>
            </div>

            <div className="tax-nodes-list" style={{ flex: 1, overflowY: 'auto' }}>
              {loading ? (
                <div className="tax-loader">Loading proposals...</div>
              ) : proposals.length === 0 ? (
                <div className="tax-empty">No pending proposals in review queue.</div>
              ) : (
                proposals.map(p => (
                  <div 
                    key={p._id} 
                    className={`tax-node-item ${selectedProposal?._id === p._id ? 'tax-node-item--active' : ''}`}
                    onClick={() => handleSelectProposal(p)}
                  >
                    <span className="tax-node-item__icon">{p.icon || '🤖'}</span>
                    <div className="tax-node-item__info">
                      <h4>{p.name}</h4>
                      <span className={`tax-badge tax-badge--${p.type}`}>{p.type}</span>
                      <div className={`proposal-meta-tag proposal-meta-tag--${p.sourceType}`}>
                        {p.sourceType.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="tax-admin-right">
            {!selectedProposal ? (
              <div className="tax-details-placeholder">
                <div className="tax-details-placeholder__icon">🤖</div>
                <h3>AI Recommendation Queue</h3>
                <p>Select any AI-generated node proposal to review parent categories, synonyms, description, search weight, and decide whether to approve or reject the proposal.</p>
              </div>
            ) : (
              <div className="tax-admin-right-card">
                <div className="tax-card-header">
                  <h2>Review Proposal: "{selectedProposal.name}"</h2>
                  <span className={`tax-badge tax-badge--${selectedProposal.type}`}>{selectedProposal.type}</span>
                </div>

                {selectedProposal.aiReasoning && (
                  <div className="proposal-reasoning">
                    <strong>🤖 AI Reasoning:</strong> {selectedProposal.aiReasoning}
                  </div>
                )}

                <div className="tax-form">
                  <div className="tax-form-group">
                    <label>Node Name *</label>
                    <input 
                      type="text" 
                      value={reviewForm.name} 
                      onChange={e => setReviewForm({ ...reviewForm, name: e.target.value })}
                      required 
                    />
                  </div>
                  <div className="tax-form-group-row">
                    <div className="tax-form-group">
                      <label>Type</label>
                      <select 
                        value={reviewForm.type} 
                        onChange={e => setReviewForm({ ...reviewForm, type: e.target.value })}
                      >
                        {NODE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="tax-form-group">
                      <label>Weight (0.0 - 1.0)</label>
                      <input 
                        type="number" 
                        step="0.05"
                        min="0"
                        max="1"
                        value={reviewForm.weight} 
                        onChange={e => setReviewForm({ ...reviewForm, weight: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="tax-form-group-row">
                    <div className="tax-form-group">
                      <label>Icon Emoji</label>
                      <input 
                        type="text" 
                        value={reviewForm.icon} 
                        onChange={e => setReviewForm({ ...reviewForm, icon: e.target.value })}
                      />
                    </div>
                    <div className="tax-form-group">
                      <label>Color Theme Hex</label>
                      <input 
                        type="text" 
                        value={reviewForm.color} 
                        onChange={e => setReviewForm({ ...reviewForm, color: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="tax-form-group">
                    <label>Description</label>
                    <textarea 
                      value={reviewForm.description} 
                      onChange={e => setReviewForm({ ...reviewForm, description: e.target.value })}
                    />
                  </div>
                  <div className="tax-form-group">
                    <label>Aliases (Comma-separated)</label>
                    <input 
                      type="text" 
                      value={reviewForm.aliases} 
                      onChange={e => setReviewForm({ ...reviewForm, aliases: e.target.value })}
                    />
                  </div>
                  <div className="tax-form-group">
                    <label>Synonyms (Comma-separated)</label>
                    <input 
                      type="text" 
                      value={reviewForm.synonyms} 
                      onChange={e => setReviewForm({ ...reviewForm, synonyms: e.target.value })}
                    />
                  </div>

                  <div className="tax-form-group">
                    <label>Relationships suggested by AI</label>
                    <div className="relationship-editor-list">
                      {reviewForm.relationships.length === 0 ? (
                        <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>No connections suggested.</p>
                      ) : (
                        reviewForm.relationships.map((rel, idx) => (
                          <div key={idx} className="relationship-editor-item">
                            <span>
                              <strong>{rel.type}</strong> ➔ {rel.targetName}
                            </span>
                            <button 
                              type="button" 
                              className="remove-btn" 
                              onClick={() => {
                                const copy = [...reviewForm.relationships];
                                copy.splice(idx, 1);
                                setReviewForm({ ...reviewForm, relationships: copy });
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <select id="new-rel-type" defaultValue="BELONGS_TO" style={{ flex: 1 }}>
                        {RELATIONSHIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <select id="new-rel-target" style={{ flex: 2 }}>
                        <option value="">Select target node...</option>
                        {allNodesList.map(n => <option key={n._id} value={n.name}>{n.name} ({n.type})</option>)}
                      </select>
                      <button 
                        type="button" 
                        className="tax-btn-secondary"
                        onClick={() => {
                          const typeVal = document.getElementById('new-rel-type').value;
                          const targetVal = document.getElementById('new-rel-target').value;
                          if (!targetVal) return;
                          setReviewForm({
                            ...reviewForm,
                            relationships: [...reviewForm.relationships, { targetName: targetVal, type: typeVal, weight: 1.0 }]
                          });
                        }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  <div className="tax-action-buttons-row">
                    <button 
                      type="button" 
                      className="tax-btn-primary" 
                      onClick={() => handleReviewProposal('approved')}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Approving...' : '✔️ Approve (Add to Graph)'}
                    </button>
                    <button 
                      type="button" 
                      className="tax-btn-danger" 
                      onClick={() => handleReviewProposal('rejected')}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Rejecting...' : '❌ Reject'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="tax-modal-overlay">
          <div className="tax-modal">
            <div className="tax-modal-header">
              <h3>Create SkillNode</h3>
              <button className="tax-modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateNode} className="tax-form">
              <div className="tax-form-group">
                <label>Node Name *</label>
                <input 
                  type="text" 
                  value={newNode.name} 
                  onChange={e => setNewNode({ ...newNode, name: e.target.value })}
                  placeholder="e.g. Adobe InDesign"
                  required 
                />
              </div>
              <div className="tax-form-group-row">
                <div className="tax-form-group">
                  <label>Type</label>
                  <select 
                    value={newNode.type} 
                    onChange={e => setNewNode({ ...newNode, type: e.target.value })}
                  >
                    {NODE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="tax-form-group">
                  <label>Weight (0.0 - 1.0)</label>
                  <input 
                    type="number" 
                    step="0.05"
                    min="0"
                    max="1"
                    value={newNode.weight} 
                    onChange={e => setNewNode({ ...newNode, weight: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <div className="tax-form-group-row">
                <div className="tax-form-group">
                  <label>Icon Emoji</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 📄"
                    value={newNode.icon} 
                    onChange={e => setNewNode({ ...newNode, icon: e.target.value })}
                  />
                </div>
                <div className="tax-form-group">
                  <label>Color Theme Hex</label>
                  <input 
                    type="text" 
                    placeholder="e.g. #3b82f6"
                    value={newNode.color} 
                    onChange={e => setNewNode({ ...newNode, color: e.target.value })}
                  />
                </div>
              </div>
              <div className="tax-form-group">
                <label>Description</label>
                <textarea 
                  value={newNode.description} 
                  onChange={e => setNewNode({ ...newNode, description: e.target.value })}
                  placeholder="Explain the skill or context..."
                />
              </div>
              <div className="tax-form-group">
                <label>Aliases (Comma-separated)</label>
                <input 
                  type="text" 
                  placeholder="e.g. ID, InDesign"
                  value={newNode.aliases} 
                  onChange={e => setNewNode({ ...newNode, aliases: e.target.value })}
                />
              </div>
              <div className="tax-form-group">
                <label>Synonyms (Comma-separated)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Document Layout, Book Layout"
                  value={newNode.synonyms} 
                  onChange={e => setNewNode({ ...newNode, synonyms: e.target.value })}
                />
              </div>
              <button type="submit" className="tax-btn-primary" disabled={actionLoading}>
                {actionLoading ? 'Creating...' : 'Create Node'}
              </button>
            </form>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
};

export default TaxonomyAdmin;
