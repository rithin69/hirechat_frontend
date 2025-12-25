import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";

function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login({ email, password });
    } catch (err) {
      setError("Could not sign in. Check your details and try again.");
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
          autoComplete="current-password"
          required
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

export default LoginForm;
