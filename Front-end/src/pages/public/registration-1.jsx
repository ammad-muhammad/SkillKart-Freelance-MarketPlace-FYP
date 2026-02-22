import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { Mail, Lock, Eye, EyeOff, ArrowRight, User, Briefcase, Code, ArrowLeft } from "lucide-react";
import "../../Components/common/Hero/Hero.css";

const Registration1 = () => {
    const [step, setStep] = useState(1); // 1: Role, 2: Details
    const [role, setRole] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: ""
    });

    const sectionRef = useRef(null);
    const tagRef = useRef(null);
    const headingRef = useRef(null);
    const contentRef = useRef(null);
    const visualRef = useRef(null);
    const bgRef = useRef(null);

    useEffect(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.4 });

        tl.fromTo(bgRef.current, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power2.inOut' })
            .fromTo(tagRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.6')
            .fromTo(headingRef.current.querySelectorAll('.hero__word'), { y: 60, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.7, ease: 'power4.out' }, '-=0.2')
            .fromTo(contentRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.3')
            .fromTo(visualRef.current, { x: 60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, '-=1.2');

        const orbs = sectionRef.current.querySelectorAll('.hero__orb');
        const onMouseMove = (e) => {
            const { innerWidth: W, innerHeight: H } = window;
            const xPct = (e.clientX / W - 0.5) * 2;
            const yPct = (e.clientY / H - 0.5) * 2;
            orbs.forEach((orb, i) => {
                const depth = (i + 1) * 12;
                gsap.to(orb, { x: xPct * depth, y: yPct * depth, duration: 1.2, ease: 'power2.out' });
            });
        };
        window.addEventListener('mousemove', onMouseMove);
        return () => window.removeEventListener('mousemove', onMouseMove);
    }, [step]);

    const headingWords = step === 1 ? ['Start', 'Your', 'Journey,', 'Join', 'Skill', 'Kart.'] : ['Tell', 'Us', 'More,', 'About', 'Yourself.'];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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
                        <span>🚀</span> Create Your Profile
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
                        {step === 1 ? (
                            <>
                                <p style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginBottom: '25px' }}>How would you like to join our community?</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
                                    <button
                                        onClick={() => setRole("client")}
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
                                        onClick={() => setRole("freelancer")}
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
                                    onClick={() => role && setStep(2)}
                                    disabled={!role}
                                    className="hero__btn-main"
                                    style={{ width: '100%', justifyContent: 'center', border: 'none', cursor: role ? 'pointer' : 'not-allowed', padding: '16px', opacity: role ? 1 : 0.4 }}
                                >
                                    Continue <ArrowRight size={18} />
                                </button>
                            </>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ color: 'white', fontSize: '12px', fontWeight: '800', marginLeft: '4px' }}>First Name</label>
                                        <input type="text" name="firstName" required value={formData.firstName} onChange={handleInputChange} placeholder="John" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px', color: 'white', outline: 'none', fontWeight: '500' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ color: 'white', fontSize: '12px', fontWeight: '800', marginLeft: '4px' }}>Last Name</label>
                                        <input type="text" name="lastName" required value={formData.lastName} onChange={handleInputChange} placeholder="Doe" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px', color: 'white', outline: 'none', fontWeight: '500' }} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ color: 'white', fontSize: '12px', fontWeight: '800', marginLeft: '4px' }}>Email Address</label>
                                    <input type="email" name="email" required value={formData.email} onChange={handleInputChange} placeholder="john@example.com" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px', color: 'white', outline: 'none', fontWeight: '500' }} />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ color: 'white', fontSize: '12px', fontWeight: '800', marginLeft: '4px' }}>Password</label>
                                    <input type="password" name="password" required value={formData.password} onChange={handleInputChange} placeholder="••••••••" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px', color: 'white', outline: 'none', fontWeight: '500' }} />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ color: 'white', fontSize: '12px', fontWeight: '800', marginLeft: '4px' }}>Confirm Password</label>
                                    <input type="password" name="confirmPassword" required value={formData.confirmPassword} onChange={handleInputChange} placeholder="••••••••" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px', color: 'white', outline: 'none', fontWeight: '500' }} />
                                </div>

                                <button
                                    type="submit"
                                    className="hero__btn-main"
                                    style={{ width: '100%', justifyContent: 'center', border: 'none', cursor: 'pointer', padding: '16px', marginTop: '10px' }}
                                >
                                    Create Account <ArrowRight size={18} />
                                </button>
                                <button
                                    onClick={() => setStep(1)}
                                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer', fontWeight: '700', marginTop: '5px' }}
                                >
                                    <ArrowLeft size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Change Role
                                </button>
                            </div>
                        )}

                        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '20px', fontWeight: '500' }}>
                            Already a member? <Link to="/login-1" style={{ color: 'white', fontWeight: '800', textDecoration: 'none', marginLeft: '5px' }}>Sign In</Link>
                        </p>
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
        </section>
    );
};

export default Registration1;
