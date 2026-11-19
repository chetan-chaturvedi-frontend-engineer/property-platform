/** Conversions between API values and form inputs for the wizard steps. */

/** The fields whose values differ, so a PATCH never rewrites what the admin did not touch. */
export function changedFields<T extends Record<string, unknown>>(
  original: Partial<Record<keyof T, unknown>>,
  next: T,
): Partial<T> {
  const changes: Partial<T> = {};
  for (const key of Object.keys(next) as Array<keyof T>) {
    if (JSON.stringify(original[key] ?? null) !== JSON.stringify(next[key] ?? null)) {
      changes[key] = next[key];
    }
  }
  return changes;
}

/** '' -> null for optional text, so clearing a field clears it on the server. */
export function textOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function numberOrNull(value: string): number | null {
  return value.trim() === '' ? null : Number(value);
}

export function numberOrUndefined(value: string): number | undefined {
  return value.trim() === '' ? undefined : Number(value);
}

/** null -> '' for form inputs. */
export function toInput(value: string | number | null | undefined): string {
  return value == null ? '' : String(value);
}
