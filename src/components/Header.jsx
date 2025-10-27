import { useNotes } from '../context/NotesContext.jsx';
import settings from '../assets/settings.png';
import {useRef, useState, useEffect} from 'react';
function Header() {

    const settingRef = useRef(null);
    const {session, setDisplayName} = useNotes();
    const [rotating, setRotating] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [first, setFirst] = useState(session?.user?.user_metadata?.first_name ?? '');
    const [last, setLast] = useState(session?.user?.user_metadata?.last_name ?? '');
    const [message, setMessage] = useState('');

    // makes setting gear spin
    function spinOnce() {
        setRotating(true);
        setTimeout(()=> setRotating(false),600);
    }

    function onSettingsClick() {
        // make the button rotate
        // create a modal settings menu that allows the user to change their name
        // it uses setDisplayName
        spinOnce();
        setIsOpen(true);
    }

    // close modal with esc
    useEffect(()=>{
        function handleKey(e) {
            if (e.key==='Escape') setIsOpen(false);
        }
        if (isOpen) window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen]);

    async function handleSave(e) {
        e.preventDefault();
        try {
            await setDisplayName(first.trim(), last.trim());
            setMessage('Name updated!');
            setTimeout(()=> setMessage(''), 2000);
            setIsOpen(false);
        } catch (err) {
            setMessage(err.message ?? String(err));
        }
    }

    return (
    <header className="navbar">
        <nav>
            <ul>
                <button
                    ref={settingRef}
                    type="button"
                    className={`icon-btn ${rotating ? 'spin' : ''}`}
                    aria-label="Settings"
                    title="Settings"
                    onClick={onSettingsClick}
                >
                    <img className="icon" src={settings} alt="settings"></img>
                </button>
            </ul>
        </nav>

        {isOpen && (
            <div
                className="note-overlay"
                onClick={()=>setIsOpen(false)}
                role="dialog"
                aria-modal="true"
            >
                <div
                    className="note-overlay-content"
                    onClick={(e) => e.stopPropagation()} // prevent closing
                >
                    <h3 style={{color: 'black'}}>Settings</h3>
                    <form onSubmit={handleSave}>
                        <div>
                            <h4 style={{color: 'black', marginBottom: '1rem'}}>Update Name</h4>
                            <input
                            placeholder='First name'
                            value={first}
                            onChange={(e) => setFirst(e.target.value)}
                            />
                            <input
                                placeholder='Last name'
                                value={last}
                                onChange={(e) => setLast(e.target.value)}
                            />
                        </div>
                        
                        <div className="btn-row">
                            <button className="primary" type="submit">
                                Save
                            </button>
                            <button
                                className="secondary"
                                type="button"
                                onClick={()=> setIsOpen(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                    {message && <small style={{color: '#2E7D32'}}>{message}</small>}
                </div>
            </div>
        )}
    </header>
    );
}

export default Header;