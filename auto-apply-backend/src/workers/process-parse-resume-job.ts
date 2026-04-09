import { parseResume } from "@/services/parse-resume";
import { storeApplicationEvent } from "@/services/store-application-event";
import { saveRuntimeProfile } from "@/lib/state/runtime-store";

export async function processParseResumeJob(message: {
  user_id: string;
  artifact_id: string;
  resume_text?: string;
  request_id: string;
}) {
  const parsedProfile = await parseResume(message.resume_text ?? message.artifact_id);
  saveRuntimeProfile({
    user_id: message.user_id,
    full_name: parsedProfile.full_name,
    headline: parsedProfile.headline,
    skills: parsedProfile.skills,
    years_experience: parsedProfile.years_experience,
    summary: parsedProfile.summary,
    updated_at: new Date().toISOString(),
  });

  await storeApplicationEvent({
    user_id: message.user_id,
    request_id: message.request_id,
    event_type: "resume_parsed",
    metadata: parsedProfile,
  });

  return parsedProfile;
}
