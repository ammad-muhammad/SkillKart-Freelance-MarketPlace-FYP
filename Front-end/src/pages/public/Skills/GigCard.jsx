import { Star } from "lucide-react";

export default function GigCard({ gig }) {
  return (
    <div className="mp-gig-card">
      <div className="mp-gig-card__img-wrap">
        <img
          src={gig.image || `https://picsum.photos/seed/${gig.id}/400/220`}
          alt={gig.title}
          loading="lazy"
          onError={(e) => {
            e.target.src = `https://picsum.photos/seed/${gig.id + 100}/400/220`;
          }}
        />
        <div className="mp-gig-card__overlay">
          <button className="mp-gig-card__overlay-btn">View Gig</button>
        </div>
      </div>

      <div className="mp-gig-card__body">
        <div className="mp-gig-card__freelancer">
          <img
            src={gig.freelancerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${gig.freelancerName}`}
            alt={gig.freelancerName}
            onError={(e) => {
              e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${gig.freelancerName}`;
            }}
          />
          <span className="mp-gig-card__freelancer-name">{gig.freelancerName}</span>
        </div>

        <div className="mp-gig-card__title">{gig.title}</div>

        <div className="mp-gig-card__meta">
          <div className="mp-gig-card__rating">
            <Star size={13} fill="currentColor" />
            {gig.rating}
            <span className="mp-gig-card__reviews">({gig.reviews})</span>
          </div>
          <div className="mp-gig-card__price">
            <span>From </span>${gig.price}
          </div>
        </div>
      </div>
    </div>
  );
}
