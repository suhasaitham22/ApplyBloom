import { StudioShell } from "@/features/studio/components/studio-shell";

export default async function StudioPage({
  params,
}: {
  params: Promise<{ sessionId?: string[] }>;
}) {
  const { sessionId } = await params;
  return <StudioShell sessionId={sessionId?.[0] ?? null} />;
}
