import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./api.js";
import { closeSocket } from "./socket.js";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("token")) return setLoading(false);
    api
      .me()
      .then((d) => setUser(d.user))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  const handleAuth = useCallback((data) => {
    localStorage.setItem("token", data.token);
    setUser(data.user);
  }, []);

  const login = async (form) => handleAuth(await api.login(form));
  const register = async (form) => handleAuth(await api.register(form));
  const logout = () => {
    closeSocket();
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
