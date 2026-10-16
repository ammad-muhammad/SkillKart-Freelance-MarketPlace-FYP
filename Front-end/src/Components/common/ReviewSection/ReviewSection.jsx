import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Star, MessageSquare, Edit3, Trash2, X, AlertCircle, 
  CheckCircle, LogIn, Calendar
} from 'lucide-react';
import Loader from '../Loader/Loader';
import { useAuth } from '../../../hooks/useAuth';
import { reviewsAPI } from '../../../api/reviews';
import { safeToast as toast } from '../../../utils/safeToast';
import './ReviewSection.css';

export default function ReviewSection({
  targetUserId,
  targetName = 'User',
  initialReviews = [],
  title = 'Client Reviews',
  onRatingUpdated
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [reviews, setReviews] = useState(initialReviews || []);
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [editingReview, setEditingReview] = useState(null);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Delete confirm state
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Store onRatingUpdated in a ref to avoid infinite re-render loops when parent passes inline callback
  const onRatingUpdatedRef = useRef(onRatingUpdated);
  useEffect(() => {
    onRatingUpdatedRef.current = onRatingUpdated;
  }, [onRatingUpdated]);

  // Robust current user ID matching
  const currentUserId = String(user?._id || user?.id || '');
  const isSelf = Boolean(currentUserId && currentUserId === String(targetUserId));

  const isUserMatch = useCallback((r) => {
    if (!currentUserId) return false;
    const rId = String(r?.reviewerId?._id || r?.reviewerId?.id || r?.reviewerId || '');
    return Boolean(rId && rId === currentUserId);
  }, [currentUserId]);

  // Fetch reviews directly from API for real-time background sync
  const fetchReviews = useCallback(async (notifyParent = false) => {
    if (!targetUserId) return;
    try {
      const res = await reviewsAPI.getReviews({ revieweeId: targetUserId });
      const fetched = res.data?.data?.reviews;
      if (Array.isArray(fetched)) {
        setReviews(fetched);
        if (notifyParent) {
          onRatingUpdatedRef.current?.(fetched);
        }
      }
    } catch (err) {
      console.warn('Could not fetch reviews:', err?.message);
    }
  }, [targetUserId]);

  // Sync initialReviews when prop changes
  useEffect(() => {
    if (Array.isArray(initialReviews) && initialReviews.length > 0) {
      setReviews(initialReviews);
    }
  }, [initialReviews]);

  // Fetch on mount or when target user changes (notifyParent = false to prevent cyclic re-render loops)
  useEffect(() => {
    if (targetUserId) {
      fetchReviews(false);
    }
  }, [targetUserId, fetchReviews]);

  // Current user's review if exists
  const myReview = useMemo(() => {
    if (!currentUserId || !Array.isArray(reviews)) return null;
    return reviews.find(isUserMatch) || null;
  }, [reviews, currentUserId, isUserMatch]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = reviews.length;
    if (total === 0) {
      return { avg: 0, total: 0, counts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, percentages: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
    }
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    reviews.forEach(r => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating || 0)));
      counts[star] = (counts[star] || 0) + 1;
      sum += (r.rating || 0);
    });

    const avg = Number((sum / total).toFixed(1));
    const percentages = {
      5: Math.round((counts[5] / total) * 100),
      4: Math.round((counts[4] / total) * 100),
      3: Math.round((counts[3] / total) * 100),
      2: Math.round((counts[2] / total) * 100),
      1: Math.round((counts[1] / total) * 100),
    };

    return { avg, total, counts, percentages };
  }, [reviews]);

  // Open Create Modal
  const openCreateModal = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setRating(5);
    setHoverRating(0);
    setComment('');
    setEditingReview(null);
    setModalMode('create');
  };

  // Open Edit Modal
  const openEditModal = (review) => {
    const revToEdit = review || myReview;
    if (!revToEdit) return;
    setEditingReview(revToEdit);
    setRating(revToEdit.rating || 5);
    setHoverRating(0);
    setComment(revToEdit.comment || '');
    setModalMode('edit');
  };

  // Close Modal
  const closeModal = () => {
    if (submitting) return;
    setModalMode(null);
    setEditingReview(null);
  };

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      toast.error('Please select a star rating between 1 and 5.');
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        const res = await reviewsAPI.createReview({
          revieweeId: targetUserId,
          rating,
          comment: comment.trim()
        });
        const newRev = res.data?.data?.review;
        if (newRev) {
          if (typeof newRev.reviewerId === 'string' || !newRev.reviewerId) {
            newRev.reviewerId = {
              _id: currentUserId,
              firstName: user?.firstName || 'You',
              lastName: user?.lastName || '',
              profilePicture: user?.profilePicture || ''
            };
          }
          const updated = [newRev, ...reviews.filter(r => String(r._id) !== String(newRev._id))];
          setReviews(updated);
          onRatingUpdated?.(updated);
        }
        toast.success('Review submitted successfully!');
        fetchReviews();
      } else if (modalMode === 'edit' && editingReview) {
        const res = await reviewsAPI.updateReview(editingReview._id, {
          rating,
          comment: comment.trim()
        });
        const updatedRev = res.data?.data?.review;
        if (updatedRev) {
          if (typeof updatedRev.reviewerId === 'string' || !updatedRev.reviewerId) {
            updatedRev.reviewerId = editingReview.reviewerId || {
              _id: currentUserId,
              firstName: user?.firstName || 'You',
              lastName: user?.lastName || '',
              profilePicture: user?.profilePicture || ''
            };
          }
          const updated = reviews.map(r => String(r._id) === String(updatedRev._id) ? updatedRev : r);
          setReviews(updated);
          onRatingUpdated?.(updated);
        }
        toast.success('Review updated successfully!');
        fetchReviews();
      }
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await reviewsAPI.deleteReview(deleteId);
      const updated = reviews.filter(r => String(r._id) !== String(deleteId));
      setReviews(updated);
      onRatingUpdated?.(updated);
      toast.success('Review deleted successfully!');
      setDeleteId(null);
      fetchReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete review');
    } finally {
      setDeleting(false);
    }
  };

  const getRatingLabel = (val) => {
    switch (val) {
      case 5: return 'Excellent! Exceeded expectations.';
      case 4: return 'Good! Very satisfied.';
      case 3: return 'Average, met basic requirements.';
      case 2: return 'Below expectations.';
      case 1: return 'Poor experience.';
      default: return 'Select your rating';
    }
  };

  return (
    <section className="rs-section" id="reviews-section">
      {/* Section Header */}
      <div className="rs-header">
        <div className="rs-header__title-wrap">
          <h2 className="rs-header__title">
            <MessageSquare size={22} className="rs-header__icon" />
            {title}
          </h2>
          <span className="rs-header__count">({stats.total})</span>
        </div>

        {/* Action Buttons in Header */}
        {!isSelf && (
          <div className="rs-header__actions">
            {!user ? (
              <button 
                type="button" 
                onClick={() => navigate('/login')} 
                className="rs-btn rs-btn--outline"
              >
                <LogIn size={15} /> Log in to Review
              </button>
            ) : myReview ? (
              <div className="rs-header-my-actions">
                <button 
                  type="button" 
                  onClick={() => openEditModal(myReview)} 
                  className="rs-btn rs-btn--outline rs-btn--sm"
                  title="Edit your review"
                >
                  <Edit3 size={14} /> Edit Your Review
                </button>
                <button 
                  type="button" 
                  onClick={() => setDeleteId(myReview._id)} 
                  className="rs-btn rs-btn--danger-outline rs-btn--sm"
                  title="Delete your review"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            ) : (
              <button 
                type="button" 
                onClick={openCreateModal} 
                className="rs-btn rs-btn--primary"
              >
                <Star size={15} fill="currentColor" /> Write a Review
              </button>
            )}
          </div>
        )}
      </div>

      {/* Rating Overview Summary Box */}
      <div className="rs-overview-card">
        <div className="rs-overview__score-box">
          <div className="rs-overview__score">{stats.avg > 0 ? stats.avg.toFixed(1) : '0.0'}</div>
          <div className="rs-overview__stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={18}
                fill={star <= Math.round(stats.avg) ? '#f59e0b' : '#e2e8f0'}
                color={star <= Math.round(stats.avg) ? '#f59e0b' : '#cbd5e1'}
              />
            ))}
          </div>
          <div className="rs-overview__sub">
            {stats.total > 0 ? `Based on ${stats.total} verified ${stats.total === 1 ? 'review' : 'reviews'}` : 'No reviews yet'}
          </div>
        </div>

        {/* Rating Breakdown Bars */}
        <div className="rs-overview__bars">
          {[5, 4, 3, 2, 1].map((star) => (
            <div key={star} className="rs-bar-row">
              <span className="rs-bar-label">{star} <Star size={12} fill="#f59e0b" color="#f59e0b" /></span>
              <div className="rs-bar-track">
                <div 
                  className="rs-bar-fill" 
                  style={{ width: `${stats.percentages[star]}%` }}
                />
              </div>
              <span className="rs-bar-pct">{stats.counts[star]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dedicated Highlight Box for Current User's Review */}
      {myReview && (
        <div className="rs-my-review-spotlight">
          <div className="rs-my-review-spotlight__header">
            <div className="rs-my-review-spotlight__title">
              <CheckCircle size={18} color="#2563eb" />
              <span>Your Review for {targetName}</span>
            </div>
            <div className="rs-my-review-spotlight__actions">
              <button
                type="button"
                onClick={() => openEditModal(myReview)}
                className="rs-spotlight-btn rs-spotlight-btn--edit"
                title="Edit this review"
              >
                <Edit3 size={14} /> Edit Review
              </button>
              <button
                type="button"
                onClick={() => setDeleteId(myReview._id)}
                className="rs-spotlight-btn rs-spotlight-btn--delete"
                title="Delete this review"
              >
                <Trash2 size={14} /> Delete Review
              </button>
            </div>
          </div>
          
          <div className="rs-my-review-spotlight__body">
            <div className="rs-my-review-spotlight__stars">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={16}
                  fill={s <= myReview.rating ? '#f59e0b' : '#e2e8f0'}
                  color={s <= myReview.rating ? '#f59e0b' : '#cbd5e1'}
                />
              ))}
              <span className="rs-my-review-spotlight__rating-text">
                {myReview.rating}.0 / 5.0
              </span>
              <span className="rs-card__dot">•</span>
              <span className="rs-card__date">
                <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />
                {new Date(myReview.createdAt || Date.now()).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
            {myReview.comment ? (
              <p className="rs-my-review-spotlight__comment">{myReview.comment}</p>
            ) : (
              <p className="rs-my-review-spotlight__no-comment">No written feedback provided.</p>
            )}
          </div>
        </div>
      )}

      {/* Review Cards List */}
      <div className="rs-list">
        {reviews.length === 0 ? (
          <div className="rs-empty">
            <div className="rs-empty__icon-wrap">
              <Star size={32} />
            </div>
            <h3 className="rs-empty__title">No reviews yet</h3>
            <p className="rs-empty__desc">
              Be the first to share feedback and review your experience with {targetName}.
            </p>
            {!isSelf && (
              <button 
                type="button" 
                onClick={openCreateModal} 
                className="rs-btn rs-btn--primary"
                style={{ marginTop: '0.75rem' }}
              >
                Write the First Review
              </button>
            )}
          </div>
        ) : (
          reviews.map((rev) => {
            const reviewer = rev.reviewerId || {};
            const isMyRev = isUserMatch(rev);
            const reviewerName = [reviewer.firstName, reviewer.lastName].filter(Boolean).join(' ') || (isMyRev ? 'You' : 'Verified User');
            const initial = reviewer.firstName?.charAt(0) || 'U';

            return (
              <div 
                key={rev._id} 
                className={`rs-card ${isMyRev ? 'rs-card--mine' : ''}`}
              >
                <div className="rs-card__header">
                  <div className="rs-card__user">
                    <div className="rs-card__avatar">
                      {reviewer.profilePicture ? (
                        <img src={reviewer.profilePicture} alt={reviewerName} />
                      ) : (
                        <span>{initial}</span>
                      )}
                    </div>
                    <div className="rs-card__meta">
                      <div className="rs-card__name-row">
                        <h4 className="rs-card__name">{reviewerName}</h4>
                        {isMyRev && <span className="rs-badge-mine">You</span>}
                      </div>
                      <div className="rs-card__sub">
                        <div className="rs-card__stars">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={14}
                              fill={s <= rev.rating ? '#f59e0b' : '#e2e8f0'}
                              color={s <= rev.rating ? '#f59e0b' : '#cbd5e1'}
                            />
                          ))}
                        </div>
                        <span className="rs-card__dot">•</span>
                        <span className="rs-card__date">
                          <Calendar size={12} style={{ display: 'inline', marginRight: '3px' }} />
                          {new Date(rev.createdAt).toLocaleDateString(undefined, { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for review owner */}
                  {isMyRev && (
                    <div className="rs-card__actions">
                      <button 
                        type="button" 
                        onClick={() => openEditModal(rev)} 
                        className="rs-action-pill-btn rs-action-pill-btn--edit" 
                        title="Edit review"
                      >
                        <Edit3 size={13} /> <span>Edit</span>
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setDeleteId(rev._id)} 
                        className="rs-action-pill-btn rs-action-pill-btn--delete" 
                        title="Delete review"
                      >
                        <Trash2 size={13} /> <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Review Body */}
                {rev.comment && (
                  <p className="rs-card__comment">{rev.comment}</p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Review Create / Edit Modal */}
      {modalMode && (
        <div className="rs-modal-overlay" onClick={closeModal}>
          <div className="rs-modal" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="rs-modal__header">
              <h3 className="rs-modal__title">
                {modalMode === 'create' ? 'Write a Review' : 'Edit Your Review'}
              </h3>
              <button 
                type="button" 
                onClick={closeModal} 
                className="rs-modal__close" 
                disabled={submitting}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="rs-modal__body">
              <p className="rs-modal__desc">
                Share your authentic feedback about working with <strong>{targetName}</strong>.
              </p>

              {/* Star Selector */}
              <div className="rs-star-picker-wrap">
                <div className="rs-star-picker">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      className="rs-star-btn"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                    >
                      <Star
                        size={32}
                        className={`rs-star-icon ${star <= (hoverRating || rating) ? 'rs-star-icon--active' : ''}`}
                        fill={star <= (hoverRating || rating) ? '#f59e0b' : 'transparent'}
                        color={star <= (hoverRating || rating) ? '#f59e0b' : '#cbd5e1'}
                      />
                    </button>
                  ))}
                </div>
                <div className="rs-star-picker-label">
                  {getRatingLabel(hoverRating || rating)}
                </div>
              </div>

              {/* Comment Textarea */}
              <div className="rs-field-group">
                <label className="rs-field-label">
                  Your Review / Comments
                  <span className="rs-field-count">{comment.length} / 1000</span>
                </label>
                <textarea
                  className="rs-textarea"
                  rows={4}
                  maxLength={1000}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="How was the communication, work quality, deadline reliability, and overall collaboration?"
                  disabled={submitting}
                />
              </div>

              {/* Modal Footer */}
              <div className="rs-modal__footer">
                <button
                  type="button"
                  className="rs-btn rs-btn--ghost"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rs-btn rs-btn--primary"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader size="sm" text="" /> Saving...
                    </>
                  ) : modalMode === 'create' ? (
                    'Submit Review'
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="rs-modal-overlay" onClick={() => !deleting && setDeleteId(null)}>
          <div className="rs-modal rs-modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="rs-modal__header">
              <h3 className="rs-modal__title" style={{ color: '#ef4444' }}>
                <AlertCircle size={20} style={{ display: 'inline', marginRight: '6px' }} />
                Delete Review?
              </h3>
              <button 
                type="button" 
                onClick={() => setDeleteId(null)} 
                className="rs-modal__close" 
                disabled={deleting}
              >
                <X size={18} />
              </button>
            </div>
            <div className="rs-modal__body">
              <p style={{ margin: '0 0 1.25rem 0', color: '#475569', fontSize: '0.92rem', lineHeight: 1.5 }}>
                Are you sure you want to delete this review? Your rating and comments will be permanently removed.
              </p>
              <div className="rs-modal__footer">
                <button
                  type="button"
                  className="rs-btn rs-btn--ghost"
                  onClick={() => setDeleteId(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rs-btn rs-btn--danger"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
