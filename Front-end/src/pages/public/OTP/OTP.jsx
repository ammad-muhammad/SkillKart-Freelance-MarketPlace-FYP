import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ShieldCheck, ArrowRight, RotateCcw } from "lucide-react";
import "../../../Components/common/Hero/Hero.css";

const OTP = () => {
    const [otp, setOtp] = useState(["", "", "", "", ""]);
    const [timer, setTimer] = useState(30);
    const [canResend, setCanResend] = useState(false);
    const inputRefs = useRef([]);

    const sectionRef = useRef(null);
    const tagRef = useRef(null);
    const headingRef = useRef(null);
    const formRef = useRef(null);
    const visualRef = useRef(null);
    const bgRef = useRef(null);

    useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => setTimer(prev => prev - 1), 1000);
            return () => clearInterval(interval);
        } else {
            setCanResend(true);
        }
    }, [timer]);

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
    }, []);

    const headingWords = ['Secure', 'Verification,', 'Protecting', 'Your', 'Wealth.'];

    const handleChange = (index, value) => {
        if (isNaN(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);
        if (value && index < 4) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handleResend = () => {
        if (!canResend) return;
        setTimer(30);
        setCanResend(false);
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
                        <span>🛠️</span> Verification Stage
                    </div>

                    <h1 ref={headingRef} className="hero__heading">
                        {headingWords.map((w, i) => (
                            <span key={i} className="hero__word">
                                {w}{i === 2 ? ' ' : ' '}
                            </span>
                        ))}
                    </h1>

                    <p className="hero__sub" style={{ marginBottom: '25px' }}>
                        We've sent a 5-digit security code to your registered email address.
                    </p>

                    <div ref={formRef} className="hero__auth-container" style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '24px',
                        padding: '45px 35px',
                        backdropFilter: 'blur(12px)',
                        maxWidth: '420px',
                        width: '100%',
                        textAlign: 'center'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '30px' }}>
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={el => inputRefs.current[index] = el}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={e => handleChange(index, e.target.value)}
                                    onKeyDown={e => handleKeyDown(index, e)}
                                    style={{
                                        width: '55px',
                                        height: '65px',
                                        textAlign: 'center',
                                        fontSize: '28px',
                                        fontWeight: '900',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '16px',
                                        color: 'white',
                                        outline: 'none',
                                        transition: 'all 0.3s'
                                    }}
                                    autoFocus={index === 0}
                                />
                            ))}
                        </div>

                        <button type="submit" className="hero__btn-main" style={{ width: '100%', justifyContent: 'center', border: 'none', cursor: 'pointer', padding: '16px' }}>
                            Verify Now <ArrowRight size={18} />
                        </button>

                        <div style={{ marginTop: '25px' }}>
                            {canResend ? (
                                <button
                                    type="button"
                                    onClick={handleResend}
                                    style={{ background: 'none', border: 'none', color: 'white', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto', fontSize: '14px' }}
                                >
                                    <RotateCcw size={16} /> Resend OTP Code
                                </button>
                            ) : (
                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: '600' }}>
                                    Resend code in <span style={{ color: 'white', fontWeight: '900' }}>{timer}s</span>
                                </p>
                            )}
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
                            <span className="hero__dashboard-title">Security Lab</span>
                        </div>
                        <div className="hero__dashboard-body">
                            <div className="hero__db-profile">
                                <div className="hero__db-avatar">🛡️</div>
                                <div>
                                    <div className="hero__db-name">MFA Verification</div>
                                    <div className="hero__db-role">Level 2 Authorization</div>
                                </div>
                            </div>
                            <div className="hero__db-ai">
                                <div className="hero__db-ai-icon">💡</div>
                                <div>
                                    <div className="hero__db-ai-title">Buddy AI Check</div>
                                    <div className="hero__db-ai-text">
                                        This extra layer of security helps prevent unauthorized access to your wallet and projects.
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

export default OTP;
