const SLUG_STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "in", "on", "at", "to", "for", "with",
  "near", "by", "&",
]);

export function generateListingSlug(title: string, referenceCode?: string | null): string {
  const base = slugify(title);
  if (referenceCode) {
    return `${base}-${slugify(referenceCode)}`;
  }
  return base;
}

export function normalizeSlug(input: string): string {
  return slugify(input);
}

export function stripStopwords(input: string): string {
  return input
    .split("-")
    .filter((part) => part.length > 0 && !SLUG_STOPWORDS.has(part))
    .join("-");
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
