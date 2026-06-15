import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import { freelancersAPI } from '../../../api/freelancers';
import { useAuth } from '../../../hooks/useAuth';
import { useClient } from '../../../context/ClientContext';
import './PublicFreelancerProfile.css';

const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const availabilityLabel = (a) => ({
  'full-time': 'Available full-time',
  'part-time': 'Available part-time',
  'contract': 'Open to contracts',
  'not-available': 'Not available',
}[a] || 'Availability on request');

export default function PublicFreelancerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { savedFreelancers, toggleSavedFreelancer } = useClient();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    document.title = 'Freelancer Profile — SkillKart';

    freelancersAPI.getById(id)
      .then((res) => {
        if (!active) return;
        const p = res.data?.data?.profile;
        if (!p) { setError('notfound'); return; }
        setProfile(p);
        const u = p.userId || {};
        const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
        if (name) document.title = `${name} — SkillKart`;
      })
      .catch((err) => {
        if (!active) return;
        setError(err.response?.status === 404 ? 'notfound' : (err.response?.data?.message || 'Failed to load profile'));
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [id]);

  const u = profile?.userId || {};
  const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Freelancer';
  const isSaved = savedFreelancers.some((f) => f.id === (u._id || id));
  const isClient = user?.role === 'client';

  const handleSave = () => {
    toggleSavedFreelancer({
      id: u._id || id,
      _id: u._id || id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      profilePicture: u.profilePicture,
      rating: profile?.rating,
      freelancerProfile: profile,
    });
  };

  const handleContact = () => {
    if (!user) { navigate('/login'); return; }
    // Messaging is initiated from the dashboard; send the client there.
    navigate(isClient ? '/client/messages' : '/freelancer/messages');
  };

  return (
    <>
      <Navbar />
      <div className="pfp-page">
        {loading ? (
          <div className="pfp-state">
            <div className="pfp-spinner" />
            <p>Loading profile…</p>
          </div>
        ) : error === 'notfound' ? (
          <div className="pfp-state">
            <div className="pfp-state__icon">🔍</div>
            <h2>Freelancer not found</h2>
            <p>This profile doesn’t exist or is no longer available.</p>
            <Link to="/browse-freelancers" className="pfp-btn pfp-btn--primary">Browse Freelancers</Link>
          </div>
        ) : error ? (
          <div className="pfp-state">
            <div className="pfp-state__icon">⚠️</div>
            <h2>Couldn’t load profile</h2>
            <p>{error}</p>
            <button className="pfp-btn pfp-btn--primary" onClick={() => navigate(0)}>Try Again</button>
          </div>
        ) : (
          <div className="container pfp-container">
            {/* Header card */}
            <div className="pfp-card pfp-header">
              <div className="pfp-header__avatar">
                {u.profilePicture
                  ? <img src={u.profilePicture} alt={fullName} />
                  : <span>{(u.firstName?.[0] || 'F').toUpperCase()}</span>}
              </div>
              <div className="pfp-header__main">
                <div className="pfp-header__top">
                  <h1 className="pfp-name">{fullName}</h1>
                  {profile.verificationStatus === 'verified' && (
                    <span className="pfp-verified">✓ Verified</span>
                  )}
                </div>
                <p className="pfp-title">{profile.title || 'Freelancer'}</p>
                <div className="pfp-meta">
                  <span>★ {(profile.rating || 0).toFixed(1)}</span>
                  <span className="pfp-meta__sep">·</span>
                  <span>{profile.completedProjects || 0} projects</span>
                  <span className="pfp-meta__sep">·</span>
                  <span>📍 {profile.timezone || 'Global'}</span>
                  <span className="pfp-meta__sep">·</span>
                  <span>{availabilityLabel(profile.availability)}</span>
                </div>
              </div>
              <div className="pfp-header__aside">
                {profile.hourlyRate ? (
                  <div className="pfp-rate"><strong>${profile.hourlyRate}</strong><span>/hr</span></div>
                ) : null}
                <button className="pfp-btn pfp-btn--primary" onClick={handleContact}>Contact</button>
                {isClient && (
                  <button className="pfp-btn pfp-btn--ghost" onClick={handleSave}>
                    {isSaved ? '🔖 Saved' : '📑 Save'}
                  </button>
                )}
              </div>
            </div>

            <div className="pfp-grid">
              <div className="pfp-col-main">
                {/* About */}
                {profile.bio && (
                  <section className="pfp-card">
                    <h2 className="pfp-section-title">About</h2>
                    <p className="pfp-bio">{profile.bio}</p>
                  </section>
                )}

                {/* Portfolio */}
                {Array.isArray(profile.portfolio) && profile.portfolio.length > 0 && (
                  <section className="pfp-card">
                    <h2 className="pfp-section-title">Portfolio</h2>
                    <div className="pfp-portfolio">
                      {profile.portfolio.map((item, i) => (
                        <div key={i} className="pfp-portfolio__item">
                          {item.images?.[0] && <img src={item.images[0]} alt={item.title} />}
                          <div className="pfp-portfolio__body">
                            <h3>{item.title}</h3>
                            {item.description && <p>{item.description}</p>}
                            {item.url && (
                              <a href={item.url} target="_blank" rel="noopener noreferrer" className="pfp-link">
                                View project →
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Education */}
                {Array.isArray(profile.education) && profile.education.length > 0 && (
                  <section className="pfp-card">
                    <h2 className="pfp-section-title">Education</h2>
                    {profile.education.map((e, i) => (
                      <div key={i} className="pfp-entry">
                        <div className="pfp-entry__title">{e.degree}{e.field ? `, ${e.field}` : ''}</div>
                        <div className="pfp-entry__sub">{e.institution}</div>
                        {(e.startDate || e.endDate) && (
                          <div className="pfp-entry__date">{fmtDate(e.startDate)} – {e.endDate ? fmtDate(e.endDate) : 'Present'}</div>
                        )}
                      </div>
                    ))}
                  </section>
                )}

                {/* Certifications */}
                {Array.isArray(profile.certifications) && profile.certifications.length > 0 && (
                  <section className="pfp-card">
                    <h2 className="pfp-section-title">Certifications</h2>
                    {profile.certifications.map((c, i) => (
                      <div key={i} className="pfp-entry">
                        <div className="pfp-entry__title">{c.name}</div>
                        <div className="pfp-entry__sub">{c.issuer}{c.issueDate ? ` · ${fmtDate(c.issueDate)}` : ''}</div>
                        {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" className="pfp-link">View credential →</a>}
                      </div>
                    ))}
                  </section>
                )}
              </div>

              <aside className="pfp-col-side">
                {/* Skills */}
                <section className="pfp-card">
                  <h2 className="pfp-section-title">Skills</h2>
                  {Array.isArray(profile.skills) && profile.skills.length > 0 ? (
                    <div className="pfp-skills">
                      {profile.skills.map((s, i) => (
                        <span key={i} className={`pfp-skill${s.isVerified ? ' pfp-skill--verified' : ''}`}>
                          {s.name}{s.isVerified && <span title="AI-verified"> ✓</span>}
                        </span>
                      ))}
                    </div>
                  ) : <p className="pfp-muted">No skills listed yet.</p>}
                </section>

                {/* Languages */}
                {Array.isArray(profile.languages) && profile.languages.length > 0 && (
                  <section className="pfp-card">
                    <h2 className="pfp-section-title">Languages</h2>
                    <ul className="pfp-langs">
                      {profile.languages.map((l, i) => (
                        <li key={i}><span>{typeof l.language === 'object' ? l.language?.name : l.language}</span><span className="pfp-muted">{l.proficiency}</span></li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Links */}
                {(profile.socialLinks?.github || profile.socialLinks?.linkedin || profile.socialLinks?.website || (profile.portfolioLinks?.length > 0)) && (
                  <section className="pfp-card">
                    <h2 className="pfp-section-title">Links</h2>
                    <div className="pfp-social">
                      {profile.socialLinks?.github && <a href={profile.socialLinks.github} target="_blank" rel="noopener noreferrer" className="pfp-link">GitHub</a>}
                      {profile.socialLinks?.linkedin && <a href={profile.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="pfp-link">LinkedIn</a>}
                      {profile.socialLinks?.website && <a href={profile.socialLinks.website} target="_blank" rel="noopener noreferrer" className="pfp-link">Website</a>}
                      {(profile.portfolioLinks || []).map((l, i) => (
                        <a key={i} href={l} target="_blank" rel="noopener noreferrer" className="pfp-link">{l.replace(/^https?:\/\//, '').slice(0, 28)}</a>
                      ))}
                    </div>
                  </section>
                )}
              </aside>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
