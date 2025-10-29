import { useMemo, useState, useEffect, useRef } from "react";
import { useNotes } from "../context/NotesContext";
import NoteItem from "./NoteItem";

// dnd-kit
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensors,
  useSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

// Helper: detect coarse (touch) pointer once and keep it stable
function useIsCoarsePointer() {
  const ref = useRef(false);
  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      ref.current = window.matchMedia("(pointer: coarse)").matches;
    }
  }, []);
  return ref.current;
}

export default function NoteList() {
  const { notes, searchTerm, reorderNotes } = useNotes();
  const [activeId, setActiveId] = useState(null);
  const isCoarse = useIsCoarsePointer();

  // Mouse: quick drag with small movement; Touch: require a short press-and-hold
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: isCoarse
        ? { delay: 75, tolerance: 8 } // press 200ms before drag; allow small finger wiggle
        : { distance: 6 },            // mouse needs to move 6px to start drag
    }),
    useSensor(KeyboardSensor)
  );

  const { filtered, isFiltered } = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const isFiltered = q.length > 0;

    if (!isFiltered) {
      const ordered = [...notes].sort((a, b) => {
        const ap = a.position ?? 0;
        const bp = b.position ?? 0;
        if (ap !== bp) return ap - bp;
        const au = a.updatedAt ?? a.createdAt ?? 0;
        const bu = b.updatedAt ?? b.createdAt ?? 0;
        return bu - au;
      });
      return { filtered: ordered, isFiltered };
    }

    const base = notes.filter((n) => {
      const text = n.text.toLowerCase();
      const created = new Date(n.createdAt).toLocaleString().toLowerCase();
      const updated = new Date(n.updatedAt).toLocaleString().toLowerCase();
      return text.includes(q) || created.includes(q) || updated.includes(q);
    });

    const filtered = [...base].sort((a, b) => {
      const au = a.updatedAt ?? a.createdAt ?? 0;
      const bu = b.updatedAt ?? b.createdAt ?? 0;
      return bu - au;
    });

    return { filtered, isFiltered };
  }, [notes, searchTerm]);

  if (filtered.length === 0) {
    return (
      <p style={{ color: "#666" }}>
        {searchTerm ? "No notes match your search." : "No notes yet!"}
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={({ active }) => {
        if (isFiltered) return;
        setActiveId(active?.id ?? null);
      }}
      onDragOver={({ active, over }) => {
        if (isFiltered) return;
        if (!active || !over) return;
        if (active.id === over.id) return;
        reorderNotes(active.id, over.id);
      }}
      onDragEnd={() => setActiveId(null)}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext
        items={filtered.map((n) => n.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className={`note-container${activeId ? " dragging" : ""}`}>
          {filtered.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              draggable={!isFiltered}
              isDragging={activeId === note.id}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
