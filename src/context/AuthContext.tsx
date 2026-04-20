import { createContext, useContext, useState, type ReactNode } from 'react';

type UserRole = 'Admin' | 'Officer';

type AuthContextType = {
  isAuthenticated: boolean;
  userRole: UserRole | null;
  login: (email: string, password: string, role: UserRole) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  function login(email: string, password: string, role: UserRole) {
    if (!email || !password) return;
    setIsAuthenticated(true);
    setUserRole(role);
  }

  function logout() {
    setIsAuthenticated(false);
    setUserRole(null);
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, userRole, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
