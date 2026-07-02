const fs = require('fs'); 
const path = 'Front-end/src/pages/client/ClientDashboard.css'; 
let content = fs.readFileSync(path, 'utf8'); 
const insertion = `
.cl-badge--open       { background: rgba(16,185,129,0.12); color: #059669; }
.cl-badge--in-progress { background: rgba(59,130,246,0.12); color: #2563eb; }
.cl-badge--completed  { background: rgba(107,114,128,0.12); color: #6b7280; }
.cl-badge--draft      { background: rgba(245,158,11,0.12); color: #d97706; }

/* Clickable stat cards (dashboard drill-down) */
.cl-stat-card--link { text-decoration: none; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.cl-stat-card--link:hover { transform: translateY(-5px) scale(1.02); box-shadow: 0 20px 40px -15px rgba(4,46,76,0.15); }

/* ── Stat Card ── */
.cl-stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(175px, 1fr));
  gap: 1.25rem; margin-bottom: 2rem;
}

.cl-stat-card {
  background: linear-gradient(145deg, #ffffff, #f8faff);
  border-radius: 20px;
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  box-shadow: 0 10px 30px -10px rgba(4, 46, 76, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.8);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.cl-stat-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; height: 4px;
  background: var(--gradient-primary);
  opacity: 0;
  transition: opacity 0.3s;
}

.cl-stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px -15px rgba(4, 46, 76, 0.12);
  border-color: rgba(255, 255, 255, 1);
}

.cl-stat-card:hover::before {
  opacity: 1;
}

.cl-stat-card__bg {
  position: absolute;
  right: -5%;
  bottom: -15%;
  opacity: 0.03;
  transform: scale(4) rotate(-15deg);
  color: var(--color-primary);
  pointer-events: none;
  transition: all 0.5s ease;
}

.cl-stat-card:hover .cl-stat-card__bg {
  transform: scale(4.5) rotate(0deg);
  opacity: 0.06;
}

.cl-stat-card__icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, rgba(26, 111, 168, 0.1), rgba(26, 111, 168, 0.03));
  color: var(--color-primary);
  transition: all 0.3s ease;
  z-index: 1;
}

.cl-stat-card:hover .cl-stat-card__icon {
  transform: scale(1.1) rotate(5deg);
  background: var(--gradient-primary);
  color: #fff;
  box-shadow: 0 8px 15px rgba(26, 111, 168, 0.2);
}

.cl-stat-card__value {
  font-family: var(--font-heading);
  font-size: 2.2rem;
  font-weight: 800;
  background: linear-gradient(90deg, var(--color-primary), #0a4f80);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1.1;
  letter-spacing: -0.5px;
  z-index: 1;
}

.cl-stat-card__label {
  font-size: 0.9rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  z-index: 1;
}
`; 
content = content.replace(/text-transform: uppercase; letter-spacing: 0.04em;\r?\n\}/, 'text-transform: uppercase; letter-spacing: 0.04em;\n}' + insertion); 
fs.writeFileSync(path, content);
