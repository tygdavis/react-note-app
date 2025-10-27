import {useNotes} from "../context/NotesContext";

function SearchBar() {
    const { searchTerm, setSearchTerm }= useNotes();

    return (
        <input
            className="searchBar"
            placeholder="Search notes... (by note, created at, updated at)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
        />
    );
}

export default SearchBar;
