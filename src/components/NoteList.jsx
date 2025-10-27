import { useMemo } from "react";
import { useNotes } from "../context/NotesContext";
import NoteItem from "./NoteItem";

export default function NoteList() {
  const { notes, searchTerm } = useNotes();

  const { filtered, isFiltered } = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const isFiltered = q.length > 0;

    const base = isFiltered
    ? notes.filter((n) => {
        const text = n.text.toLowerCase();
        const created = new Date(n.createdAt).toLocaleString().toLowerCase();
        const updated = new Date(n.updatedAt).toLocaleString().toLowerCase();
        return text.includes(q) || created.includes(q) || updated.includes(q);
        })
    : notes;


    const filtered = [...base].sort((a, b) => {
      const au = a.updatedAt ?? a.createdAt ?? 0;
      const bu = b.updatedAt ?? b.createdAt ?? 0;
      return bu - au; // newest first
    });

    return { filtered, isFiltered };
  }, [notes, searchTerm]);

  if (filtered.length === 0) {
    return (
      <p style={{ color: "#666" }}>
        {isFiltered ? "No notes match your search." : "No notes yet!"}
      </p>
    );
  }

  return (
    <ul className="note-container">
      {filtered.map((note) => (
        <NoteItem key={note.id} note={note} />
      ))}
    </ul>
  );
}
