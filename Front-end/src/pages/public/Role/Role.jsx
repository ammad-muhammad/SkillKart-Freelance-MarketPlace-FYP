import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Briefcase, Code, ArrowLeft, AlertCircle, CheckCircle, Loader } from "lucide-react";
import { authAPI } from "../../../api/auth";
import { useAuth } from '../../../hooks/useAuth'
import "../../../Components/common/Hero/Hero.css";

const Role = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated, loading: authLoading, refreshAuth } = useAuth();
    const [role, setRole] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const sectionRef = useRef(null);
    const tagRef = useRef(null);
    const headingRef = useRef(null);
    const contentRef = useRef(null);
    const visualRef = useRef(null);
    const bgRef = useRef(null);

    useEffect(() => {
        if (!authLoading) {
            // If not authenticated, redirect to home
            if (!isAuthenticated) {
                navigate('/');
                return;
            }

            if (['freelancer', 'client'].includes(user?.role)) {
                const userRole = user?.role;
                const isOnboardingCompleted = user?.isOnBoardingCompleted;
                
                console.log(`🧭 Role redirect: Role=${userRole}, OnboardingCompleted=${isOnboardingCompleted}`);
                
                if (userRole === 'client') {
                    isOnboardingCompleted ? navigate('/client/dashboard') : navigate('/client/onboarding')
                } else if (userRole === 'freelancer') {
                    isOnboardingCompleted ? navigate('/freelancer/dashboard') : navigate('/freelancer/onboarding')
                } else {
                    navigate('/404');
                }
                return;
            }
        }
    }, [isAuthenticated, user, authLoading, navigate]);

    useEffect(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.4 });

        tl.fromTo(bgRef.current, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power2.inOut' })
            .fromTo(tagRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.6')
            .fromTo(headingRef.current?.querySelectorAll('.hero__word'), { y: 60, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.7, ease: 'power4.out' }, '-=0.2')
            .fromTo(contentRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.3')
            .fromTo(visualRef.current, { x: 60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, '-=1.2');

        const orbs = sectionRef.current?.querySelectorAll('.hero__orb');
        const onMouseMove = (e) => {
            const { innerWidth: W, innerHeight: H } = window;
            const xPct = (e.clientX / W - 0.5) * 2;
            const yPct = (e.clientY / H - 0.5) * 2;
            orbs?.forEach((orb, i) => {
                const depth = (i + 1) * 12;
                gsap.to(orb, { x: xPct * depth, y: yPct * depth, duration: 1.2, ease: 'power2.out' });
            });
        };
        window.addEventListener('mousemove', onMouseMove);
        return () => window.removeEventListener('mousemove', onMouseMove);
    }, [0]);

    const headingWords = ['Tell', 'Us', 'More,', 'About', 'Yourself.'];

    const handleSubmit = async (e) => {
        if (role == "") return;

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const userResponse = await authAPI.updateRole({
                role: role
            });

            await refreshAuth(); // Refresh local user state with the new role
            setSuccess("Registration successful! Redirecting...");

            // Redirect to OTP verification page after 2 seconds
            setTimeout(() => {
                navigate(`/${role}/onboarding`);
            }, 2000);

        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'An error occurred. Please try again.';
            setError(errorMessage);
            setLoading(false);
        }
    };

    const handleRoleSelect = (selectedRole) => {
        setRole(selectedRole);
        setError("");
    };

    return (
        <section ref={sectionRef} className="hero">
            <div ref={bgRef} className="hero__bg">
                <div className="hero__orb hero__orb--1" />
                <div className="hero__orb hero__orb--2" />
                <div className="hero__orb hero__orb--3" />
                <div className="hero__grid-overlay" />
            </div>

            <div className="container hero__inner">
                <div className="hero__copy">
                    <div ref={tagRef} className="section-tag hero__tag" style={{ color: '#e3e5e8ff', borderColor: 'rgba(14, 14, 14, 0.35)', background: 'rgba(160, 168, 179, 0.1)' }}>
                        <span>🚀</span> Select Your Role
                    </div>

                    <h1 ref={headingRef} className="hero__heading">
                        {headingWords.map((w, i) => (
                            <span key={i} className="hero__word">
                                {w}{i === 2 ? ' ' : ' '}
                            </span>
                        ))}
                    </h1>

                    <div ref={contentRef} className="hero__auth-container" style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '24px',
                        padding: '35px',
                        backdropFilter: 'blur(12px)',
                        maxWidth: '480px',
                        width: '100%'
                    }}>
                        {/* Error Alert */}
                        {error && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '12px',
                                padding: '12px 15px',
                                marginBottom: '20px',
                                display: 'flex',
                                gap: '10px',
                                alignItems: 'flex-start'
                            }}>
                                <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                                <p style={{ color: '#fca5a5', fontSize: '13px', margin: 0, fontWeight: '500' }}>
                                    {error}
                                </p>
                            </div>
                        )}

                        {/* Success Alert */}
                        {success && (
                            <div style={{
                                background: 'rgba(34, 197, 94, 0.1)',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                borderRadius: '12px',
                                padding: '12px 15px',
                                marginBottom: '20px',
                                display: 'flex',
                                gap: '10px',
                                alignItems: 'flex-start'
                            }}>
                                <CheckCircle size={18} style={{ color: '#22c55e', flexShrink: 0, marginTop: '2px' }} />
                                <p style={{ color: '#86efac', fontSize: '13px', margin: 0, fontWeight: '500' }}>
                                    {success}
                                </p>
                            </div>
                        )}

                        <p style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginBottom: '25px' }}>How would you like to join our community?</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
                            <button
                                onClick={() => handleRoleSelect("client")}
                                style={{
                                    background: role === "client" ? 'var(--color-accent)' : 'rgba(255,255,255,0.03)',
                                    border: role === "client" ? '1px solid white' : '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '20px',
                                    padding: '25px 20px',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                }}
                            >
                                <Briefcase size={28} style={{ color: role === "client" ? 'black' : 'white', marginBottom: '12px' }} />
                                <div style={{ color: role === "client" ? 'black' : 'white', fontWeight: '900', fontSize: '18px' }}>Client</div>
                                <div style={{ color: role === "client" ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '600', marginTop: '4px' }}>Hire Elite Talent</div>
                            </button>
                            <button
                                onClick={() => handleRoleSelect("freelancer")}
                                style={{
                                    background: role === "freelancer" ? 'var(--color-accent)' : 'rgba(255,255,255,0.03)',
                                    border: role === "freelancer" ? '1px solid white' : '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '20px',
                                    padding: '25px 20px',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                }}
                            >
                                <Code size={28} style={{ color: role === "freelancer" ? 'black' : 'white', marginBottom: '12px' }} />
                                <div style={{ color: role === "freelancer" ? 'black' : 'white', fontWeight: '900', fontSize: '18px' }}>Freelancer</div>
                                <div style={{ color: role === "freelancer" ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '600', marginTop: '4px' }}>Offer Your Skills</div>
                            </button>
                        </div>
                        <button
                            onClick={() => role && handleSubmit()}
                            disabled={!role}
                            className="hero__btn-main"
                            style={{ width: '100%', justifyContent: 'center', border: 'none', cursor: role ? 'pointer' : 'not-allowed', padding: '16px', opacity: role ? 1 : 0.4 }}
                        >
                            Continue <ArrowRight size={18} />
                        </button>
                    </div>
                </div>

                <div ref={visualRef} className="hero__visual">
                    <div className="hero__dashboard">
                        <div className="hero__dashboard-header">
                            <div className="hero__dashboard-dots">
                                <span style={{ background: "#ff5f57" }} />
                                <span style={{ background: "#febc2e" }} />
                                <span style={{ background: "#28c840" }} />
                            </div>
                            <span className="hero__dashboard-title">Registration Status</span>
                        </div>
                        <div className="hero__dashboard-body">
                            <div className="hero__db-profile">
                                <div className="hero__db-avatar">✨</div>
                                <div>
                                    <div className="hero__db-name">Welcome Gift</div>
                                    <div className="hero__db-role">100 SkillCredits Pending</div>
                                </div>
                            </div>
                            <div className="hero__db-ai">
                                <div className="hero__db-ai-icon">🤖</div>
                                <div>
                                    <div className="hero__db-ai-title">Buddy AI Insight</div>
                                    <div className="hero__db-ai-text">
                                        Join as a {role || 'member'} and get access to AI-powered project matching and smart verification!
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="hero__wave">
                <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                    <path d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z" fill="#FFFFFF" />
                </svg>
            </div>

            <style>
                {`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}
            </style>
        </section>
    );
};

export default Role;