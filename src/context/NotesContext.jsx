import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import supabase from '../lib/supabaseClient.js';

const NotesContext = createContext(null);

// Map DB → UI
function mapRow(row) {
  return {
    id: row.id,
    text: row.content ?? '',
    createdAt: row.created_at ? Date.parse(row.created_at) : null,
    updatedAt: row.updated_at ? Date.parse(row.updated_at) : null,
    position: typeof row.position === 'number' ? row.position : null,
  };
}

// Evenly space positions: 0, 1024, 2048, ...
function spacedPosition(index, step = 1024) {
  return index * step;
}

export function NotesProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // ---------- AUTH ----------
  async function signUp(email, password, firstName = '', lastName = '') {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // options: { emailRedirectTo: window.location.origin },
      options: { data: { first_name: firstName, last_name: lastName } }
    });
    if (error) throw error;

    // add to profiles
    const uid = data.session?.user?.id ?? data.user?.id;
    if (uid) {
      await supabase.from('profiles').upsert({
        id: uid, first_name: firstName, last_name: lastName
      });
    }
    return data; // may be null session if confirmation is required
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

    const { user } = session;
    const first = user.user_metadata?.first_name ?? '';
    const last = user.user_metadata?.last_name ?? '';

    await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          first_name: first || undefined,
          last_name: last || undefined,
        },
        { onConflict: 'id' }
      )
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
      // Sort by manual order first, then by updated_at just in case
      .order('position', { ascending: true, nullsFirst: true })
      .order('updated_at', { ascending: false });
    if (error) throw error;
    setNotes((data ?? []).map(mapRow));
  }

  // Make a new top position by taking current smallest position and subtracting 1
  function makeTopPosition(existing) {
    if (existing.length === 0) return 0;
    const first = [...existing].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0];
    const topPos = typeof first.position === 'number' ? first.position : 0;
    return topPos - 1;
  }

  async function addNote(text) {
    const trimmed = (text ?? '').trim();
    if (!trimmed) return;

    // compute desired position at top
    const newPos = makeTopPosition(notes);

    // optimistic insert
    const optimistic = {
      id: `tmp-${crypto.randomUUID?.() ?? Date.now()}`,
      text: trimmed,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      position: newPos,
    };
    setNotes(prev => [optimistic, ...prev]);

    const { data, error } = await supabase
      .from('notes')
      .insert({ content: trimmed, position: newPos }) // trigger fills user_id via RLS default
      .select()
      .single();

    if (error) {
      // rollback optimistic
      setNotes(prev => prev.filter(n => n.id !== optimistic.id));
      throw error;
    }

    const mapped = mapRow(data);
    setNotes(prev => [mapped, ...prev.filter(n => n.id !== optimistic.id)]);
  }

  async function updateNote(id, patch) {
    const toUpdate = {};
    if (typeof patch.text === 'string') toUpdate.content = patch.text;

    if (Object.keys(toUpdate).length === 0) return;

    // optimistic
    const optimisticNow = Date.now();
    setNotes(prev =>
      prev.map(n => (n.id === id ? { ...n, text: toUpdate.content ?? n.text, updatedAt: optimisticNow } : n))
    );

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

    // optimistic
    const prevSnapshot = notes;
    setNotes(prev => prev.filter(n => n.id !== id));

    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) {
      // rollback
      setNotes(prevSnapshot);
      throw error;
    }
  }

  // Compact positions to evenly spaced values when gaps get too small
  async function reindexPositions(current) {
    // current is expected sorted by position asc
    const updated = current.map((n, i) => ({ id: n.id, position: spacedPosition(i) }));

    // optimistic
    setNotes(prev =>
      prev
        .slice()
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((n, i) => ({ ...n, position: spacedPosition(i) }))
    );

    // batch upsert (only id/position)
    const { error } = await supabase.from('notes').upsert(updated, { onConflict: 'id' });
    if (error) throw error;
  }

  /**
   * Reorder by moving note `startId` so it appears immediately BEFORE note `overId`.
   * Uses fractional positioning: set start.position = (prev.position + over.position) / 2.
   * If the gap is too small, we reindex to restore healthy spacing.
   */
async function reorderNotes(startId, overId) {
  if (!startId || !overId || startId === overId) return;

  // Work on a position-sorted copy
  const list = [...notes].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const startIdx = list.findIndex(n => n.id === startId);
  const overIdx  = list.findIndex(n => n.id === overId);
  if (startIdx === -1 || overIdx === -1) return;

  const start = list[startIdx];

  // Remove the dragged note for neighbor calculations
  const listWithout = list.filter(n => n.id !== startId);

  // Where is the hovered note in the list-without-start?
  const overIdxWithout = listWithout.findIndex(n => n.id === overId);

  // If we dragged downward (start was above over), insert AFTER hovered;
  // if we dragged upward, insert BEFORE hovered.
  const insertIdx = startIdx < overIdx ? overIdxWithout + 1 : overIdxWithout;

  // Find neighbors at the target slot
  const prevNeighbor = listWithout[insertIdx - 1] ?? null;
  const nextNeighbor = listWithout[insertIdx] ?? null;

  let newPos;
  if (!prevNeighbor) {
    // move to very top
    const smallest = listWithout[0]?.position ?? 0;
    newPos = smallest - 1;
  } else if (!nextNeighbor) {
    // move to very bottom
    const largest = listWithout[listWithout.length - 1]?.position ?? 0;
    newPos = largest + 1;
  } else {
    // sit between neighbors
    const a = prevNeighbor.position ?? 0;
    const b = nextNeighbor.position ?? 0;
    newPos = (a + b) / 2;
  }

  // Optimistic local state
  const optimistic = [
    ...listWithout.slice(0, insertIdx),
    { ...start, position: newPos },
    ...listWithout.slice(insertIdx),
  ];
  setNotes(optimistic);

  // If gap is microscopic, reindex after saving
  const tooTight = Number.isFinite(newPos)
    ? Math.abs((nextNeighbor?.position ?? newPos) - (prevNeighbor?.position ?? newPos)) < 1e-6
    : true;

  try {
    const { error } = await supabase
      .from('notes')
      .update({ position: newPos })
      .eq('id', startId);
    if (error) throw error;

    if (tooTight) {
      const freshSorted = optimistic.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      await reindexPositions(freshSorted);
    }
  } catch (e) {
    await refreshNotes(); // rollback to server truth on failure
    throw e;
  }
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
            setNotes(prev => {
              const next = [mapRow(payload.new), ...prev];
              // Keep list roughly ordered if server inserts with position
              return next.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
            });
          } else if (payload.eventType === 'UPDATE') {
            setNotes(prev =>
              prev
                .map(n => (n.id === payload.new.id ? mapRow(payload.new) : n))
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            );
          } else if (payload.eventType === 'DELETE') {
            setNotes(prev => prev.filter(n => n.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session]);

  async function setDisplayName(firstName = '', lastName = '') {
    // update metadata
    const { data, error } = await supabase.auth.updateUser({
      data: { first_name: firstName, last_name: lastName }
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
    const { data: s } = await supabase.auth.getSession();
    setSession(s.session ?? null);
  }

  const displayName = useMemo(() => {
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
      reorderNotes,      // <-- expose for drag-n-drop

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
