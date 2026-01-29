import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function RequireAuth() {
  const { token, ready } = useAuth();
  if (!ready) return null;
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }
  return <Outlet />;
}
