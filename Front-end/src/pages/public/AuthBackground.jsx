import React, { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { isMobileApp } from "../../utils/platform";

/**
 * AuthBackground — Light mint theme (home-page palette).
 * Desktop: animated mint/cyan blobs + mouse glow + floating particles.
 * Mobile:  cheap static gradient (no filter, no per-frame animation).
 */
const isMobile = isMobileApp();

const AuthBackground = () => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const springConfig = { damping: 30, stiffness: 100 };
    const springX = useSpring(mouseX, springConfig);
    const springY = useSpring(mouseY, springConfig);

    useEffect(() => {
        if (isMobile) return;
        const handle = (e) => { mouseX.set(e.clientX); mouseY.set(e.clientY); };
        window.addEventListener("mousemove", handle);
        return () => window.removeEventListener("mousemove", handle);
    }, [mouseX, mouseY]);

    const [particles, setParticles] = useState([]);
    useEffect(() => {
        if (isMobile) return;
        const count = window.innerWidth < 768 ? 12 : 22;
        setParticles(Array.from({ length: count }).map((_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100 + 100,
            size: Math.random() * 3 + 2,
            duration: Math.random() * 15 + 15,
            delay: Math.random() * 10,
            drift: (Math.random() - 0.5) * 40,
        })));
    }, []);

    if (isMobile) {
        return <div className="auth-mesh--static" style={{ pointerEvents: "none" }} />;
    }

    return (
        <div className="auth-mesh" style={{ overflow: "hidden", pointerEvents: "none" }}>
            {/* Decorative rings */}
            <div className="auth-deco-ring auth-deco-ring--1" aria-hidden="true" />
            <div className="auth-deco-ring auth-deco-ring--2" aria-hidden="true" />
            {/* Floating dots */}
            <div className="auth-deco-dot auth-deco-dot--1" aria-hidden="true" />
            <div className="auth-deco-dot auth-deco-dot--2" aria-hidden="true" />
            <div className="auth-deco-dot auth-deco-dot--3" aria-hidden="true" />

            {/* Dot texture */}
            <div className="auth-mesh-dots" aria-hidden="true" />

            {/* Mouse glow — mint */}
            <motion.div
                aria-hidden="true"
                style={{
                    position: "fixed",
                    top: -260, left: -260,
                    width: 520, height: 520,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(16,185,129,0.09) 0%, transparent 75%)",
                    x: springX, y: springY,
                    filter: "blur(80px)",
                    zIndex: 0,
                    pointerEvents: "none",
                }}
            />

            {/* Blob 1 — mint */}
            <motion.div
                aria-hidden="true"
                animate={{ scale: [1, 1.15, 1], x: [0, 40, 0], y: [0, 30, 0], opacity: [0.4, 0.6, 0.4] }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="auth-blob auth-blob--1"
                style={{ zIndex: -1 }}
            />
            {/* Blob 2 — cyan */}
            <motion.div
                aria-hidden="true"
                animate={{ scale: [1, 1.2, 1], x: [0, -30, 0], y: [0, -20, 0], opacity: [0.35, 0.5, 0.35] }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="auth-blob auth-blob--2"
                style={{ zIndex: -1 }}
            />
            {/* Blob 3 — mint soft */}
            <motion.div
                aria-hidden="true"
                animate={{ scale: [1, 1.3, 1], x: [0, 25, 0], y: [0, 50, 0], opacity: [0.25, 0.4, 0.25] }}
                transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
                className="auth-blob auth-blob--3"
                style={{ zIndex: -1 }}
            />

            {/* Floating particles — mint dots */}
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    aria-hidden="true"
                    initial={{ top: "110%", left: `${p.x}%`, opacity: 0 }}
                    animate={{
                        top: "-10%",
                        opacity: [0, 0.18, 0.18, 0],
                        x: [0, p.drift, 0],
                        scale: [0.8, 1, 0.8],
                    }}
                    transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "linear" }}
                    style={{
                        position: "absolute",
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        background: "#10B981",
                        borderRadius: "50%",
                        filter: "blur(1.5px)",
                        zIndex: 0,
                    }}
                />
            ))}
        </div>
    );
};

export default AuthBackground;
