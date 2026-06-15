import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function SkillCard({ skill, categorySlug, gigCount }) {
  const navigate = useNavigate();
  // Prefer the REAL live gig count when the parent provides it; fall back to the
  // static taxonomy number only when it's not passed.
  const count = gigCount != null ? gigCount : (skill.totalGigs ?? skill.totalServices ?? 0);

  return (
    <div
      className="mp-skill-card"
      onClick={() => navigate(`/skills/${categorySlug}/${skill.slug}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          navigate(`/skills/${categorySlug}/${skill.slug}`);
        }
      }}
    >
      <div className="mp-skill-card__icon">{skill.icon}</div>
      <div className="mp-skill-card__name">{skill.name}</div>
      <div className="mp-skill-card__desc">{skill.description}</div>
      <div className="mp-skill-card__footer">
        <span className="mp-skill-card__count">
          {count.toLocaleString()} gig{count === 1 ? '' : 's'}
        </span>
        <ArrowRight size={17} className="mp-skill-card__arrow" />
      </div>
    </div>
  );
}
