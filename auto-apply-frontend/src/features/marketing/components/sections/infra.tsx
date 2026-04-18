"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const STACK = [
  { name: "Cloudflare", desc: "Edge API + Pages", color: "#f38020" },
  { name: "Supabase", desc: "Auth + Postgres + Storage", color: "#3ecf8e" },
  { name: "Workers AI", desc: "Tailoring + embeddings", color: "#2f7cff" },
  { name: "Upstash", desc: "Queues + rate limits", color: "#00c08b" },
  { name: "Resend", desc: "Transactional email", color: "#0d1a28" },
];

export function InfraSection() {
  return (
    <section id="infra" className="relative overflow-hidden bg-background py-24 sm:py-40">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center sm:mb-16"
        >
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Under the hood</p>
          <h2 className="mt-4 font-display text-3xl leading-tight tracking-tight sm:text-5xl">
            Boring, reliable infra. <span className="italic text-muted-foreground">Exciting product.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-sm text-muted-foreground sm:text-base">
            Stateless edge, stateful core. Auth at every boundary, RLS on every row, idempotency on every mutation.
          </p>
        </motion.div>

        <Orbit />
      </div>
    </section>
  );
}

function Orbit() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(560);
  const [angle, setAngle] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const raf = useRef<number | null>(null);
  const last = useRef<number>(0);

  // Measure container width to size the orbit.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.offsetWidth;
      setSize(Math.min(Math.max(w, 300), 560));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const tick = (t: number) => {
      if (!last.current) last.current = t;
      const dt = t - last.current;
      last.current = t;
      setAngle((a) => (a + dt * 0.012) % 360);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  const center = size / 2;
  const radius = size * 0.4;        // 40% of size
  const ringInner = size * 0.27;
  const centerBox = size < 420 ? 80 : 112;
  const centerLogo = centerBox - 56;

  // Planets rely on animated angle; keep them empty on server render to avoid hydration drift.
  const planets = mounted
    ? STACK.map((s, i) => {
        const a = (angle + (i / STACK.length) * 360) * (Math.PI / 180);
        return { ...s, x: center + Math.cos(a) * radius, y: center + Math.sin(a) * radius };
      })
    : [];

  return (
    <div ref={containerRef} className="relative mx-auto w-full max-w-xl">
      <div className="relative mx-auto" style={{ width: size, height: size }}>
        <svg
          className="absolute inset-0"
          viewBox={`0 0 ${size} ${size}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(13,26,40,0.1)" strokeDasharray="3 5" />
          <circle cx={center} cy={center} r={ringInner} fill="none" stroke="rgba(13,26,40,0.06)" />
          {planets.map((p, i) => (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={p.x}
              y2={p.y}
              stroke="rgba(47,124,255,0.15)"
              strokeWidth="1"
              strokeDasharray="2 5"
            />
          ))}
        </svg>

        <motion.div
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, type: "spring" }}
          className="absolute flex items-center justify-center rounded-2xl border border-border bg-white shadow-xl"
          style={{
            width: centerBox,
            height: centerBox,
            left: center - centerBox / 2,
            top: center - centerBox / 2,
          }}
        >
          <Image src="/applybloom-logo.svg" alt="" width={centerBox === 80 ? 40 : 56} height={centerBox === 80 ? 40 : 56} priority />
        </motion.div>

        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            aria-hidden
            className="absolute rounded-full border-2"
            style={{ borderColor: "rgba(47,124,255,0.3)", left: center, top: center }}
            initial={{ width: centerBox, height: centerBox, x: -centerBox / 2, y: -centerBox / 2, opacity: 0 }}
            animate={{ width: radius * 2, height: radius * 2, x: -radius, y: -radius, opacity: [0, 0.4, 0] }}
            transition={{ duration: 4, repeat: Infinity, delay: i * 1.3, ease: "easeOut" }}
          />
        ))}

        {planets.map((p, i) => (
          <motion.div
            key={p.name}
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + i * 0.08, type: "spring" }}
            className="absolute"
            style={{ left: p.x, top: p.y, transform: "translate(-50%, -50%)" }}
          >
            <div className={`flex items-center gap-2 rounded-full border border-border bg-white shadow-lg ${size < 420 ? "px-2 py-1" : "min-w-[160px] px-3 py-2"}`}>
              <span
                className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${size < 420 ? "h-5 w-5 text-[9px]" : "h-6 w-6 text-[10px]"}`}
                style={{ background: p.color }}
              >
                {p.name[0]}
              </span>
              <div className="min-w-0">
                <p className={`truncate font-semibold leading-tight ${size < 420 ? "text-[10px]" : "text-xs"}`}>{p.name}</p>
                {size >= 420 ? <p className="truncate text-[10px] leading-tight text-muted-foreground">{p.desc}</p> : null}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
