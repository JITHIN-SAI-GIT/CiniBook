import { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../lib/api';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('cb_token');
    if (!token) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    authApi
      .me()
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setProfile({
            id: data.userId,
            email: data.email,
            fullName: data.fullName,
            role: data.role,
          });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) localStorage.removeItem('cb_token');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setProfile(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const signUp = async (email, password, fullName) => {
    try {
      await authApi.signup(email, password, fullName);
      // Token is no longer returned here. User must verify email first.
      return { error: null };
    } catch (err) {
      const msg = err?.response?.data?.message || 'Signup failed';
      return { error: msg };
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data } = await authApi.login(email, password);

      // If we got here, but the backend returned an error structure containing EMAIL_NOT_VERIFIED
      // (though Axios usually throws for 403)
      if (data.message === 'EMAIL_NOT_VERIFIED') {
        return { error: 'EMAIL_NOT_VERIFIED' };
      }

      localStorage.setItem('cb_token', data.token);
      setProfile({
        id: data.userId,
        email: data.email,
        fullName: data.fullName,
        role: data.role,
      });
      return { error: null };
    } catch (err) {
      if (
        err?.response?.status === 403 &&
        err?.response?.data?.message === 'EMAIL_NOT_VERIFIED'
      ) {
        return { error: 'EMAIL_NOT_VERIFIED' };
      }
      const msg = err?.response?.data?.message || 'Invalid email or password';
      return { error: msg };
    }
  };

  const googleSignIn = async (token) => {
    try {
      const { data } = await authApi.googleLogin(token);
      localStorage.setItem('cb_token', data.token);
      setProfile({
        id: data.userId,
        email: data.email,
        fullName: data.fullName,
        role: data.role,
      });
      return { error: null };
    } catch (err) {
      const msg = err?.response?.data?.message || 'Google sign-in failed';
      return { error: msg };
    }
  };

  const signOut = () => {
    localStorage.removeItem('cb_token');
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        profile,
        loading,
        isAdmin: profile?.role === 'ADMIN',
        isLoggedIn: !!profile,
        signUp,
        signIn,
        googleSignIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
