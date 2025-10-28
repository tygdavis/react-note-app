// src/App.jsx
import { NotesProvider, useNotes } from './context/NotesContext';
import { useState } from 'react';
import NoteList from './components/NoteList';
import NoteEditor from './components/NoteEditor';
import SearchBar from './components/SearchBar';
import Header from './components/Header';
import PasswordField from './components/PasswordField';
import './styles.css';

import showEye from './assets/showEye.png';
import hideEye from './assets/hideEye.png';

function AuthScreen() {
  const { signIn, signUp } = useNotes();

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    const f = new FormData(e.currentTarget);
    const email = f.get('email')?.toString().trim();
    const password = f.get('password')?.toString();
    const firstName = f.get('firstname')?.toString().trim() || '';
    const lastName = f.get('lastname')?.toString().trim() || '';
    const confirm = f.get('confirm')?.toString();

    try {
      if (mode === 'signup') {
        if (!email || !password) throw new Error('Email and password are required.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        if (confirm !== password) throw new Error('Passwords do not match.');

        // Pass names so they land in auth user_metadata
        const { session } = await signUp(email, password, firstName, lastName);
        if (!session) setInfo('Check your email to confirm your account, then sign in!');
      } else {
        if (!email || !password) throw new Error('Email and password are required.');
        await signIn(email, password);
      }
    } catch (err) {
      setError(err.message ?? String(err));
    }
  }

  return (
    <form className="container" onSubmit={handleSubmit} style={{ display: 'grid', gap: 10, maxWidth: 360 }}>
      <h2>{mode === 'signin' ? 'Sign in' : 'Create an Account'}</h2>

      <input name="email" type="email" placeholder="Email" autoComplete="email" required />
      <div className="password-container">
        <PasswordField isToggleable={true}/>
      </div>

      

      {mode === 'signup' && (
        <>
          {/* make these required only if you want to force names at sign-up */}
          <div className="password-container">
            <PasswordField isConfirm={true} isToggleable={true}/>

          </div>
          <input name="firstname" placeholder="First Name" autoComplete="given-name" />
          <input name="lastname" placeholder="Last Name" autoComplete="family-name" />
        </>
      )}

      <button className="primary" type="submit">
        {mode === 'signin' ? 'Sign in' : 'Sign up'}
      </button>

      <button
        type="button"
        className="secondary"
        onClick={() => {
          setMode(m => (m === 'signin' ? 'signup' : 'signin'));
          setError('');
          setInfo('');
        }}
      >
        {mode === 'signin' ? "Don't have an account? Sign Up!" : 'Already have an account? Sign in'}
      </button>

      {error && <small style={{ color: 'crimson' }}>{error}</small>}
      {info && <small style={{ color: 'seagreen' }}>{info}</small>}
    </form>
  );
}

function AppInner() {
  const { displayName, session, signOut } = useNotes();
  if (!session) return <AuthScreen />;
  return (
    <>
    <main>
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', fontSize:'1.5rem' }}>
          <p style={{ margin: 0 }}>
            <strong>{displayName}
              {displayName[displayName.length-1].toLowerCase() === 's' ? "'" : "'s"}
            </strong>&nbsp;Notes</p>
          <button className="primary" onClick={signOut}>Sign out</button>
        </div>

        <SearchBar />
        <NoteEditor />
        <NoteList />
      </div>
    </main>
    </>
  );
}

export default function App() {
  const {session} = useNotes();
  return (
    <NotesProvider>
      {session && <Header/>}
      <AppInner />
    </NotesProvider>
  );
}
