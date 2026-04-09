import { recordRuntimeApplicationEvent } from "@/lib/state/runtime-store";

export interface StoreApplicationEventPayload {
  user_id: string;
  request_id: string;
  event_type: string;
  metadata: unknown;
  job_id?: string;
}

export interface StoreApplicationEventResult {
  stored: boolean;
  event_id: string;
}

export async function storeApplicationEvent(
  payload: StoreApplicationEventPayload,
): Promise<StoreApplicationEventResult> {
  const eventId = payload.job_id
    ? `${payload.user_id}:${payload.job_id}:${payload.event_type}:${payload.request_id}`
    : `${payload.user_id}:${payload.event_type}:${payload.request_id}`;

  void payload.metadata;
  recordRuntimeApplicationEvent(payload);

  return {
    stored: true,
    event_id: eventId,
  };
}
