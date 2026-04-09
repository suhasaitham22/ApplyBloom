export function requireNonEmptyString(
  value: unknown,
  fieldName: string,
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof value !== "string" || value.trim().length === 0) {
    return {
      ok: false,
      error: `${fieldName} must be a non-empty string`,
    };
  }

  return { ok: true, value: value.trim() };
}

