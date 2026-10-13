import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const getDynamicIcon = (name) => {
  if (!name) return '⚙️';
  const lower = name.toLowerCase();
  
  if (lower.match(/react|vue|angular|html|css|js|javascript|typescript|next|node|express|web/)) return '🌐';
  if (lower.match(/swift|kotlin|android|ios|flutter|native|mobile/)) return '📱';
  if (lower.match(/sql|mongo|database|postgres|redis|data/)) return '🗄️';
  if (lower.match(/aws|azure|gcp|cloud|docker|kubernetes|devops/)) return '☁️';
  if (lower.match(/figma|design|ui|ux|photoshop|illustrator/)) return '🎨';
  if (lower.match(/security|cyber|auth|crypto/)) return '🔒';
  if (lower.match(/testing|qa|jest|cypress|selenium/)) return '🧪';
  if (lower.match(/manage|agile|scrum|product|project/)) return '📋';
  if (lower.match(/java|python|c#|c\+\+|go|ruby|rust|php|backend|code|programming/)) return '💻';
  
  // Hash to a set of generic tech emojis for anything else
  const generic = ['⚙️', '🛠️', '🖥️', '💡', '🚀', '⚡'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return generic[Math.abs(hash) % generic.length];
};

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
      <div className="mp-skill-card__icon">{skill.icon || getDynamicIcon(skill.name)}</div>
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
