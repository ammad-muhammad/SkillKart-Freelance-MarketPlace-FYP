import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { authAPI } from "../../../api/auth";
import { useAuth } from "../../../hooks/useAuth";
import { safeToast as toast } from "../../../utils/safeToast";
import "./SkipOnboarding.css";

const DASHBOARD = { client: "/client/dashboard", freelancer: "/freelancer/dashboard" };
const ONBOARDING = { client: "/client/onboarding", freelancer: "/freelancer/onboarding" };

/**
 * "Skip for now" on the client / freelancer onboarding wizard. Asks once inline,
 * records the skip on the server (so login redirects stop sending the user back
 * here) and lands them on their dashboard. Any draft they started is kept.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useSkipOnboarding = (role) => {
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const [busy, setBusy] = useState(false);

  const skip = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await authAPI.skipOnboarding();
      await refreshAuth();
      toast.info("You can finish setting up your profile anytime from your dashboard.");
      navigate(DASHBOARD[role], { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't skip right now. Please try again.");
      setBusy(false);
    }
  };

  return { skip, busy };
};

export const SkipOnboardingButton = ({ role }) => {
  const [confirming, setConfirming] = useState(false);
  const { skip, busy } = useSkipOnboarding(role);

  if (!confirming) {
    return (
      <div className="sk-skip-onb">
        <button type="button" className="sk-skip-onb__link" onClick={() => setConfirming(true)}>
          Skip for now <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="sk-skip-onb sk-skip-onb--confirm" role="alertdialog" aria-label="Skip onboarding">
      <p className="sk-skip-onb__text">
        Skip setup and go to your dashboard? You can complete your profile later
        {role === "freelancer" ? " — it's needed before you can apply to projects." : "."}
      </p>
      <div className="sk-skip-onb__actions">
        <button type="button" className="sk-skip-onb__btn" onClick={() => setConfirming(false)} disabled={busy}>
          Continue setup
        </button>
        <button type="button" className="sk-skip-onb__btn sk-skip-onb__btn--primary" onClick={skip} disabled={busy}>
          {busy ? "Skipping…" : "Skip to dashboard"}
        </button>
      </div>
    </div>
  );
};

const DISMISS_KEY = "sk-finish-onboarding-dismissed";

/**
 * Dashboard reminder shown while a client/freelancer hasn't completed onboarding
 * (typically because they skipped it). Dismissible for the current session.
 */
export const FinishOnboardingBanner = ({ role }) => {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
  });

  if (!user || user.isOnBoardingCompleted || dismissed || !ONBOARDING[role]) return null;

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* non-fatal */ }
    setDismissed(true);
  };

  return (
    <div className="sk-finish-onb" role="status">
      <span className="sk-finish-onb__icon" aria-hidden="true"><Sparkles size={18} /></span>
      <div className="sk-finish-onb__body">
        <strong className="sk-finish-onb__title">Finish setting up your profile</strong>
        <span className="sk-finish-onb__text">
          {role === "freelancer"
            ? "Complete onboarding to apply to projects and get matched with clients."
            : "Complete onboarding so freelancers know who they're working with and AI matching works better."}
        </span>
      </div>
      <Link to={ONBOARDING[role]} className="sk-finish-onb__cta">
        Complete profile <ArrowRight size={14} />
      </Link>
      <button type="button" className="sk-finish-onb__close" onClick={dismiss} aria-label="Dismiss reminder">
        <X size={16} />
      </button>
    </div>
  );
};
