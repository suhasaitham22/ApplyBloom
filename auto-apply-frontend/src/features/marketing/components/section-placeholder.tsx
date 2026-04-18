import { cn } from "@/lib/utils";

interface Props {
  id?: string;
  eyebrow: string;
  title: string;
  body: string;
  dark?: boolean;
}

export function SectionPlaceholder({ id, eyebrow, title, body, dark }: Props) {
  return (
    <section
      id={id}
      className={cn("relative flex min-h-[100svh] items-center px-6", dark ? "bg-[#0d1a28] text-white" : "bg-background text-foreground")}
    >
      <div className="mx-auto max-w-3xl">
        <p className={cn("text-xs uppercase tracking-[0.24em]", dark ? "text-white/60" : "text-muted-foreground")}>{eyebrow}</p>
        <h2 className="mt-4 font-display text-4xl leading-tight tracking-tight sm:text-6xl">{title}</h2>
        <p className={cn("mt-6 max-w-xl text-lg", dark ? "text-white/70" : "text-muted-foreground")}>{body}</p>
      </div>
    </section>
  );
}
