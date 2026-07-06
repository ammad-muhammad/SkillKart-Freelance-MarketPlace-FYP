import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { jobsAPI } from '../../../api/jobs';
import './ReviewModal.css';

export default function ReviewModal({ jobId, targetName, onClose, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating < 1) {
      toast.error('Please select a star rating.');
      return;
    }
    if (comment.trim().length > 0 && comment.trim().length < 5) {
      toast.error('If you choose to write a review, please write at least 5 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await jobsAPI.reviewJob(jobId, { rating, comment: comment.trim() });
      toast.success('Review submitted successfully!');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rm-overlay" onClick={onClose}>
      <div className="rm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rm-header">
          <h3>Leave a Review</h3>
          <button className="rm-close" onClick={onClose} disabled={submitting}>
            <X size={20} />
          </button>
        </div>
        
        <form className="rm-body" onSubmit={handleSubmit}>
          <p className="rm-subtitle">
            How was your experience working with <strong>{targetName}</strong>?
          </p>

          <div className="rm-stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={32}
                className={`rm-star ${star <= (hoverRating || rating) ? 'rm-star--active' : ''}`}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              />
            ))}
          </div>

          <div className="rm-form-group">
            <label className="rm-label">Write your review (Optional)</label>
            <textarea
              className="rm-textarea"
              placeholder="What went well? What could be improved?"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="rm-footer">
            <button type="button" className="rm-btn rm-btn--ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="rm-btn rm-btn--primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
