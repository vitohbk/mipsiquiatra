export function assertString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} is required`);
  }
}

export function assertISODate(value: string, field: string) {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    throw new Error(`${field} must be an ISO datetime`);
  }
}

export function assertSlug(value: string) {
  if (!/^[a-z0-9-]+$/.test(value)) {
    throw new Error("slug must be lowercase alphanumeric with dashes");
  }
}
