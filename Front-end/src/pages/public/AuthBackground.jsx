import React, { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { isMobileApp } from "../../utils/platform";

/**
 * AuthBackground Component
 * Provides a premium, subtle animated background for authentication pages.
 * Features:
 * 1. Mouse Reactive Glow - Follows the cursor with a soft radial fade.
 * 2. Anti-Gravity Floating Particles - Small dots that drift upwards elegantly.
 * 3. Mesh Blobs - Interactive soft blobs for depth.
 *
 * The native Android WebView renders large-radius animated `filter: blur()`
 * very badly (the same class of issue native-app.css already documents for
 * `backdrop-filter` — every composite pass has to re-rasterize the blurred
 * layer). Below, 3 blobs (blur 80-100px) plus a mouse-glow (blur 80px) plus
 * up to 15 particles all animate forever, simultaneously, on every
 * login/register/OTP/forgot-password screen — that's what was actually
 * causing the reported jerking/jitter/glitching on-device (the post-login
 * dashboard doesn't use this component at all, which is why it was
 * unaffected). On mobile we skip all of that setup and just paint a cheap
 * static gradient instead (`.auth-mesh--static` in Auth.css) — no filter, no
 * per-frame animation, composited once.
 */
const isMobile = isMobileApp();

const AuthBackground = () => {
    // Mouse Reactive Glow values
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // Spring physics for smooth movement
    const springConfig = { damping: 30, stiffness: 100 };
    const springX = useSpring(mouseX, springConfig);
    const springY = useSpring(mouseY, springConfig);

    useEffect(() => {
        if (isMobile) return; // no mouse on a touch device, and the point is to skip this work there
        const handleMouseMove = (e) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [mouseX, mouseY]);

    // Particle logic
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        if (isMobile) return; // static fallback below doesn't render particles at all
        // Adjust density based on screen size
        const count = window.innerWidth < 768 ? 15 : 30;
        const newParticles = Array.from({ length: count }).map((_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100 + 100, // Start below the screen
            size: Math.random() * 3 + 2,
            duration: Math.random() * 15 + 15,
            delay: Math.random() * 10,
            drift: (Math.random() - 0.5) * 40 // Horizontal drift
        }));
        setParticles(newParticles);
    }, []);

    if (isMobile) {
        // Deliberately NOT the base `.auth-mesh` class — its ::before/::after
        // pseudo-elements (a blur(60px) gradient + a noise-texture overlay)
        // are exactly the kind of filter cost this static fallback exists to
        // avoid. `.auth-mesh--static` is fully self-contained (own position/
        // background), so it doesn't need `.auth-mesh` for anything.
        return <div className="auth-mesh--static" style={{ pointerEvents: "none" }} />;
    }

    return (
        <div className="auth-mesh" style={{ overflow: "hidden", pointerEvents: "none" }}>
            {/* 1. MOUSE REACTIVE GLOW */}
            <motion.div
                style={{
                    position: "fixed",
                    top: -250, // Offset to center on cursor
                    left: -250,
                    width: 500,
                    height: 500,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(183, 201, 226, 0.1) 0%, transparent 75%)",
                    x: springX,
                    y: springY,
                    filter: "blur(80px)",
                    zIndex: 0,
                    pointerEvents: "none",
                }}
            />

            {/* 2. EXISTING BLOBS (MAINTAINING CURRENT UI BUT AS COMPONENT) */}
            {/* These blobs provide the deep mesh effect */}
            <motion.div
                animate={{
                    scale: [1, 1.15, 1],
                    x: [0, 40, 0],
                    y: [0, 30, 0],
                    opacity: [0.2, 0.3, 0.2]
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="auth-blob auth-blob--1"
                style={{ zIndex: -1 }}
            />
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    x: [0, -30, 0],
                    y: [0, -20, 0],
                    opacity: [0.15, 0.25, 0.15]
                }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="auth-blob auth-blob--2"
                style={{ zIndex: -1 }}
            />
            <motion.div
                animate={{
                    scale: [1, 1.3, 1],
                    x: [0, 25, 0],
                    y: [0, 50, 0],
                    opacity: [0.1, 0.2, 0.1]
                }}
                transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
                className="auth-blob auth-blob--3"
                style={{ zIndex: -1 }}
            />

            {/* 3. FLOATING PARTICLES (ANTI-GRAVITY EFFECT) */}
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    initial={{ top: "110%", left: `${p.x}%`, opacity: 0 }}
                    animate={{
                        top: "-10%",
                        opacity: [0, 0.12, 0.12, 0],
                        x: [0, p.drift, 0],
                        scale: [0.8, 1, 0.8]
                    }}
                    transition={{
                        duration: p.duration,
                        repeat: Infinity,
                        delay: p.delay,
                        ease: "linear"
                    }}
                    style={{
                        position: "absolute",
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        background: "var(--auth-accent)",
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
