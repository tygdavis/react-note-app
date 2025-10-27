import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import supabase from '../lib/supabaseClient.js';

const NotesContext = createContext(null);

// map database rows → UI format
function mapRow(row) {
  return {
    id: row.id,
    text: row.content ?? '',
    createdAt: row.created_at ? Date.parse(row.created_at) : null,
    updatedAt: row.updated_at ? Date.parse(row.updated_at) : null,
  };
}

export function NotesProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // ---------- AUTH ----------
  async function signUp(email, password, firstName='', lastName='') {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // optional: uncomment if you use email confirmations
      // options: { emailRedirectTo: window.location.origin },
      options: {
        data: { first_name: firstName, last_name: lastName }
      }
    });
    if (error) throw error;

    // add to profiles
    const uid = data.session?.user?.id ?? data.user?.id;
    if (uid) {
        await supabase.from('profiles').upsert({
            id: uid, first_name: firstName, last_name: lastName
        });
    }
    return data; // may contain null session if email confirmation required
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setNotes([]);
  }

  // create profile row once user is authenticated
  async function ensureProfile() {
    if (!session?.user?.id) return;

    const {user} = session;
    const first = user.user_metadata?.first_name ?? '';
    const last = user.user_metadata?.last_name ?? '';

    await supabase
      .from('profiles')
      .upsert({ 
        id: user.id,
        first_name: first || undefined,
        last_name: last || undefined,
        }, { onConflict: 'id' })
      .select()
      .single()
      .catch(() => {});
  }

  // track Supabase auth session
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
      setLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => setSession(newSession)
    );

    return () => subscription.unsubscribe();
  }, []);

  // ensure a profile exists after login
  useEffect(() => {
    if (session?.user?.id) ensureProfile();
  }, [session?.user?.id]);

  // ---------- NOTES CRUD ----------
  async function refreshNotes() {
    if (!session?.user?.id) return;
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    setNotes((data ?? []).map(mapRow));
  }

  async function addNote(text) {
    const trimmed = (text ?? '').trim();
    if (!trimmed) return;

    const { data, error } = await supabase
      .from('notes')
      .insert({ content: trimmed }) // trigger fills user_id
      .select()
      .single();
    if (error) throw error;

    const mapped = mapRow(data);
    setNotes(prev => [mapped, ...prev]);
  }

  async function updateNote(id, patch) {
    const toUpdate = {};
    if (typeof patch.text === 'string') toUpdate.content = patch.text;

    const { data, error } = await supabase
      .from('notes')
      .update(toUpdate)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    const mapped = mapRow(data);
    setNotes(prev => prev.map(n => (n.id === id ? mapped : n)));
  }

  async function deleteNote(id) {
    const confirmDel = confirm("Are you sure you want to delete this note?");
    if (!confirmDel) return;

    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) throw error;
    
    setNotes(prev => prev.filter(n => n.id !== id));
  }

  // initial load + refresh on login
  useEffect(() => {
    if (session) refreshNotes();
  }, [session]);

  // realtime sync for current user's notes
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel('notes-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotes(prev => [mapRow(payload.new), ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setNotes(prev =>
              prev.map(n => (n.id === payload.new.id ? mapRow(payload.new) : n))
            );
          } else if (payload.eventType === 'DELETE') {
            setNotes(prev => prev.filter(n => n.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session]);

  async function setDisplayName(firstName = '', lastName='') {
    // update metadata
    const {data, error} = await supabase.auth.updateUser({
        data: {first_name: firstName, last_name: lastName}
    });

    if (error) throw error;

    // mirror to profiles
    const uid = data?.user?.id ?? session?.user?.id;

    if (uid) {
        await supabase.from('profiles').upsert({
            id: uid,
            first_name: firstName,
            last_name: lastName
        });
    }

    // refresh session in state
    const {data: s } = await supabase.auth.getSession();
    setSession(s.session ?? null);
  }

  const displayName = useMemo(()=>{
    const meta = session?.user?.user_metadata || {};
    const first = meta.first_name?.trim();
    const last = meta.last_name?.trim();
    return (first || last) ? `${first ?? ''} ${last ?? ''}`.trim() : (session?.user?.email ?? '');
  }, [session]);

  const value = useMemo(
    () => ({
      // auth
      session,
      loading,
      signUp,
      signIn,
      signOut,
      setDisplayName,
      displayName,

      // notes
      notes,
      refreshNotes,
      addNote,
      updateNote,
      deleteNote,

      // search
      searchTerm,
      setSearchTerm,
    }),
    [session, loading, notes, searchTerm, displayName]
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error('useNotes must be used inside <NotesProvider>');
  return ctx;
}
