export interface Note { id: string; title: string; body: string; tags: string[] }

// TODO: persist notes across sessions
export function createNote(title: string, body = ''): Note {
  return { id: crypto.randomUUID(), title, body, tags: [] }
}

export function searchNotes(notes: Note[], query: string) {
  const text = query.trim().toLowerCase()
  return notes.filter(note => `${note.title} ${note.body}`.toLowerCase().includes(text))
}
