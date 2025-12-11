import React, { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import "./Admin.css";

export default function AdminMainQuestion() {
  const location = useLocation();
  const [adminKey, setAdminKey] = useState(() => {
    return location.state?.adminKey || localStorage.getItem("adminKey") || "";
  });
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clue, setClue] = useState("");
  const [tags, setTags] = useState("");
  const [compulsory, setCompulsory] = useState(false);
  const [active, setActive] = useState(true);
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    localStorage.setItem("adminKey", adminKey);
  }, [adminKey]);

  const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("");
    setIsSubmitting(true);

    try {
      const payload = {
        code: code.trim(),
        title: title.trim(),
        description,
        clue,
        compulsory,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        active,
      };

      const res = await fetch(`${baseUrl}/api/admin/main-questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to save main question");
      }

      setStatus("Saved! New main question created.");
      setCode("");
      setTitle("");
      setDescription("");
      setClue("");
      setTags("");
      setCompulsory(false);
      setActive(true);
    } catch (err) {
      setStatus(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-shell">
      <div className="admin-card">
        <div className="admin-header">
          <div>
            <p className="muted small"><Link to="/admin">← Back to Admin Home</Link></p>
            <h1>Add Main Question</h1>
          </div>
          <label className="field compact">
            <span>Admin Key</span>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Enter ADMIN_TOKEN"
            />
          </label>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Code *</span>
            <input value={code} onChange={(e) => setCode(e.target.value)} required />
          </label>

          <label className="field">
            <span>Title *</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>

          <label className="field">
            <span>Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </label>

          <label className="field">
            <span>Clue</span>
            <textarea value={clue} onChange={(e) => setClue(e.target.value)} rows={2} />
          </label>

          <label className="field">
            <span>Tags (comma separated)</span>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="math, logic, qr" />
          </label>

          <div className="field inline">
            <label>
              <input type="checkbox" checked={compulsory} onChange={(e) => setCompulsory(e.target.checked)} /> Compulsory
            </label>
            <label>
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active
            </label>
          </div>

          <button type="submit" className="btn primary" disabled={isSubmitting || !adminKey}>
            {isSubmitting ? "Saving..." : "Save Main Question"}
          </button>
        </form>

        {status && <div className="status">{status}</div>}
      </div>
    </div>
  );
}
