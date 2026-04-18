import { StudioShellStub } from "@/features/studio/components/studio-shell-stub";

// Next.js 15: params is a Promise
export default async function StudioPage({
  params,
}: {
  params: Promise<{ sessionId?: string[] }>;
}) {
  const { sessionId } = await params;
  return <StudioShellStub sessionId={sessionId?.[0] ?? null} />;
}
