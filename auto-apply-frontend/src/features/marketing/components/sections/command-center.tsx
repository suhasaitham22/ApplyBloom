"use client";
import { motion, useMotionValue, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";
import { FileText, MessageSquare, LineChart } from "lucide-react";

export function CommandCenterSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  // Cards fan out from a stack as you scroll
  const card1 = {
    x: useTransform(scrollYProgress, [0.2, 0.6], [0, -30]),
    y: useTransform(scrollYProgress, [0.2, 0.6], [120, 0]),
    rotate: useTransform(scrollYProgress, [0.2, 0.6], [0, -8]),
  };
  const card2 = {
    x: useTransform(scrollYProgress, [0.2, 0.6], [0, 60]),
    y: useTransform(scrollYProgress, [0.2, 0.6], [120, 120]),
    rotate: useTransform(scrollYProgress, [0.2, 0.6], [0, 4]),
  };
  const card3 = {
    x: useTransform(scrollYProgress, [0.2, 0.6], [0, -40]),
    y: useTransform(scrollYProgress, [0.2, 0.6], [120, 240]),
    rotate: useTransform(scrollYProgress, [0.2, 0.6], [0, -3]),
  };

  return (
    <section ref={ref} id="studio" className="relative overflow-hidden bg-[#0d1a28] py-24 sm:py-40 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(600px circle at 80% 30%, rgba(244,162,27,0.15), transparent 60%)" }}
      />
      <div className="mx-auto grid max-w-6xl gap-16 px-6 md:grid-cols-2 md:items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-xs uppercase tracking-[0.24em] text-white/50">Your command center</p>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl leading-tight tracking-tight sm:text-5xl md:text-6xl">
            One studio. <span className="italic text-white/60">Every application.</span>
          </h2>
          <p className="mt-6 max-w-md text-white/70">
            Scroll and watch the studio fan out — resume, chat, tracking — three panes that stay in sync so nothing ever collides.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/80">
            <li className="flex items-start gap-3"><Dot /> Tabbed resumes, one click away</li>
            <li className="flex items-start gap-3"><Dot /> Single-apply or batch auto-apply</li>
            <li className="flex items-start gap-3"><Dot /> Session-scoped chat with action cards</li>
            <li className="flex items-start gap-3"><Dot /> Live resume diffs with accept/reject</li>
          </ul>
        </motion.div>

        <div className="relative h-[380px] sm:h-[520px]">
          <TiltCard motion={card1} baseLeft="20%" baseTop="5%"><FakeResumePanel /></TiltCard>
          <TiltCard motion={card2} baseLeft="20%" baseTop="5%"><FakeChatPanel /></TiltCard>
          <TiltCard motion={card3} baseLeft="20%" baseTop="5%"><FakeDashboardPanel /></TiltCard>
        </div>
      </div>
    </section>
  );
}

function Dot() {
  return <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#f4a21b" }} />;
}

function TiltCard({
  children,
  baseLeft,
  baseTop,
  motion: m,
}: {
  children: React.ReactNode;
  baseLeft: string;
  baseTop: string;
  motion: { x: MotionValue<number>; y: MotionValue<number>; rotate: MotionValue<number> };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useTransform(my, [-0.5, 0.5], [8, -8]);
  const ry = useTransform(mx, [-0.5, 0.5], [-8, 8]);
  return (
    <motion.div
      ref={ref}
      className="absolute"
      style={{
        left: baseLeft,
        top: baseTop,
        x: m.x,
        y: m.y,
        rotate: m.rotate,
        rotateX: rx,
        rotateY: ry,
        transformStyle: "preserve-3d",
        perspective: 1000,
      }}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => { mx.set(0); my.set(0); }}
    >
      {children}
    </motion.div>
  );
}

function FakeResumePanel() {
  return (
    <div className="w-[240px] rounded-xl border border-white/10 bg-white p-4 text-[#0d1a28] shadow-2xl">
      <div className="mb-2 flex items-center gap-2">
        <FileText className="h-3.5 w-3.5" style={{ color: "#2f7cff" }} />
        <p className="text-xs font-medium">Resume_2026.pdf</p>
      </div>
      <p className="text-sm font-semibold">Your Name</p>
      <p className="text-xs text-black/50">Senior Product Designer</p>
      <div className="mt-3 space-y-1.5">
        <div className="h-1 w-full rounded-full bg-black/10" />
        <div className="h-1 w-4/5 rounded-full bg-black/10" />
        <div className="h-1 w-3/4 rounded-full" style={{ background: "rgba(47,124,255,0.3)" }} />
      </div>
    </div>
  );
}
function FakeChatPanel() {
  return (
    <div className="w-[260px] rounded-xl border border-white/10 bg-white p-4 text-[#0d1a28] shadow-2xl">
      <div className="mb-2 flex items-center gap-2">
        <MessageSquare className="h-3.5 w-3.5" style={{ color: "#2f7cff" }} />
        <p className="text-xs font-medium">UX @ Netflix</p>
      </div>
      <div className="space-y-2">
        <div className="rounded-lg bg-black/5 px-3 py-2 text-xs">Tailor for this job</div>
        <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(47,124,255,0.1)" }}>
          ✓ 6 bullets rewritten · 92% match
        </div>
      </div>
    </div>
  );
}
function FakeDashboardPanel() {
  return (
    <div className="w-[250px] rounded-xl border border-white/10 bg-white p-4 text-[#0d1a28] shadow-2xl">
      <div className="mb-2 flex items-center gap-2">
        <LineChart className="h-3.5 w-3.5" style={{ color: "#f4a21b" }} />
        <p className="text-xs font-medium">12 applications</p>
      </div>
      <div className="space-y-1.5">
        {[["Netflix", "submitted"], ["Stripe", "in review"], ["Figma", "submitted"]].map(([c, s]) => (
          <div key={c} className="flex items-center justify-between text-xs">
            <span className="font-medium">{c}</span>
            <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: "rgba(244,162,27,0.2)", color: "#8a5a0c" }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
