import { createContext, useContext, useEffect, useMemo, useState } from 'react';


// create context that can be passed down
    // set later in return
const NotesContext = createContext(null);
    // storage key for all the notes
const STORAGE_KEY = "notes_v1";
export function NotesProvider({ children }) {
    const [notes, setNotes] = useState(()=>{
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });

    const [searchTerm, setSearchTerm] = useState("");

    // persist to localStorage
    useEffect(()=> {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    }, [notes]);

    function addNote(text) {
        if (!text.trim()) return;

        const now = Date.now();
        // add note object to note array
        setNotes((prev) => [
            { id: crypto.randomUUID?.() ?? String(now), text: text.trim(), createdAt: now, updatedAt: now },
            ...prev,
        ]);
    }

    function updateNote(id, fields) {
        setNotes((prev) => 
            prev.map((n) => 
                (n.id === id ? { ...n, ...fields, updatedAt: Date.now() }: n))
        );
    }

    function deleteNote(id) {
        const confirmDelete = confirm("Are you sure you want to delete this note?");
        if (confirmDelete) {
            setNotes((prev) => prev.filter((n) => n.id !== id));
        }
    }

    const value = useMemo(
        () => ({notes, addNote, updateNote, deleteNote, searchTerm, setSearchTerm}),
        [notes, searchTerm]
    );

    return (
        <NotesContext.Provider value={value}
        >{children}</NotesContext.Provider>
    )
}

export function useNotes() {
    const ctx = useContext(NotesContext);
    if (!ctx) throw new Error("useNotes must be used within a NotesProvider");
    return ctx;
}