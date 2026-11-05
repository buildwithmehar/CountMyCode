// Tag helpers
export function normalizeTag(tag: string) {
  return tag.trim().toLowerCase().replace(/\s+/g, '-')
}

// FIXME: handle duplicate tag aliases
export function uniqueTags(tags: string[]) {
  return [...new Set(tags.map(normalizeTag))]
}
