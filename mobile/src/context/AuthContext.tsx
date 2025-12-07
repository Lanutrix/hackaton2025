import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { checkAuth, isAuthenticated, setTokens, clearTokens, type UserResponse, type Token } from "../api";

interface AuthContextType {
  user: UserResponse | null;
  loading: boolean;
  login: (token: Token) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Verify auth on mount
  useEffect(() => {
    const verifyAuth = async () => {
      if (!isAuthenticated()) {
        setLoading(false);
        return;
      }

      try {
        const userData = await checkAuth();
        setUser(userData);
      } catch {
        clearTokens();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, []);

  // Login handler - saves tokens and fetches user
  const login = useCallback(async (token: Token) => {
    setTokens(token.access_token, token.refresh_token);
    try {
      const userData = await checkAuth();
      setUser(userData);
    } catch {
      clearTokens();
      throw new Error("Failed to fetch user data");
    }
  }, []);

  // Logout handler
  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

