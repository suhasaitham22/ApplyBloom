"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { useMemo } from "react";

// A fixed-position scroll-reactive ambient layer that keeps the page alive between sections.
// Dots drift, a gradient blob shifts with scroll, and a grain overlay adds editorial texture.

export function AmbientField() {
  const { scrollYProgress } = useScroll();
  const blobX = useTransform(scrollYProgress, [0, 1], ["-20%", "20%"]);
  const blobY = useTransform(scrollYProgress, [0, 1], ["-10%", "15%"]);
  const hueRotate = useTransform(scrollYProgress, [0, 1], [0, 40]);

  const dots = useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2,
      delay: Math.random() * 4,
      duration: 4 + Math.random() * 4,
    }));
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* drifting gradient blob */}
      <motion.div
        className="absolute h-[60rem] w-[60rem] rounded-full blur-3xl"
        style={{
          x: blobX,
          y: blobY,
          left: "20%",
          top: "30%",
          background:
            "radial-gradient(closest-side, rgba(47,124,255,0.08), transparent 70%)",
          filter: useTransform(hueRotate, (v) => `hue-rotate(${v}deg)`),
        }}
      />
      {/* drifting accent blob */}
      <motion.div
        className="absolute h-[40rem] w-[40rem] rounded-full blur-3xl"
        style={{
          x: useTransform(scrollYProgress, [0, 1], ["10%", "-10%"]),
          y: useTransform(scrollYProgress, [0, 1], ["0%", "-20%"]),
          right: "10%",
          bottom: "10%",
          background:
            "radial-gradient(closest-side, rgba(244,162,27,0.07), transparent 70%)",
        }}
      />

      {/* twinkling dots */}
      {dots.map((d, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-[#0d1a28]/20"
          style={{ left: `${d.x}%`, top: `${d.y}%`, width: d.size, height: d.size }}
          animate={{ opacity: [0.15, 0.6, 0.15] }}
          transition={{ duration: d.duration, delay: d.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* grain */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
    </div>
  );
}
