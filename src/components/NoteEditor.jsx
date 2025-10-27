import {useEffect, useRef, useState } from 'react';
import { useNotes } from '../context/NotesContext';

export default function NoteEditor() {
    const { addNote } = useNotes();
    const [text, setText] = useState("");
    const inputRef = useRef(null);

    // focus the input on mount and after submit
    useEffect(() => {
        inputRef.current?.focus();
    }, []);


    // adds a note, and resets text
    // called by onChange
    // param (e) = event
    function handleSubmit(e) {
        e.preventDefault();
        addNote(text);
        setText("");
        inputRef.current?.focus();
    }

    function handleKeyDown(e) {
        if ((e.ctrlkey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            handleSubmit(e);
        }
    }

    return (
        <form className="addNote-container" onSubmit={handleSubmit}>
            <textarea
                className="add-note-area"
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write a note..."
                rows={3}
            ></textarea>
            <div className="btn-row">
                <button className="primary" type="submit">Add</button>
                <button className="secondary" type="button" onClick={()=> { setText(""); inputRef.current?.focus(); }}>
                    Clear
                </button>
            </div>
        </form>
    );
}