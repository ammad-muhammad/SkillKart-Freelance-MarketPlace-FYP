import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Star, MoreVertical, Edit2, Pause, Play, Trash2,
  ExternalLink, Bookmark, Package
} from 'lucide-react';
import './GigCard.css';

/**
 * Shared GigCard Component
 * Variants:
 *  - "public": Marketplace browse (/browse-gigs), search, and live wizard preview.
 *  - "owner":  Freelancer dashboard (/freelancer/gigs).
 */
export default function GigCard({
  gig = {},
  variant = 'public',
  onOpen,
  onEdit,
  onDelete,
  onToggleStatus,
  onBookmark,
  isBookmarked = false,
  className = '',
  style = {}
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close 3-dot menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // Normalize gig properties
  const gigId = gig._id || gig.id;
  const title = gig.title || 'Untitled Gig';

  // Media (single cover image)
  const coverImage = gig.media?.banner || gig.banner || (Array.isArray(gig.media?.images) ? gig.media.images[0] : null) || null;

  // Pricing
  const pricing = gig.pricing || {};
  const startingPrice = gig.startingPrice != null
    ? gig.startingPrice
    : pricing.basic?.price != null
    ? pricing.basic.price
    : null;

  // Stats
  const stats = gig.stats || {};
  const rating = Number(gig.rating != null ? gig.rating : stats.rating != null ? stats.rating : 0);
  const reviewsCount = gig.reviewsCount != null ? gig.reviewsCount : stats.reviewsCount != null ? stats.reviewsCount : 0;
  const ordersCompleted = gig.orders != null ? gig.orders : stats.ordersCompleted != null ? stats.ordersCompleted : stats.orders || 0;
  const viewsCount = stats.views || 0;

  // Seller info (for public variant)
  const freelancer = typeof gig.freelancerId === 'object' && gig.freelancerId ? gig.freelancerId : {};
  const freelancerName = gig.freelancerName || `${freelancer.firstName || ''} ${freelancer.lastName || ''}`.trim() || 'Freelancer';
  const freelancerAvatar = gig.freelancerAvatar || freelancer.profilePicture || null;
  const freelancerInitial = gig.freelancerInitial || (freelancerName.charAt(0) || 'F').toUpperCase();

  const handleCardClick = (e) => {
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.sk-gig-menu')) return;
    if (variant === 'public') {
      if (onOpen) onOpen(gigId);
      else if (gigId) navigate(`/gigs/${gigId}`);
    } else if (variant === 'owner') {
      if (gigId) navigate(`/gigs/${gigId}`);
      else if (onEdit) onEdit(gig);
    }
  };

  const isActive = gig.status === 'active';

  return (
    <article
      className={`sk-gig-card sk-gig-card--${variant} ${className}`}
      style={style}
      onClick={handleCardClick}
      role="article"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleCardClick(e);
        }
      }}
      aria-label={`Gig: ${title}`}
    >
      {/* ── Image Area: 16:10, radius 18px inside 8px padding ── */}
      <div className="sk-gig-card__image-container">
        {coverImage ? (
          <img
            src={coverImage}
            alt={title}
            className="sk-gig-card__image"
            loading="lazy"
          />
        ) : (
          <div className="sk-gig-card__image-placeholder">
            <Package size={34} strokeWidth={1.5} />
            <span>No preview available</span>
          </div>
        )}

        {/* PUBLIC VARIANT: Bookmark button top-right (if save feature exists) */}
        {variant === 'public' && onBookmark && (
          <button
            type="button"
            className={`sk-gig-card__bookmark-btn ${isBookmarked ? 'sk-gig-card__bookmark-btn--active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onBookmark(gig);
            }}
            title={isBookmarked ? 'Remove bookmark' : 'Save gig'}
            aria-label="Bookmark gig"
          >
            <Bookmark size={15} fill={isBookmarked ? '#10B981' : 'none'} color={isBookmarked ? '#10B981' : '#FFFFFF'} />
          </button>
        )}

        {/* OWNER VARIANT: Overlays (Status pill left, 3-dot menu right) */}
        {variant === 'owner' && (
          <>
            <div className="sk-gig-card__status-overlay">
              <span className={`sk-status-pill sk-status-pill--${isActive ? 'active' : 'paused'}`}>
                <span className="sk-status-pill__dot" />
                <span>{isActive ? 'Active' : 'Paused'}</span>
              </span>
            </div>

            <div className="sk-gig-card__menu-overlay" ref={menuRef}>
              <button
                type="button"
                className="sk-gig-menu-trigger"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((prev) => !prev);
                }}
                aria-label="Gig options"
                aria-haspopup="true"
                aria-expanded={menuOpen}
              >
                <MoreVertical size={16} />
              </button>

              {menuOpen && (
                <div className="sk-gig-menu-dropdown" role="menu">
                  {onEdit && (
                    <button
                      type="button"
                      className="sk-gig-menu-item"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onEdit(gig);
                      }}
                    >
                      <Edit2 size={13} />
                      <span>Edit Gig</span>
                    </button>
                  )}

                  {onToggleStatus && (
                    <button
                      type="button"
                      className="sk-gig-menu-item"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onToggleStatus(gigId);
                      }}
                    >
                      {isActive ? <Pause size={13} /> : <Play size={13} />}
                      <span>{isActive ? 'Pause Gig' : 'Activate Gig'}</span>
                    </button>
                  )}

                  {gigId && (
                    <button
                      type="button"
                      className="sk-gig-menu-item"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        navigate(`/gigs/${gigId}`);
                      }}
                    >
                      <ExternalLink size={13} />
                      <span>View Public Page</span>
                    </button>
                  )}

                  {onDelete && (
                    <button
                      type="button"
                      className="sk-gig-menu-item sk-gig-menu-item--danger"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onDelete(gigId);
                      }}
                      disabled={!!gig.activeOrders}
                    >
                      <Trash2 size={13} />
                      <span>Delete Gig</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Card Body ── */}
      <div className="sk-gig-card__body">
        {/* Row 1: Title (16-17px, 700, navy, max 2 lines, clickable link) */}
        <h3 className="sk-gig-card__title">
          {variant === 'public' && gigId ? (
            <Link to={`/gigs/${gigId}`} className="sk-gig-card__title-link" onClick={(e) => e.stopPropagation()}>
              {title}
            </Link>
          ) : (
            <span className="sk-gig-card__title-link">{title}</span>
          )}
        </h3>

        {/* ── PUBLIC VARIANT: Seller row + Price row ── */}
        {variant === 'public' && (
          <>
            {/* Row 2: Seller Avatar + Name left; Star + Rating right */}
            <div className="sk-gig-card__seller-row">
              <div className="sk-gig-card__seller-info">
                <div className="sk-gig-card__seller-avatar">
                  {freelancerAvatar ? (
                    <img src={freelancerAvatar} alt={freelancerName} />
                  ) : (
                    <span>{freelancerInitial}</span>
                  )}
                </div>
                <span className="sk-gig-card__seller-name" title={freelancerName}>
                  {freelancerName}
                </span>
              </div>

              <div className="sk-gig-card__rating-box">
                <Star size={13} fill="#F59E0B" color="#F59E0B" />
                <span className="sk-gig-card__rating-val">{rating > 0 ? rating.toFixed(1) : 'New'}</span>
                {reviewsCount > 0 && <span className="sk-gig-card__rating-cnt">({reviewsCount})</span>}
              </div>
            </div>

            <div className="sk-gig-card__divider" />

            {/* Row 3: "Starting at" muted left, Price 18px 800 navy right */}
            <div className="sk-gig-card__bottom-price-row">
              <span className="sk-gig-card__price-prefix">Starting at</span>
              <strong className="sk-gig-card__price-amount">
                {startingPrice != null ? `Rs. ${Number(startingPrice).toLocaleString()}` : 'Custom'}
              </strong>
            </div>
          </>
        )}

        {/* ── OWNER VARIANT: Info line + Thin line + Footer row ── */}
        {variant === 'owner' && (
          <>
            {/* Info line: Starting at Rs. XX,XXX left, star + rating right */}
            <div className="sk-gig-card__info-line">
              <div className="sk-gig-card__owner-price">
                <span className="sk-gig-card__price-prefix">Starting at </span>
                <strong className="sk-gig-card__owner-price-val">
                  {startingPrice != null ? `Rs. ${Number(startingPrice).toLocaleString()}` : 'Custom'}
                </strong>
              </div>

              <div className="sk-gig-card__rating-box">
                <Star size={13} fill="#F59E0B" color="#F59E0B" />
                <span className="sk-gig-card__rating-val">{rating > 0 ? rating.toFixed(1) : 'New'}</span>
                {reviewsCount > 0 && <span className="sk-gig-card__rating-cnt">({reviewsCount})</span>}
              </div>
            </div>

            <div className="sk-gig-card__divider" />

            {/* Footer row: Small stats muted left, Edit outline pill right */}
            <div className="sk-gig-card__owner-footer">
              <span className="sk-gig-card__owner-stats">
                {viewsCount.toLocaleString()} views · {ordersCompleted.toLocaleString()} orders
              </span>

              {onEdit && (
                <button
                  type="button"
                  className="sk-gig-edit-pill"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(gig);
                  }}
                  title="Edit this gig"
                >
                  <Edit2 size={12} />
                  <span>Edit</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </article>
  );
}
