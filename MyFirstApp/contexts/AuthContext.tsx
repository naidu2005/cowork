import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthContext: Initializing...');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('AuthContext: getSession result:', session);
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
      console.log('AuthContext: Loading set to false after getSession.');
    }).catch(error => {
      console.error('AuthContext: Error getting session:', error);
      setLoading(false); // Ensure loading is false even on error
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('AuthContext: onAuthStateChange event:', _event, session);
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
      console.log('AuthContext: Loading set to false after onAuthStateChange.');
    });

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
        console.log('AuthContext: Auth listener unsubscribed.');
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
