export function buildSuccessPayload<T extends object>(data: T, requestId: string) {
  return {
    data,
    meta: {
      request_id: requestId,
    },
  };
}
