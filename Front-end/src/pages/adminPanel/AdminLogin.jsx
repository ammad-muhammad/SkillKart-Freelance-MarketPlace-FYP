import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';

const AdminLogin = () => {
  const { login, verifyOtp, isAuthenticated, loading } = useAdminAuth();
  const navigate      = useNavigate();
  const [params]      = useSearchParams();

  // Step: 'credentials' | 'otp'
  const [step, setStep]       = useState('credentials');
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [otp, setOtp]         = useState('');
  const [error, setError]     = useState('');
  const [info, setInfo]       = useState('');
  const [busy, setBusy]       = useState(false);

  // If already logged in, go straight to dashboard
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/admin-panel/dashboard', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  // Show reason message on redirect
  useEffect(() => {
    const reason = params.get('reason');
    if (reason === 'session_expired') setInfo('Your session expired. Please log in again.');
    else if (reason === 'session_timeout') setInfo('Session timed out due to inactivity.');
  }, [params]);

  const handleCredentials = async (e) => {
    e.preventDefault();
    setError(''); setInfo('');
    setBusy(true);
    try {
      await login(email.trim(), password);
      setStep('otp');
      setInfo(`OTP sent to ${email.trim()}. Check your inbox.`);
    } catch (err) {
      setError(err?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  const handleOtp = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await verifyOtp(otp.trim());
      navigate('/admin-panel/dashboard', { replace: true });
    } catch (err) {
      setError(err?.message || 'Invalid OTP');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top left, #0B2942 0%, #061A2B 60%, #030D16 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', sans-serif",
      padding: '24px'
    }}>
      {/* Background grid decoration */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(16,185,129,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.04) 1px, transparent 1px)',
        backgroundSize: '48px 48px'
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, margin: '0 auto 14px',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.8rem', boxShadow: '0 8px 32px rgba(16,185,129,0.35)'
          }}>🛡️</div>
          <h1 style={{ color: '#F1F5F9', fontSize: '1.4rem', fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' }}>SkillKart Admin</h1>
          <p style={{ color: '#94A3B8', fontSize: '0.85rem', margin: 0 }}>Secure administrative workspace</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(11, 41, 66, 0.85)',
          border: '1px solid rgba(226, 232, 240, 0.12)',
          borderRadius: 20, padding: '32px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(16px)'
        }}>
          {/* Step indicator */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {['Credentials', 'OTP'].map((s, i) => (
              <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', fontSize: '0.72rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: i === 0 && step === 'credentials' ? '#10B981' : i === 1 && step === 'otp' ? '#10B981' : step === 'otp' && i === 0 ? '#10B981' : 'rgba(255,255,255,0.08)',
                  color: (i === 0 && step === 'credentials') || (i === 1 && step === 'otp') || (step === 'otp' && i === 0) ? '#fff' : '#94A3B8',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  {step === 'otp' && i === 0 ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: '0.78rem', color: (i === 0 && step === 'credentials') || (i === 1 && step === 'otp') ? '#F1F5F9' : '#64748B', fontWeight: 600 }}>{s}</span>
                {i < 1 && <div style={{ flex: 1, height: 1, background: step === 'otp' ? '#10B981' : 'rgba(255,255,255,0.1)' }} />}
              </div>
            ))}
          </div>

          {/* Info banner */}
          {info && (
            <div style={{
              background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 18,
              color: '#A7F3D0', fontSize: '0.83rem', display: 'flex', gap: 8, alignItems: 'flex-start'
            }}>
              <span>ℹ️</span><span>{info}</span>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 18,
              color: '#FCA5A5', fontSize: '0.83rem', display: 'flex', gap: 8, alignItems: 'flex-start'
            }}>
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          {/* ── Step 1: credentials ─────────────────────────────── */}
          {step === 'credentials' && (
            <form onSubmit={handleCredentials} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  Admin Email
                </label>
                <input
                  type="email" required autoFocus
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="admin@skillkart.app"
                  style={{
                    width: '100%', background: 'rgba(6, 26, 43, 0.7)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10, padding: '11px 14px', fontSize: '0.9rem', color: '#F1F5F9',
                    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={e => e.target.style.borderColor = '#10B981'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  Password
                </label>
                <input
                  type="password" required
                  value={password} onChange={e => setPass(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%', background: 'rgba(6, 26, 43, 0.7)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10, padding: '11px 14px', fontSize: '0.9rem', color: '#F1F5F9',
                    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={e => e.target.style.borderColor = '#10B981'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                />
              </div>
              <button
                type="submit" disabled={busy}
                style={{
                  width: '100%', padding: '12px', borderRadius: 10,
                  background: busy ? '#064E3B' : 'linear-gradient(135deg, #10B981, #059669)',
                  color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                  border: 'none', cursor: busy ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: busy ? 'none' : '0 4px 16px rgba(16,185,129,0.3)',
                  transition: 'all 0.2s'
                }}
              >
                {busy ? (
                  <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Verifying…</>
                ) : 'Continue →'}
              </button>
            </form>
          )}

          {/* ── Step 2: OTP ─────────────────────────────────────── */}
          {step === 'otp' && (
            <form onSubmit={handleOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📬</div>
                <p style={{ color: '#94A3B8', fontSize: '0.85rem', margin: 0 }}>
                  A 6-digit OTP was sent to <strong style={{ color: '#F1F5F9' }}>{email}</strong>
                </p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  Enter OTP
                </label>
                <input
                  type="text" required autoFocus maxLength={6} pattern="\d{6}"
                  value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  style={{
                    width: '100%', background: 'rgba(6, 26, 43, 0.7)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10, padding: '14px', fontSize: '1.5rem', color: '#10B981',
                    outline: 'none', fontFamily: 'monospace', textAlign: 'center', letterSpacing: '0.5em',
                    boxSizing: 'border-box', fontWeight: 700, transition: 'border-color 0.2s'
                  }}
                  onFocus={e => e.target.style.borderColor = '#10B981'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                />
              </div>
              <button
                type="submit" disabled={busy || otp.length !== 6}
                style={{
                  width: '100%', padding: '12px', borderRadius: 10,
                  background: (busy || otp.length !== 6) ? '#064E3B' : 'linear-gradient(135deg, #10B981, #059669)',
                  color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                  border: 'none', cursor: (busy || otp.length !== 6) ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: (busy || otp.length !== 6) ? 'none' : '0 4px 16px rgba(16,185,129,0.3)',
                  transition: 'all 0.2s'
                }}
              >
                {busy ? (
                  <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Verifying…</>
                ) : 'Verify & Login 🔓'}
              </button>
              <button
                type="button" onClick={() => { setStep('credentials'); setError(''); setInfo(''); setOtp(''); }}
                style={{ background: 'none', border: 'none', color: '#10B981', cursor: 'pointer', fontSize: '0.83rem', fontFamily: 'inherit', padding: 0, textDecoration: 'underline', textUnderlineOffset: 3 }}
              >
                ← Back to credentials
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: 20, color: '#64748B', fontSize: '0.75rem' }}>
          🔒 Secured with 2FA • SkillKart Admin Panel
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AdminLogin;
