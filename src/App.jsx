import SearchBar from "./components/SearchBar"
import NoteEditor from "./components/NoteEditor"
import NoteList from "./components/NoteList"
import "./styles.css";

export default function App() {

  const user = {
    fname: "Tyler",
    lname: "Davis"
  }
  return (
    <div className="container">
      <div className="header">
        <h1>{user.fname} {user.lname}'s Notes</h1>
        <SearchBar/>
        <NoteEditor/>
      </div>
      <NoteList/>
    </div>
  );
}