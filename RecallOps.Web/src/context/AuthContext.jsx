import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Map Supabase User object into RecallOps profile metadata for UI display
  const mapSupabaseUser = (sbUser) => {
    if (!sbUser) return null;
    const email = sbUser.email || '';
    const metadataName = sbUser.user_metadata?.full_name || sbUser.user_metadata?.name;
    const name = metadataName || (email.includes('@') ? email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Incident Responder');

    return {
      id: sbUser.id,
      name,
      email,
      role: 'Site Reliability Engineer',
      badge: 'Supabase Verified',
      initials: (name.slice(0, 2) || 'SR').toUpperCase(),
      color: '#3b82f6',
      user_metadata: sbUser.user_metadata,
      app_metadata: sbUser.app_metadata,
      raw: sbUser,
    };
  };

  useEffect(() => {
    let isMounted = true;

    // 7. Persist the authenticated session - Read stored session on boot
    supabase.auth.getSession()
      .then(({ data: { session: initialSession }, error }) => {
        if (error) {
          console.error('Supabase getSession error:', error.message);
        }
        if (isMounted) {
          setSession(initialSession);
          setUser(initialSession?.user ? mapSupabaseUser(initialSession.user) : null);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Supabase session initialization error:', err);
        if (isMounted) {
          setLoading(false);
        }
      });

    // 6. Listen for auth state changes using onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ? mapSupabaseUser(currentSession.user) : null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // 3. Signup must call: supabase.auth.signUp({ email, password })
  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    if (data?.session) {
      setSession(data.session);
      setUser(mapSupabaseUser(data.user));
    }

    return data;
  };

  // 4. Login must call: supabase.auth.signInWithPassword({ email, password })
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    if (data?.session) {
      setSession(data.session);
      setUser(mapSupabaseUser(data.user));
    }

    return data;
  };

  // 5. Logout must call: supabase.auth.signOut()
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Supabase signOut error:', error.message);
      throw error;
    }
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        isAuthenticated: !!session && !!user,
        signUp,
        login,
        logout,
        // Compatibility aliases for existing components
        loginWithCredentials: login,
        signUpWithCredentials: signUp,
        supabase,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
