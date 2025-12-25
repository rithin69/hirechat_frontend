import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  loginUser,
  registerUser,
  fetchCurrentUser,
} from "../api/authApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initialised, setInitialised] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setInitialised(true);
      return;
    }

    (async () => {
      const me = await fetchCurrentUser();
      if (me) {
        localStorage.setItem("auth_user", JSON.stringify(me));
        setUser(me);
      } else {
        localStorage.removeItem("access_token");
        localStorage.removeItem("auth_user");
        setUser(null);
      }
      setInitialised(true);
    })();
  }, []);

  const login = async ({ email, password }) => {
    const tokenData = await loginUser({ email, password });
    localStorage.setItem("access_token", tokenData.access_token);

    const me = await fetchCurrentUser();
    if (!me) {
      throw new Error("Failed to load user profile");
    }

    localStorage.setItem("auth_user", JSON.stringify(me));
    setUser(me);
    return me;
  };

  const register = async (payload) => {
    const created = await registerUser(payload);
    return created;
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("auth_user");
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      initialised,
      login,
      register,
      logout,
    }),
    [user, initialised]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used inside AuthProvider");
  }
  return ctx;
}
