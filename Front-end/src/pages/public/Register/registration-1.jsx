import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Briefcase, Code, ArrowLeft, AlertCircle, CheckCircle, Loader } from "lucide-react";
import { authAPI } from "../../../api/auth";
import "../../../Components/common/Hero/Hero.css";

const Registration1 = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Role, 2: Details
    const [role, setRole] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

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
    }, [step]);

    const headingWords = step === 1 ? ['Start', 'Your', 'Journey,', 'Join', 'Skill', 'Kart.'] : ['Tell', 'Us', 'More,', 'About', 'Yourself.'];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError("");
    };

    const validateForm = () => {
        if (!formData.firstName) {
            setError("First name is required");
            return false;
        }
        if (!formData.lastName) {
            setError("Last name is required");
            return false;
        }
        if (!formData.email) {
            setError("Email is required");
            return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            setError("Please enter a valid email");
            return false;
        }
        if (!formData.password) {
            setError("Password is required");
            return false;
        }
        if (formData.password.length < 8) {
            setError("Password must be at least 8 characters");
            return false;
        }
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            // Step 1: Create user account using API client
            const userResponse = await authAPI.register({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                password: formData.password,
                role: role
            });

            setSuccess("Registration successful! OTP sent to your email. Redirecting...");
            
            // Store email for OTP verification
            sessionStorage.setItem('registrationEmail', formData.email);
            
            // // Redirect to OTP verification page after 2 seconds
            // setTimeout(() => {
            //     navigate('/verify-otp');
            // }, 2000);

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

    const handleBackToRole = () => {
        setStep(1);
        setError("");
        setSuccess("");
        setFormData({
            firstName: "",
            lastName: "",
            email: "",
            password: "",
            confirmPassword: ""
        });
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

                        {step === 1 ? (
                            <>
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
                                    onClick={() => role && setStep(2)}
                                    disabled={!role}
                                    className="hero__btn-main"
                                    style={{ width: '100%', justifyContent: 'center', border: 'none', cursor: role ? 'pointer' : 'not-allowed', padding: '16px', opacity: role ? 1 : 0.4 }}
                                >
                                    Continue <ArrowRight size={18} />
                                </button>
                            </>
                        ) : (
                            <>
                                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ color: 'white', fontSize: '12px', fontWeight: '800', marginLeft: '4px' }}>First Name</label>
                                            <input 
                                                type="text" 
                                                name="firstName" 
                                                required 
                                                value={formData.firstName} 
                                                onChange={handleInputChange}
                                                placeholder="John" 
                                                className="white-placeholder"
                                                disabled={loading}
                                                style={{ 
                                                    width: '100%', 
                                                    background: 'rgba(255,255,255,0.05)', 
                                                    border: '1px solid rgba(255,255,255,0.1)', 
                                                    borderRadius: '14px', 
                                                    padding: '12px', 
                                                    color: 'white', 
                                                    outline: 'none', 
                                                    fontWeight: '500',
                                                    opacity: loading ? 0.6 : 1
                                                }} 
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ color: 'white', fontSize: '12px', fontWeight: '800', marginLeft: '4px' }}>Last Name</label>
                                            <input 
                                                type="text" 
                                                name="lastName" 
                                                required 
                                                value={formData.lastName} 
                                                onChange={handleInputChange}
                                                placeholder="Doe" 
                                                className="white-placeholder"
                                                disabled={loading}
                                                style={{ 
                                                    width: '100%', 
                                                    background: 'rgba(255,255,255,0.05)', 
                                                    border: '1px solid rgba(255,255,255,0.1)', 
                                                    borderRadius: '14px', 
                                                    padding: '12px', 
                                                    color: 'white', 
                                                    outline: 'none', 
                                                    fontWeight: '500',
                                                    opacity: loading ? 0.6 : 1
                                                }} 
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ color: 'white', fontSize: '12px', fontWeight: '800', marginLeft: '4px' }}>Email Address</label>
                                        <div style={{ position: 'relative' }}>
                                            <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                                            <input 
                                                type="email" 
                                                name="email" 
                                                required 
                                                value={formData.email} 
                                                onChange={handleInputChange}
                                                placeholder="john@example.com" 
                                                className="white-placeholder"
                                                disabled={loading}
                                                style={{ 
                                                    width: '100%', 
                                                    background: 'rgba(255,255,255,0.05)', 
                                                    border: '1px solid rgba(255,255,255,0.1)', 
                                                    borderRadius: '14px', 
                                                    padding: '12px 12px 12px 48px', 
                                                    color: 'white', 
                                                    outline: 'none', 
                                                    fontWeight: '500',
                                                    opacity: loading ? 0.6 : 1
                                                }} 
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ color: 'white', fontSize: '13px', fontWeight: '800', marginLeft: '4px' }}>Password</label>
                                        <div style={{ position: 'relative' }}>
                                            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                                            <input 
                                                type={showPassword ? "text" : "password"} 
                                                name="password" 
                                                className="white-placeholder" 
                                                required 
                                                value={formData.password} 
                                                onChange={handleInputChange}
                                                placeholder="••••••••"
                                                disabled={loading}
                                                style={{ 
                                                    width: '100%', 
                                                    background: 'rgba(255,255,255,0.05)', 
                                                    border: '1px solid rgba(255,255,255,0.1)', 
                                                    borderRadius: '16px', 
                                                    padding: '14px 48px 14px 48px', 
                                                    color: 'white', 
                                                    outline: 'none', 
                                                    fontWeight: '500',
                                                    opacity: loading ? 0.6 : 1
                                                }} 
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => setShowPassword(!showPassword)}
                                                disabled={loading}
                                                style={{ 
                                                    position: 'absolute', 
                                                    right: '16px', 
                                                    top: '50%', 
                                                    transform: 'translateY(-50%)', 
                                                    color: 'rgba(255,255,255,0.4)', 
                                                    background: 'none', 
                                                    border: 'none', 
                                                    cursor: loading ? 'not-allowed' : 'pointer' 
                                                }}
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginLeft: '4px' }}>
                                            At least 8 characters
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ color: 'white', fontSize: '13px', fontWeight: '800', marginLeft: '4px' }}>Confirm Password</label>
                                        <div style={{ position: 'relative' }}>
                                            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                                            <input 
                                                type={showConfirmPassword ? "text" : "password"} 
                                                name="confirmPassword" 
                                                className="white-placeholder" 
                                                required 
                                                value={formData.confirmPassword} 
                                                onChange={handleInputChange}
                                                placeholder="••••••••"
                                                disabled={loading}
                                                style={{ 
                                                    width: '100%', 
                                                    background: 'rgba(255,255,255,0.05)', 
                                                    border: '1px solid rgba(255,255,255,0.1)', 
                                                    borderRadius: '16px', 
                                                    padding: '14px 48px 14px 48px', 
                                                    color: 'white', 
                                                    outline: 'none', 
                                                    fontWeight: '500',
                                                    opacity: loading ? 0.6 : 1
                                                }} 
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                disabled={loading}
                                                style={{ 
                                                    position: 'absolute', 
                                                    right: '16px', 
                                                    top: '50%', 
                                                    transform: 'translateY(-50%)', 
                                                    color: 'rgba(255,255,255,0.4)', 
                                                    background: 'none', 
                                                    border: 'none', 
                                                    cursor: loading ? 'not-allowed' : 'pointer' 
                                                }}
                                            >
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
                                            input:disabled {
                                                cursor: not-allowed;
                                            }
                                        `}
                                    </style>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="hero__btn-main"
                                        style={{ 
                                            width: '100%', 
                                            justifyContent: 'center', 
                                            border: 'none', 
                                            cursor: loading ? 'not-allowed' : 'pointer', 
                                            padding: '16px', 
                                            marginTop: '10px',
                                            opacity: loading ? 0.7 : 1,
                                            display: 'flex',
                                            gap: '8px',
                                            alignItems: 'center'
                                        }}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                                                Creating Account...
                                            </>
                                        ) : (
                                            <>
                                                Create Account <ArrowRight size={18} />
                                            </>
                                        )}
                                    </button>
                                </form>
                                <button
                                    onClick={handleBackToRole}
                                    disabled={loading}
                                    style={{ 
                                        background: 'none', 
                                        border: 'none', 
                                        color: 'rgba(255,255,255,0.4)', 
                                        fontSize: '12px', 
                                        cursor: loading ? 'not-allowed' : 'pointer', 
                                        fontWeight: '700', 
                                        marginTop: '5px',
                                        opacity: loading ? 0.5 : 1
                                    }}
                                >
                                    <ArrowLeft size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Change Role
                                </button>
                            </>
                        )}

                        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '20px', fontWeight: '500' }}>
                            Already a member? <a href="/login-1" style={{ color: 'white', fontWeight: '800', textDecoration: 'none', marginLeft: '5px' }}>Sign In</a>
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

export default Registration1;