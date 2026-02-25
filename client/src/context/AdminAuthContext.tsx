import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { adminApi } from '../api/adminClient';

interface Admin {
  id: string;
  username: string;
  email: string | null;
}

interface AdminAuthContextType {
  admin: Admin | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Vérifier si une session admin cookie est active au démarrage
    adminApi.getMe()
      .then((data: Admin) => setAdmin(data))
      .catch(() => { /* pas de session active */ })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const data = await adminApi.login(username, password);
    setAdmin(data.admin);
  };

  const logout = async () => {
    await adminApi.logout().catch(() => { /* ignorer les erreurs réseau */ });
    setAdmin(null);
  };

  return (
    <AdminAuthContext.Provider value={{ admin, login, logout, isLoading }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
}
