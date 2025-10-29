import { useState, useRef, useEffect } from "react";
import { useNotes } from "../context/NotesContext";
import close from "../assets/close.png";

// dnd-kit
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString();
}

function NoteItem({ note, draggable = false, isDragging = false }) {
  const { updateNote, deleteNote } = useNotes();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(note.text);
  const editRef = useRef(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  // Hook up dnd-kit sortable
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: dndDragging,
    isSorting,
  } = useSortable({
    id: note.id,
    disabled: !draggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Help touch-drag feel responsive & avoid browser scrolling during drag
    touchAction: draggable ? "none" : undefined,
    // Visual feedback
    opacity: dndDragging ? 0.6 : undefined,
    cursor: draggable ? (dndDragging ? "grabbing" : "grab") : "default",
  };

  // focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing) editRef.current?.focus();
  }, [isEditing]);

  // open overlay when starting to edit from the list view
  useEffect(() => {
    if (isEditing) setIsOverlayOpen(true);
  }, [isEditing]);

  // close on Escape when overlay open
  useEffect(() => {
    if (!isOverlayOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setIsOverlayOpen(false);
        setIsEditing(false);
        setDraft(note.text);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOverlayOpen, note.text]);

  function save() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    updateNote(note.id, { text: trimmed });
    setIsEditing(false);
    setIsOverlayOpen(false);
  }

  function openOverlay() {
    // prevent accidental open when the drop triggers a click
    if (dndDragging || isSorting) return;
    setIsOverlayOpen(true);
  }

  function closeOverlay() {
    setIsOverlayOpen(false);
    setIsEditing(false);

    if (draft !== note.text) {
      const wantToSave = confirm("Do you want to save?");
      if (wantToSave) {
        save();
      } else {
        setDraft(note.text);
      }
    }
  }

  return (
    <>
      {/* LIST ITEM (acts as drag handle on mobile/desktop) */}
      <li
        ref={setNodeRef}
        className={`note-item${(isDragging || dndDragging) ? " dragging" : ""}`}
        role="button"
        tabIndex={0}
        aria-label="Open note"
        onClick={openOverlay}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") openOverlay();
        }}
        style={style}
        {...attributes}
        {...listeners}
      >
        <div className="note-body">
          <div className="note-text" style={{ whiteSpace: "pre-wrap" }}>
            {note.text}
          </div>
          <small className="timestamps">
            Created: {formatTime(note.createdAt)} • Updated: {formatTime(note.updatedAt)}
          </small>

          <div className="btn-row">
            <button
              className="secondary item-button"
              type="button"
              onClick={(e) => {
                e.stopPropagation(); // don't open overlay
                setIsEditing(true);
              }}
            >
              Edit
            </button>
            <button
              className="primary item-button"
              type="button"
              onClick={(e) => {
                e.stopPropagation(); // don't open overlay
                deleteNote(note.id);
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </li>

      {/* OVERLAY / MODAL */}
      {isOverlayOpen && (
        <div
          className="note-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Expanded note"
          onClick={closeOverlay} // click backdrop to close
        >
          <div
            className="note-overlay-content"
            onClick={(e) => e.stopPropagation()} // don't close when clicking inside
          >
            <div className="overlay-header">
              <small className="timestamps">
                Created: {formatTime(note.createdAt)} • Updated: {formatTime(note.updatedAt)}
              </small>
              <button
                className="secondary icon-btn"
                type="button"
                onClick={closeOverlay}
                aria-label="Close"
              >
                <img src={close} alt="close" />
              </button>
            </div>

            {isEditing ? (
              <>
                <textarea
                  ref={editRef}
                  rows={10}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
                    if (e.key === "Escape") closeOverlay();
                  }}
                />
                <div className="btn-row">
                  <button className="primary" type="button" onClick={save}>
                    Save
                  </button>
                  <button className="secondary" type="button" onClick={closeOverlay}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="note-text large" style={{ whiteSpace: "pre-wrap" }}>
                  {note.text}
                </div>
                <div className="btn-row">
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </button>
                  <button
                    className="primary"
                    type="button"
                    onClick={() => {
                      deleteNote(note.id);
                      setIsOverlayOpen(false);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default NoteItem;
