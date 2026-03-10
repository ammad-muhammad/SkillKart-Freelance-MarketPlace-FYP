import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { Mail, Lock, Eye, EyeOff, ArrowRight, RefreshCw, CheckCircle, ArrowLeft } from "lucide-react";
import "../../../Components/common/Hero/Hero.css";

const ForgotPassword = () => {
    const [step, setStep] = useState(1); // 1: Reset Form, 2: Success
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        newPassword: "",
        confirmPassword: ""
    });
    const [isLoading, setIsLoading] = useState(false);

    const sectionRef = useRef(null);
    const tagRef = useRef(null);
    const headingRef = useRef(null);
    const formRef = useRef(null);
    const visualRef = useRef(null);
    const bgRef = useRef(null);

    useEffect(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.4 });
        tl.fromTo(bgRef.current, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power2.inOut' })
            .fromTo(tagRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.6')
            .fromTo(headingRef.current.querySelectorAll('.hero__word'), { y: 60, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.7, ease: 'power4.out' }, '-=0.2')
            .fromTo(formRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.3')
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

    const headingWords = step === 1 ? ['Account', 'Recovery,', 'Take', 'Back', 'Control.'] : ['Password', 'Reset,', 'You', 'Are', 'Ready.'];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("Forgot Password Data:", formData);
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            setStep(2);
            setFormData({
                email: "",
                newPassword: "",
                confirmPassword: ""
            });
        }, 1500);
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
                        <span>🔑</span> Secure Recovery
                    </div>

                    <h1 ref={headingRef} className="hero__heading">
                        {headingWords.map((w, i) => (
                            <span key={i} className="hero__word">
                                {w}{i === 1 ? ' ' : ' '}
                            </span>
                        ))}
                    </h1>

                    <div ref={formRef} className="hero__auth-container" style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '24px',
                        padding: '35px',
                        backdropFilter: 'blur(12px)',
                        maxWidth: '460px',
                        width: '100%'
                    }}>
                        {step === 1 ? (
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <p style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginBottom: '10px' }}>Enter your email and define a new secure password.</p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ color: 'white', fontSize: '13px', fontWeight: '800', marginLeft: '4px' }}>Email Address</label>
                                    <div style={{ position: 'relative' }}>
                                        <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                                        <input type="email" name="email" required value={formData.email} onChange={handleInputChange} className="white-placeholder" placeholder="name@example.com" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '14px 14px 14px 48px', color: 'white', outline: 'none', fontWeight: '500' }} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ color: 'white', fontSize: '13px', fontWeight: '800', marginLeft: '4px' }}>New Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                                        <input type={showPassword ? "text" : "password"} name="newPassword" className="white-placeholder" required value={formData.newPassword} onChange={handleInputChange} placeholder="••••••••" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '14px 48px 14px 48px', color: 'white', outline: 'none', fontWeight: '500' }} />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ color: 'white', fontSize: '13px', fontWeight: '800', marginLeft: '4px' }}>Confirm Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                                        <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" className="white-placeholder" required value={formData.confirmPassword} onChange={handleInputChange} placeholder="••••••••" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '14px 14px 14px 48px', color: 'white', outline: 'none', fontWeight: '500' }} />
                                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                                <style>
                                    {`
  .white-placeholder::placeholder {
    color: rgba(255, 255, 255, 0.7); 
    opacity: 1;
  }
`}
                                </style>
                                <button type="submit" disabled={isLoading} className="hero__btn-main" style={{ width: '100%', justifyContent: 'center', border: 'none', cursor: 'pointer', padding: '16px', marginTop: '10px' }}>
                                    {isLoading ? 'Processing...' : 'Reset My Password'} <ArrowRight size={18} />
                                </button>
                            </form>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <div style={{ width: '70px', height: '70px', background: 'var(--color-accent)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                    <CheckCircle size={40} color="black" />
                                </div>
                                <h2 style={{ color: 'white', fontSize: '24px', fontWeight: '900', marginBottom: '10px' }}>Password Reset!</h2>
                                <p style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginBottom: '30px' }}>Your credentials have been updated. You can now access your profile with your new password.</p>
                                <Link to="/login-1" className="hero__btn-main" style={{ textDecoration: 'none', justifyContent: 'center', width: '100%' }}>
                                    Back to Login <ArrowRight size={18} />
                                </Link>
                            </div>
                        )}
                        <div style={{ textAlign: 'center', marginTop: '15px' }}>
                            <Link to="/login-1" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: '800', textDecoration: 'none' }}>
                                <ArrowLeft size={16} /> Return to Sign In
                            </Link>
                        </div>
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
                            <span className="hero__dashboard-title">System Recovery</span>
                        </div>
                        <div className="hero__dashboard-body">
                            <div className="hero__db-profile">
                                <div className="hero__db-avatar">🔐</div>
                                <div>
                                    <div className="hero__db-name">Security Protocol</div>
                                    <div className="hero__db-role">Verified Auth Workflow</div>
                                </div>
                            </div>
                            <div className="hero__db-ai">
                                <div className="hero__db-ai-icon">🛡️</div>
                                <div>
                                    <div className="hero__db-ai-title">Buddy AI Guard</div>
                                    <div className="hero__db-ai-text">
                                        I'm monitoring your account for unusual activity. Your password reset was initiated from a recognized device.
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

export default ForgotPassword;
