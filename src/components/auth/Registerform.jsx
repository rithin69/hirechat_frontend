import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";

function RegisterForm({ onRegistered }) {
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("applicant");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register({
        full_name: fullName,
        email,
        password,
        role,
      });
      setDone(true);
      if (onRegistered) {
        onRegistered({ email, role });
      }
    } catch (err) {
      setError("Could not create account. Try a different email.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-md border border-rose-700/60 bg-rose-900/40 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}

      {done && (
        <p className="rounded-md border border-emerald-700/60 bg-emerald-900/40 px-3 py-2 text-sm text-emerald-200">
          Account created. You can sign in now.
        </p>
      )}

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-200">
          Full name
        </label>
        <input
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-200">
          Role
        </label>
        <select
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="applicant">Applicant</option>
          <option value="hiring_manager">Hiring manager</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-200">
          Email
        </label>
        <input
          type="email"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-200">
          Password
        </label>
        <input
          type="password"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}

export default RegisterForm;
