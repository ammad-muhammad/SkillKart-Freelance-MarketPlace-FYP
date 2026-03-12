import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function SkillCard({ skill, categorySlug }) {
  const navigate = useNavigate();

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
          {skill.totalGigs?.toLocaleString() ?? skill.totalServices} gigs
        </span>
        <ArrowRight size={17} className="mp-skill-card__arrow" />
      </div>
    </div>
  );
}
