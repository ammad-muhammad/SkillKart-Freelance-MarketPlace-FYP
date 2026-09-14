import { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { Home, Search, Users, ArrowLeft, Compass } from 'lucide-react';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import { isMobileApp } from '../../../utils/platform';
import './NotFound.css';

/* Where people most often actually meant to go. `/` is safe on mobile (it
   redirects to /login there — see AppRoutes.jsx); the other three are
   marketing/discovery routes that aren't registered at all on the mobile
   build, so they're excluded there rather than left as dead links on the
   one page guaranteed to be reachable from any bad mobile deep link. */
const SUGGESTIONS = [
    { icon: Home, label: 'Home', desc: 'Back to the start', to: '/' },
    { icon: Search, label: 'Browse Projects', desc: 'Find work to bid on', to: '/browse-projects', webOnly: true },
    { icon: Users, label: 'Find Freelancers', desc: 'Hire the right talent', to: '/browse-freelancers', webOnly: true },
    { icon: Compass, label: 'Explore Skills', desc: 'See every category', to: '/categories', webOnly: true }
];

export default function NotFound() {
    const navigate = useNavigate();
    const location = useLocation();
    const heroRef = useRef(null);

    // The route that actually 404'd, handed over by the redirect in AppRoutes so
    // the address bar can read /404 without losing what the user typed.
    const attempted = location.state?.from;

    useEffect(() => {
        // gsap.from() with opacity leaves elements invisible if the tween is
        // interrupted or never runs; fromTo() with clearProps guarantees the end
        // state is the CSS default, so content is never stranded at opacity 0.
        const ctx = gsap.context(() => {
            const intro = (target, delay, extra = {}) =>
                gsap.fromTo(
                    target,
                    { y: extra.y ?? 20, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.6,
                        delay,
                        ease: 'power3.out',
                        clearProps: 'all',
                        ...(extra.stagger ? { stagger: extra.stagger } : {})
                    }
                );

            intro('.nf__code', 0, { y: 30 });
            intro('.nf__title', 0.15);
            intro('.nf__sub', 0.25);
            intro('.nf__actions > *', 0.35, { y: 16, stagger: 0.08 });
            intro('.nf__card', 0.45, { y: 24, stagger: 0.07 });
        }, heroRef);
        return () => ctx.revert();
    }, []);

    // Navbar/Footer carry their own mega-menu/footer links to the same
    // mobile-excluded marketing routes — this page is the one guaranteed to
    // render on any bad mobile deep link, so on mobile it gets a minimal,
    // link-free header/footer instead of leaking that whole surface too.
    const mobile = isMobileApp();
    const visibleSuggestions = SUGGESTIONS.filter((s) => !s.webOnly || !mobile);

    return (
        <>
            {mobile ? (
                <header style={{ padding: '1.25rem', textAlign: 'center', fontWeight: 700, fontSize: '1.1rem' }}>SkillKart</header>
            ) : (
                <Navbar alwaysSticky />
            )}

            <main className="nf" ref={heroRef}>
                <div className="nf__bg" aria-hidden="true">
                    <span className="nf__orb nf__orb--1" />
                    <span className="nf__orb nf__orb--2" />
                    <span className="nf__grid" />
                </div>

                <div className="container nf__inner">
                    <p className="nf__code" aria-hidden="true">404</p>

                    <h1 className="nf__title">This page took on a different project</h1>

                    <p className="nf__sub">
                        The page you're looking for doesn't exist, moved, or never made it past
                        the proposal stage.
                        {attempted && (
                            <>
                                {' '}We couldn't find <code className="nf__path">{attempted}</code>.
                            </>
                        )}
                    </p>

                    <div className="nf__actions">
                        <Link to="/" className="btn-primary">
                            <Home size={18} /> Back to Home
                        </Link>
                        <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
                            <ArrowLeft size={18} /> Go Back
                        </button>
                    </div>

                    <div className="nf__suggest">
                        <p className="nf__suggest-label">Or try one of these</p>
                        <div className="nf__cards">
                            {visibleSuggestions.map(({ icon: Icon, label, desc, to }) => (
                                <Link key={to} to={to} className="nf__card">
                                    <span className="nf__card-icon"><Icon size={20} /></span>
                                    <span className="nf__card-text">
                                        <strong>{label}</strong>
                                        <small>{desc}</small>
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            {!mobile && <Footer />}
        </>
    );
}
