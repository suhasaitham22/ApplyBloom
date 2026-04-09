export function requireArrayOfStrings(
  value: unknown,
  fieldName: string,
): { ok: true; value: string[] } | { ok: false; error: string } {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    return {
      ok: false,
      error: `${fieldName} must be an array of strings`,
    };
  }

  return { ok: true, value: value.map((item) => item.trim()).filter(Boolean) };
}

