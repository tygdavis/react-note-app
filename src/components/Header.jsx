import { useNotes } from '../context/NotesContext.jsx';
import settings from '../assets/settings.png';
import { useRef, useState, useEffect } from 'react';
import PasswordField from './PasswordField.jsx';
import supabase from '../lib/supabaseClient.js';

function Header() {

    const settingRef = useRef(null);
    const { session, setDisplayName } = useNotes();
    const [rotating, setRotating] = useState(false);
    // modal screen 
    const [isOpen, setIsOpen] = useState(false);
    // update name 
    const [first, setFirst] = useState(session?.user?.user_metadata?.first_name ?? '');
    const [last, setLast] = useState(session?.user?.user_metadata?.last_name ?? '');
    // update password
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [changePassword, setChangePassword] = useState(false); // ← add toggle so password change is opt-in
    // message
    const [message, setMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // makes setting gear spin
    function spinOnce() {
        setRotating(true);
        setTimeout(() => setRotating(false), 600);
    }

    function onSettingsClick() {
        // make the button rotate
        // create a modal settings menu that allows the user to change their name
        // it uses setDisplayName
        spinOnce();
        setIsOpen(true);
    }

    // reset contents of settings modal when closing
    useEffect(() => {
        setChangePassword(false);
    }, [isOpen])

    // close modal with esc
    useEffect(() => {
        function handleKey(e) {
            if (e.key === 'Escape') setIsOpen(false);
        }
        if (isOpen) window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen]);

    // ----- derived state & validation (kept separate for clarity) -----
    const currentFirst = session?.user?.user_metadata?.first_name ?? "";
    const currentLast  = session?.user?.user_metadata?.last_name  ?? "";

    const nameChanged =
        first.trim() !== currentFirst || last.trim() !== currentLast;

    // only consider password change if the user enabled it
    const wantsPasswordChange =
        changePassword && (newPassword.length > 0 || confirmPassword.length > 0);

    const passwordsMatch = newPassword === confirmPassword;
    const passwordValidLength = newPassword.length >= 6 && confirmPassword.length >= 6;

    const canSubmit =
        nameChanged ||
        (wantsPasswordChange && passwordsMatch && passwordValidLength);
    // -----------------------------------------------------------------

    async function handleSave(e) {
        e.preventDefault();
        if (isSaving) return;

        setMessage('');
        setIsSaving(true);

        // client-side checks for password section
        if (wantsPasswordChange) {
            if (!passwordsMatch) {
                setMessage('Passwords do not match.');
                setIsSaving(false);
                return;
            }
            if (!passwordValidLength) {
                setMessage('Password must be at least 6 characters.');
                setIsSaving(false);
                return;
            }
        }

        const ops = [];

        // update name if changed
        if (nameChanged) {
            ops.push(
                (async () => {
                    await setDisplayName(first.trim(), last.trim());
                })()
            );
        }

        // update password if requested (toggle on and fields provided)
        if (wantsPasswordChange) {
            ops.push(
                (async () => {
                    const { error } = await supabase.auth.updateUser({ password: newPassword });
                    if (error) throw new Error(error.message);
                })()
            );
        }

        if (ops.length === 0) {
            setMessage('Nothing to update.');
            setIsSaving(false);
            return;
        }

        try {
            await Promise.all(ops);
            // clear sensitive fields
            setNewPassword("");
            setConfirmPassword("");
            // if user turned the toggle off, ensure fields stay cleared and no accidental submit later
            if (!changePassword) {
                setNewPassword("");
                setConfirmPassword("");
            }

            setMessage('Settings updated!');
            // close shortly after success
            setTimeout(() => {
                setMessage('');
                setIsOpen(false);
            }, 1200);
        } catch (err) {
            setMessage(err?.message ?? 'Something went wrong updating your settings.');
        } finally {
            setIsSaving(false);
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
                        <img className="icon" src={settings} alt="settings" />
                    </button>
                </ul>
            </nav>

            {isOpen && (
                <div
                    className="note-overlay"
                    onClick={() => setIsOpen(false)}
                    role="dialog"
                    aria-modal="true"
                >
                    <div
                        className="note-overlay-content"
                        onClick={(e) => e.stopPropagation()} // prevent closing
                    >
                        <h3 style={{ color: 'black' }}>Settings</h3>
                        <form onSubmit={handleSave}>
                            <div id="updateName">
                                <h4 style={{ color: 'black', marginBottom: '1rem' }}>Update Name</h4>
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

                            <div id="updatePassword" style={{ marginTop: '1rem' }}>
                                <h4 style={{ color: 'black', marginBottom: '0.5rem' }}>Update Password</h4>

                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'black' }}>
                                    <input
                                        type="checkbox"
                                        checked={changePassword}
                                        onChange={(e) => {
                                            const enabled = e.target.checked;
                                            setChangePassword(enabled);
                                            // clear fields when turning it off so it never submits accidentally
                                            if (!enabled) {
                                                setNewPassword("");
                                                setConfirmPassword("");
                                            }
                                        }}
                                    />
                                    Change password
                                </label>

                                {changePassword && (
                                    <>
                                        <PasswordField 
                                            value={newPassword} 
                                            onChange={setNewPassword}
                                            placeholder='New Password' />
                                        <PasswordField
                                            value={confirmPassword}
                                            onChange={setConfirmPassword}
                                            isConfirm
                                            isToggleable={false}
                                        />
                                        <small
                                            style={{
                                                fontSize: '.8rem',
                                                color: 'black',
                                                display: 'block',
                                                margin: 0
                                            }}
                                        >
                                            Password must be at least 6 characters
                                        </small>
                                        {wantsPasswordChange && !passwordsMatch && (
                                            <small style={{ color: '#c62828' }}>
                                                Passwords do not match.
                                            </small>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="btn-row" style={{ marginTop: '1rem' }}>
                                <button className="primary" type="submit" disabled={isSaving || !canSubmit}>
                                    {isSaving ? 'Saving…' : 'Save'}
                                </button>
                                <button
                                    className="secondary"
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                        {message && <small style={{ color: '#2E7D32' }}>{message}</small>}
                    </div>
                </div>
            )}
        </header>
    );
}

export default Header;
