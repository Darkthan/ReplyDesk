import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../api/client';

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, serverId?: string) => Promise<void>;
  register: (email: string, password: string, serverId?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier si une session cookie est active au démarrage
    api.me()
      .then((data) => setUser({ id: data.id, email: data.email, role: data.role }))
      .catch(() => { /* pas de session active, normal */ })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string, serverId?: string) => {
    const result = await api.login(email, password, serverId);
    setUser(result.user);
  };

  const register = async (email: string, password: string, serverId?: string) => {
    const result = await api.register(email, password, serverId);
    setUser(result.user);
  };

  const logout = async () => {
    await api.logout().catch(() => { /* ignorer les erreurs réseau */ });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
