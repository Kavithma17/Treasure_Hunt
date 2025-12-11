import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Admin.css";

export default function AdminHome() {
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem("adminKey") || "");

  useEffect(() => {
    localStorage.setItem("adminKey", adminKey);
  }, [adminKey]);

  return (
    <div className="admin-shell">
      <div className="admin-card">
        <h1>Admin Panel</h1>
        <p className="muted">Manage main questions and sub questions.</p>

        <label className="field">
          <span>Admin Key (sent as x-admin-key)</span>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="Enter ADMIN_TOKEN"
          />
        </label>

        <p className="muted small">Stored locally in your browser for convenience.</p>

        <div className="admin-actions">
          <Link to="/admin/main" state={{ adminKey }} className="btn primary">Add Main Question</Link>
          <Link to="/admin/sub" state={{ adminKey }} className="btn secondary">Add Sub Question</Link>
        </div>

        <div className="admin-note">
          <strong>Reminder:</strong> Set <code>ADMIN_TOKEN</code> in <code>Backend/.env</code> and restart the server.
        </div>
      </div>
    </div>
  );
}
