import { useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Image as ImageIcon, Edit2, Trash2, Eye, Plus, FolderOpen,
  Package, ExternalLink, Search, LayoutGrid, List, ArrowUpDown,
  CheckCircle2, Globe, Sparkles, X, UploadCloud, ChevronRight
} from 'lucide-react';
import { useFreelancer } from '../../context/FreelancerContext';
import { useAuth } from '../../hooks/useAuth';
import Loader from '../../Components/common/Loader/Loader';
import Modal from '../../Components/common/Modal/Modal';
import ConfirmDialog from '../../Components/common/ConfirmDialog/ConfirmDialog';
import AiGenerateText from '../../Components/common/AiSuggest/AiGenerateText';
import ImageSourcePicker from '../../Components/common/ImageSourcePicker/ImageSourcePicker';
import Reveal from './components/Reveal';
import { isMobileApp } from '../../utils/platform';
import { openExternal } from '../../utils/externalLink';
import './FreelancerPortfolio.css';

export default function FreelancerPortfolio() {
  const { profile, gigs = [], addPortfolioItem, updatePortfolioItem, deletePortfolioItem, showToast } = useFreelancer();
  const { user } = useAuth();

  // Dialog & Active State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [previewTarget, setPreviewTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  // Upload & Form State
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({ title: '', description: '', url: '', images: [] });

  // Filtering, Search & View Controls (Client-Side)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all | live | services
  const [sortBy, setSortBy] = useState('newest'); // newest | oldest | title
  const [viewMode, setViewMode] = useState('grid'); // grid | list

  const portfolioList = useMemo(() => {
    return Array.isArray(profile?.portfolio) ? profile.portfolio : [];
  }, [profile?.portfolio]);

  // Derived metrics for summary strip
  const totalProjects = portfolioList.length;
  const liveProjectsCount = useMemo(() => {
    return portfolioList.filter(item => Boolean(item.url)).length;
  }, [portfolioList]);
  const activeGigsCount = gigs.length;

  // Filtered & sorted projects
  const processedProjects = useMemo(() => {
    let list = [...portfolioList];

    // Filter by type
    if (filterType === 'live') {
      list = list.filter(item => Boolean(item.url));
    }

    // Search by title or description
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item =>
        (item.title || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'oldest') {
      list.reverse();
    } else if (sortBy === 'title') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    return list;
  }, [portfolioList, filterType, searchQuery, sortBy]);

  // Modal Open Handlers
  const handleOpenAdd = () => {
    setEditTarget(null);
    setFormData({ title: '', description: '', url: '', images: [] });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditTarget(item);
    setFormData({
      title: item.title || '',
      description: item.description || '',
      url: item.url || '',
      images: Array.isArray(item.images) ? item.images : []
    });
    setIsModalOpen(true);
  };

  // Upload Logic (supports both click and drag & drop)
  const handleUploadFile = async (file) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const { uploadPortfolioImage } = await import('../../utils/uploadHelper');
      const url = await uploadPortfolioImage(file);
      setFormData(prev => ({ ...prev, images: [url] }));
      showToast('Cover image uploaded successfully!');
    } catch {
      showToast('Image upload failed. Please try again.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) handleUploadFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleUploadFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editTarget) {
      await updatePortfolioItem(editTarget._id, formData);
    } else {
      await addPortfolioItem(formData);
    }
    setIsModalOpen(false);
  };

  // Delete Handler
  const handleDelete = async () => {
    if (!deletingId) return;
    setDeletingBusy(true);
    const result = await deletePortfolioItem(deletingId);
    setDeletingBusy(false);
    if (result !== false) setDeletingId(null);
  };

  return (
    <div className="fp-page-root">
      <div className="fp-container">

        {/* ─── 1) PAGE HEADER ─── */}
        <header className="fp-shared-header">
          <div className="fp-header-left">
            <nav className="fp-breadcrumbs" aria-label="Breadcrumb">
              <Link to="/freelancer/dashboard" className="fp-bc-link">Dashboard</Link>
              <span className="fp-bc-sep">/</span>
              <span className="fp-bc-curr">Portfolio</span>
            </nav>
            <h1 className="fp-page-title">Portfolio Projects</h1>
            <p className="fp-page-subtitle">
              Showcase your best professional deliverables, applications, and verified client outcomes.
            </p>
          </div>

          <div className="fp-header-actions">
            {!isMobileApp() && (
              <Link
                to={`/freelancers/${user?._id || user?.id}`}
                className="fp-btn-outline"
                title="View how prospective clients see your public profile"
              >
                <Eye size={14} />
                <span>View Public Profile</span>
              </Link>
            )}

            <button
              type="button"
              className="fp-btn-primary"
              onClick={handleOpenAdd}
            >
              <Plus size={15} />
              <span>Add Project</span>
            </button>
          </div>
        </header>

        {/* ─── 2) SUMMARY STRIP ─── */}
        <Reveal delay={0}>
          <div className="fp-summary-strip" aria-label="Portfolio Metrics Overview">
            <div className="fp-summary-cell">
              <span className="fp-summary-val">{totalProjects}</span>
              <span className="fp-summary-lbl">Total Projects</span>
            </div>

            <div className="fp-summary-divider" />

            <div className="fp-summary-cell">
              <span className="fp-summary-val fp-summary-val--green">{liveProjectsCount}</span>
              <span className="fp-summary-lbl">Live Deployed URLs</span>
            </div>

            <div className="fp-summary-divider" />

            <div className="fp-summary-cell">
              <span className="fp-summary-val">{activeGigsCount}</span>
              <span className="fp-summary-lbl">Service Gigs Linked</span>
            </div>
          </div>
        </Reveal>

        {/* ─── 3) TOOLBAR (Filter Chips, Search & View Toggle) ─── */}
        <div className="fp-toolbar-card">
          <div className="fp-toolbar-left">
            {/* Filter Chips */}
            <div className="fp-filter-chips">
              <button
                type="button"
                className={`fp-filter-chip ${filterType === 'all' ? 'fp-filter-chip--active' : ''}`}
                onClick={() => setFilterType('all')}
              >
                <span>All Projects</span>
                <span className="fp-chip-count">{totalProjects}</span>
              </button>

              <button
                type="button"
                className={`fp-filter-chip ${filterType === 'live' ? 'fp-filter-chip--active' : ''}`}
                onClick={() => setFilterType('live')}
              >
                <Globe size={13} />
                <span>With Live Demo</span>
                <span className="fp-chip-count">{liveProjectsCount}</span>
              </button>
            </div>
          </div>

          <div className="fp-toolbar-right">
            {/* Search Input */}
            <div className="fp-search-wrap">
              <Search size={14} className="fp-search-icon" />
              <input
                type="text"
                className="fp-search-input"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search portfolio projects"
              />
            </div>

            {/* Sort Select */}
            <div className="fp-sort-wrap">
              <ArrowUpDown size={13} className="fp-sort-icon" />
              <select
                className="fp-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort projects"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="title">Title (A-Z)</option>
              </select>
            </div>

            {/* View Mode Switcher (Grid / List) */}
            <div className="fp-view-switcher" role="group" aria-label="Layout view mode">
              <button
                type="button"
                className={`fp-view-btn ${viewMode === 'grid' ? 'fp-view-btn--active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid view"
                aria-label="Grid view"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                className={`fp-view-btn ${viewMode === 'list' ? 'fp-view-btn--active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List view"
                aria-label="List view"
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* ─── 4) PROJECT GRID / LIST ─── */}
        {portfolioList.length === 0 ? (
          <Reveal delay={40}>
            <div className="fp-empty-card">
              <div className="fp-empty-icon-wrap">
                <FolderOpen size={32} />
              </div>
              <h3 className="fp-empty-title">Your Portfolio is Empty</h3>
              <p className="fp-empty-desc">
                Adding showcase projects with screenshots and case details significantly improves your client booking rate and search visibility.
              </p>
              <button
                type="button"
                className="fp-btn-primary"
                onClick={handleOpenAdd}
              >
                <Plus size={15} />
                <span>Add Your First Project</span>
              </button>
            </div>
          </Reveal>
        ) : processedProjects.length === 0 ? (
          <div className="fp-empty-card">
            <div className="fp-empty-icon-wrap">
              <Search size={28} />
            </div>
            <h3 className="fp-empty-title">No Projects Found</h3>
            <p className="fp-empty-desc">
              No portfolio projects match your active search filter.
            </p>
            <button
              type="button"
              className="fp-btn-outline"
              onClick={() => { setSearchQuery(''); setFilterType('all'); }}
            >
              Clear Filters
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="fp-projects-grid">
            {processedProjects.map((item, idx) => {
              const coverImg = item.images?.[0];
              return (
                <Reveal key={item._id || idx} delay={idx < 8 ? idx * 40 : 0}>
                  <article className="fp-card">
                    {/* Cover Image Area */}
                    <div className="fp-card-image-wrap">
                      {coverImg ? (
                        <img
                          src={coverImg}
                          alt={item.title}
                          className="fp-card-img"
                          loading="lazy"
                        />
                      ) : (
                        <div className="fp-card-fallback-img">
                          <ImageIcon size={32} />
                        </div>
                      )}

                      {/* Project Tag Pill */}
                      <span className="fp-card-badge">Deliverable</span>

                      {/* Clean Hover / Focus Action Overlay */}
                      <div className="fp-card-overlay">
                        <div className="fp-overlay-actions-row">
                          <button
                            type="button"
                            className="fp-overlay-btn"
                            onClick={() => setPreviewTarget(item)}
                            title="Preview project"
                            aria-label="Preview project"
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            type="button"
                            className="fp-overlay-btn"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit project"
                            aria-label="Edit project"
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            type="button"
                            className="fp-overlay-btn fp-overlay-btn--del"
                            onClick={() => setDeletingId(item._id)}
                            title="Delete project"
                            aria-label="Delete project"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => { e.preventDefault(); openExternal(item.url); }}
                            className="fp-overlay-link"
                          >
                            <span>View Live</span>
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="fp-card-body">
                      <h3 className="fp-card-title" title={item.title}>
                        {item.title}
                      </h3>

                      {item.description && (
                        <p className="fp-card-desc" title={item.description}>
                          {item.description}
                        </p>
                      )}

                      {/* Card Footer */}
                      <div className="fp-card-footer">
                        {item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => { e.preventDefault(); openExternal(item.url); }}
                            className="fp-card-external-link"
                          >
                            <Globe size={13} />
                            <span>Live Project</span>
                          </a>
                        ) : (
                          <span className="fp-card-meta-tag">Deliverable Spec</span>
                        )}

                        <div className="fp-card-quick-actions">
                          <button
                            type="button"
                            className="fp-icon-btn"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit"
                            aria-label="Edit project"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            className="fp-icon-btn fp-icon-btn--danger"
                            onClick={() => setDeletingId(item._id)}
                            title="Delete"
                            aria-label="Delete project"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        ) : (
          /* List View Rows */
          <div className="fp-projects-list">
            {processedProjects.map((item, idx) => {
              const coverImg = item.images?.[0];
              return (
                <article key={item._id || idx} className="fp-list-row">
                  <div className="fp-list-thumb">
                    {coverImg ? (
                      <img src={coverImg} alt={item.title} className="fp-list-thumb-img" loading="lazy" />
                    ) : (
                      <ImageIcon size={22} color="#94A3B8" />
                    )}
                  </div>

                  <div className="fp-list-info">
                    <h3 className="fp-list-title">{item.title}</h3>
                    {item.description && (
                      <p className="fp-list-desc">{item.description}</p>
                    )}
                  </div>

                  <div className="fp-list-meta-actions">
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => { e.preventDefault(); openExternal(item.url); }}
                        className="fp-card-external-link"
                      >
                        <Globe size={13} />
                        <span>Live Demo</span>
                      </a>
                    )}

                    <div className="fp-list-actions-group">
                      <button
                        type="button"
                        className="fp-icon-btn"
                        onClick={() => handleOpenEdit(item)}
                        title="Edit project"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="fp-icon-btn fp-icon-btn--danger"
                        onClick={() => setDeletingId(item._id)}
                        title="Delete project"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* ─── 5) SERVICE GIGS SECTION ─── */}
        <section className="fp-gigs-section">
          <div className="fp-gigs-header-row">
            <div>
              <div className="fp-gigs-eyebrow">
                <Package size={14} />
                <span>CONNECTED MARKETPLACE SERVICES</span>
              </div>
              <h2 className="fp-gigs-title">Active Service Gigs</h2>
            </div>
            <span className="fp-gigs-count-badge">{gigs.length} Active</span>
          </div>

          {gigs.length === 0 ? (
            <div className="fp-empty-mini-card">
              <Package size={24} color="#94A3B8" />
              <p className="fp-empty-mini-text">No active service gigs listed yet.</p>
              <Link to="/freelancer/gigs/create" className="fp-btn-primary fp-btn-primary--sm">
                Create a Gig
              </Link>
            </div>
          ) : (
            <div className="fp-gigs-grid">
              {gigs.map((gig) => (
                <article key={gig._id} className="fp-gig-card">
                  <div className="fp-gig-img-wrap">
                    {gig.media?.banner ? (
                      <img src={gig.media.banner} alt={gig.title} className="fp-gig-img" loading="lazy" />
                    ) : (
                      <div className="fp-card-fallback-img">
                        <Package size={28} />
                      </div>
                    )}
                    <span className="fp-gig-cat-pill">{gig.category || 'Service'}</span>
                  </div>

                  <div className="fp-gig-body">
                    <h4 className="fp-gig-title">{gig.title}</h4>
                    {gig.shortDescription && (
                      <p className="fp-gig-desc">{gig.shortDescription}</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

      </div>

      {/* ─── 6) ADD / EDIT MODAL ─── */}
      <Modal
        open={isModalOpen}
        title={editTarget ? 'Edit Portfolio Project' : 'Add New Project'}
        onClose={() => setIsModalOpen(false)}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="fp-form-body">
          {/* Project Title */}
          <div className="fp-field">
            <label className="fp-field-label" htmlFor="fp-title-input">
              Project Title *
            </label>
            <input
              id="fp-title-input"
              type="text"
              className="fp-field-input"
              placeholder="e.g. Fintech Dashboard & Analytics Platform"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          {/* Description & Technologies (with preserved AiGenerateText) */}
          <div className="fp-field">
            <label className="fp-field-label">
              Description & Technologies *
            </label>
            <AiGenerateText
              fieldLabel="a portfolio project description on a freelancer's profile — what they built and what technologies they used"
              getContext={() => ({ title: formData.title, url: formData.url })}
              getExistingText={() => formData.description}
              onGenerated={(text) => setFormData({ ...formData, description: text })}
              value={formData.description}
              onChange={(v) => setFormData({ ...formData, description: v })}
              rows={4}
              placeholder="What did you build? What problem did it solve? What tech stack did you utilize?"
              required
            />
          </div>

          {/* Project URL */}
          <div className="fp-field">
            <label className="fp-field-label" htmlFor="fp-url-input">
              Live Demo / Project URL (Optional)
            </label>
            <div className="fp-input-with-icon">
              <Globe size={15} className="fp-field-icon" />
              <input
                id="fp-url-input"
                type="url"
                className="fp-field-input fp-field-input--with-icon"
                placeholder="https://example.com/project"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              />
            </div>
          </div>

          {/* Modern Image Dropzone */}
          <div className="fp-field">
            <label className="fp-field-label">Cover Showcase Image</label>
            <div
              className={`fp-dropzone ${isDragging ? 'fp-dropzone--drag' : ''} ${formData.images?.[0] ? 'fp-dropzone--has-img' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              aria-label="Upload showcase cover image"
            >
              {formData.images?.[0] ? (
                <div className="fp-dropzone-preview">
                  <img src={formData.images[0]} alt="Uploaded preview" className="fp-dropzone-img" />
                  <div className="fp-dropzone-preview-overlay">
                    <span>Click or drop image to replace</span>
                  </div>
                </div>
              ) : isUploading ? (
                <div className="fp-dropzone-loading">
                  <Loader size="sm" text="Uploading showcase image..." />
                </div>
              ) : (
                <div className="fp-dropzone-empty">
                  <div className="fp-dropzone-icon-circle">
                    <UploadCloud size={24} />
                  </div>
                  <strong className="fp-dropzone-prompt">
                    Click to browse or drag & drop showcase image
                  </strong>
                  <span className="fp-dropzone-sub">
                    PNG, JPG, or WebP up to 10MB (16:10 recommended)
                  </span>
                </div>
              )}
            </div>

            {/* Hidden native input picker */}
            <ImageSourcePicker ref={fileInputRef} accept="image/*" onChange={handleImageUpload} />

            {formData.images?.[0] && (
              <button
                type="button"
                className="fp-remove-img-btn"
                onClick={() => setFormData({ ...formData, images: [] })}
              >
                <X size={13} />
                <span>Remove Cover Image</span>
              </button>
            )}
          </div>

          {/* Modal Sticky Footer */}
          <div className="fp-modal-footer">
            <button
              type="button"
              className="fp-btn-outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="fp-btn-primary"
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : editTarget ? 'Save Changes' : 'Publish Project'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── 7) PREVIEW MODAL ─── */}
      {previewTarget && (
        <Modal
          open={Boolean(previewTarget)}
          title={previewTarget.title}
          onClose={() => setPreviewTarget(null)}
          size="lg"
        >
          <div className="fp-preview-modal-body">
            {previewTarget.images?.[0] && (
              <div className="fp-preview-image-wrap">
                <img
                  src={previewTarget.images[0]}
                  alt={previewTarget.title}
                  className="fp-preview-img"
                />
              </div>
            )}

            <div className="fp-preview-content">
              <span className="fp-preview-tag">Portfolio Project Deliverable</span>
              <h3 className="fp-preview-title">{previewTarget.title}</h3>
              <p className="fp-preview-desc">{previewTarget.description}</p>

              {previewTarget.url && (
                <div style={{ marginTop: 16 }}>
                  <a
                    href={previewTarget.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => { e.preventDefault(); openExternal(previewTarget.url); }}
                    className="fp-btn-primary"
                  >
                    <span>Visit Live Application</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ─── 8) DELETE CONFIRMATION DIALOG ─── */}
      <ConfirmDialog
        open={Boolean(deletingId)}
        title="Remove Project from Portfolio?"
        message="Are you sure you want to delete this project? It will no longer appear on your public profile or proposals."
        confirmLabel="Delete Project"
        loading={deletingBusy}
        onConfirm={handleDelete}
        onClose={() => setDeletingId(null)}
      />

    </div>
  );
}
