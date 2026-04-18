"use client";
import { motion, useScroll, useSpring } from "framer-motion";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleY = useSpring(scrollYProgress, { stiffness: 80, damping: 20 });
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed right-1 top-0 z-50 h-screen w-[3px] origin-top rounded-full"
      style={{
        scaleY,
        background: "linear-gradient(to bottom, #2f7cff, #f4a21b)",
      }}
    />
  );
}
