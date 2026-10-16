import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Briefcase, Code, AlertCircle, CheckCircle, Gift, Bot } from "lucide-react";
import { authAPI } from "../../../api/auth";
import { useAuth } from '../../../hooks/useAuth'
import AuthBackground from "../AuthBackground";
import { log } from "../../../utils/logger";
import "../Auth.css";

/**
 * Role selection (post-signup). Built on the shared Auth.css shell
 * (auth-page / auth-card / auth-role-grid / auth-role-card) so it matches
 * Login + Registration and is responsive for free. The old version used the
 * `.hero__*` classes that were removed from Hero.css in the theme redesign
 * and dark-theme inline colours, which left the page unstyled/unreadable.
 */
const Role = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated, loading: authLoading, refreshAuth } = useAuth();
    const [role, setRole] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        if (!authLoading) {
            // If not authenticated, redirect to home
            if (!isAuthenticated) {
                navigate('/');
                return;
            }

            if (['freelancer', 'client'].includes(user?.role)) {
                const userRole = user?.role;
                // Skipped onboarding ("Skip for now") also lands on the dashboard.
                const isOnboardingCompleted = user?.isOnBoardingCompleted || !!user?.onboardingSkippedAt;

                log(`🧭 Role redirect: Role=${userRole}, OnboardingCompleted=${isOnboardingCompleted}`);

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

    const handleSubmit = async () => {
        if (role == "") return;

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            await authAPI.updateRole({
                role: role
            });

            await refreshAuth(); // Refresh local user state with the new role
            setSuccess("Registration successful! Redirecting...");

            // Redirect to onboarding after 2 seconds
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

    const onCardKey = (e, selectedRole) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleRoleSelect(selectedRole);
        }
    };

    return (
        <div className="auth-page">
            <AuthBackground />

            <main className="auth-content">
                {/* ── LEFT: BRANDING ── */}
                <div className="auth-branding">
                    <div className="auth-tag auth-anim-tag">
                        <span>🚀</span> Select Your Role
                    </div>

                    <h1 className="auth-title auth-anim-title">
                        Tell Us More <br />
                        <span className="auth-title-accent">About Yourself.</span>
                    </h1>

                    <p className="auth-description auth-anim-para">
                        Join as a {role || 'member'} and get access to AI-powered project matching and smart verification!
                    </p>

                    <div className="auth-feature-badges auth-anim-badges">
                        <div className="auth-badge-card">
                            <div className="auth-badge-icon" aria-hidden="true">
                                <Gift size={18} />
                            </div>
                            <div>
                                <div className="auth-badge-title">Welcome Gift</div>
                                <div className="auth-badge-sub">100 SkillCredits Pending</div>
                            </div>
                        </div>
                        <div className="auth-badge-card">
                            <div className="auth-badge-icon" aria-hidden="true">
                                <Bot size={18} />
                            </div>
                            <div>
                                <div className="auth-badge-title">Buddy AI</div>
                                <div className="auth-badge-sub">Smart Matching</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── RIGHT: CARD ── */}
                <div className="auth-card-container">
                    <div className="auth-card auth-anim-card">
                        <div className="auth-card-heading">Choose your role</div>
                        <p className="auth-role-prompt">How would you like to join our community?</p>

                        {error && (
                            <div className="auth-alert auth-alert--error" role="alert" aria-live="polite">
                                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                                <span>{error}</span>
                            </div>
                        )}

                        {success && (
                            <div className="auth-alert auth-alert--success" role="status" aria-live="polite">
                                <CheckCircle size={16} style={{ flexShrink: 0 }} />
                                <span>{success}</span>
                            </div>
                        )}

                        <div className="auth-role-grid">
                            <div
                                className={`auth-role-card${role === "client" ? " active" : ""}`}
                                onClick={() => handleRoleSelect("client")}
                                role="button"
                                tabIndex={0}
                                aria-pressed={role === "client"}
                                onKeyDown={(e) => onCardKey(e, "client")}
                            >
                                <div className="auth-role-check" aria-hidden="true">✓</div>
                                <div className="auth-role-icon"><Briefcase size={24} /></div>
                                <div className="auth-role-title">Client</div>
                                <div className="auth-role-desc">Hire Elite Talent</div>
                            </div>
                            <div
                                className={`auth-role-card${role === "freelancer" ? " active" : ""}`}
                                onClick={() => handleRoleSelect("freelancer")}
                                role="button"
                                tabIndex={0}
                                aria-pressed={role === "freelancer"}
                                onKeyDown={(e) => onCardKey(e, "freelancer")}
                            >
                                <div className="auth-role-check" aria-hidden="true">✓</div>
                                <div className="auth-role-icon"><Code size={24} /></div>
                                <div className="auth-role-title">Freelancer</div>
                                <div className="auth-role-desc">Offer Your Skills</div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => role && handleSubmit()}
                            disabled={!role || loading}
                            className="auth-submit-btn"
                        >
                            {loading ? 'Please wait…' : 'Continue'}
                            <ArrowRight size={16} className="btn-arrow" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Role;
