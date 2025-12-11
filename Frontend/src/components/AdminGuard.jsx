import React from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function AdminGuard({ children }) {
  const authed = localStorage.getItem("admin_auth") === "ok";
  const location = useLocation();

  if (!authed) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
