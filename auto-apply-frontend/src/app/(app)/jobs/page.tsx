import { Suspense } from "react";
import { JobsPage } from "@/features/jobs/components/jobs-page";

export default function Page() {
  return <Suspense><JobsPage /></Suspense>;
}
