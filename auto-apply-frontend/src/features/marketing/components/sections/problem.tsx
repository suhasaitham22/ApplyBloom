"use client";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";
import { Search, FileText, ClipboardList, LineChart, Mail } from "lucide-react";

const PAINS = [
  { icon: Search, title: "Finding roles", body: "Scrolling five boards and three Slack channels to find jobs that actually fit.", fromX: -60, fromY: -40, rot: -18 },
  { icon: FileText, title: "Rewriting resumes", body: "Starting each application by tweaking bullets you've tweaked a hundred times.", fromX: 80, fromY: -60, rot: 22 },
  { icon: ClipboardList, title: "Filling forms", body: "Typing the same email, school, and phone number into the same ATS for the thousandth time.", fromX: -40, fromY: 80, rot: -14 },
  { icon: LineChart, title: "Tracking spreadsheets", body: "Updating a spreadsheet — or, honestly, forgetting to — every single day.", fromX: 70, fromY: 60, rot: 18 },
  { icon: Mail, title: "Following up", body: "Trying to remember who you told what, and when, and why.", fromX: 0, fromY: -100, rot: -8 },
];

export function ProblemSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  return (
    <section ref={ref} id="problem" className="relative bg-background py-24 sm:py-40">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 0.6 }}
          className="mb-24 max-w-2xl"
        >
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">The problem</p>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl leading-tight tracking-tight sm:text-5xl md:text-6xl">
            Applying to jobs is five boring jobs{" "}
            <span className="italic text-muted-foreground">wearing a trench coat.</span>
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Scroll and watch them click into place — because that's what ApplyBloom does for you.
          </p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {PAINS.map((p, i) => (
            <AssembleCard key={p.title} pain={p} progress={scrollYProgress} />
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mx-auto mt-20 max-w-xl text-center text-lg text-muted-foreground"
        >
          ApplyBloom collapses all of that into{" "}
          <span className="font-medium text-foreground">one calm workspace.</span>
        </motion.p>
      </div>
    </section>
  );
}

function AssembleCard({ pain, progress }: { pain: typeof PAINS[number]; progress: MotionValue<number> }) {
  const x = useTransform(progress, [0.15, 0.55], [pain.fromX, 0]);
  const y = useTransform(progress, [0.15, 0.55], [pain.fromY, 0]);
  const rotate = useTransform(progress, [0.15, 0.55], [pain.rot, 0]);
  const opacity = useTransform(progress, [0.1, 0.35], [0, 1]);
  return (
    <motion.div
      style={{ x, y, rotate, opacity }}
      whileHover={{ y: -8, scale: 1.03, transition: { duration: 0.2 } }}
      className="rounded-xl border border-border bg-background p-5 shadow-sm"
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "rgba(47,124,255,0.08)" }}>
        <pain.icon className="h-5 w-5" style={{ color: "#2f7cff" }} />
      </div>
      <h3 className="font-display text-lg tracking-tight">{pain.title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{pain.body}</p>
    </motion.div>
  );
}
