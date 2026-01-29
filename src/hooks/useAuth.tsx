import { useState, useEffect } from "react";

const TOKEN_KEY = "pg_admin_token";
const EMAIL_KEY = "pg_admin_email";

export function useAuth() {
  const [token, setTokenState] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    const savedEmail = localStorage.getItem(EMAIL_KEY);
    if (saved) setTokenState(saved);
    if (savedEmail) setEmail(savedEmail);
    setReady(true);
  }, []);

  const setToken = (value: string, userEmail: string) => {
    setTokenState(value);
    setEmail(userEmail);
    localStorage.setItem(TOKEN_KEY, value);
    localStorage.setItem(EMAIL_KEY, userEmail);
  };

  const clear = () => {
    setTokenState(null);
    setEmail(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
  };

  return { token, email, setToken, clear, ready };
}
