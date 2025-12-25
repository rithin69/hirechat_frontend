const API_BASE = "http://127.0.0.1:8000";

export async function loginUser({ email, password }) {
  // Send as x-www-form-urlencoded for OAuth2PasswordRequestForm
  const body = new URLSearchParams();
  body.append("username", email);
  body.append("password", password);

  const res = await fetch(`${API_BASE}/auth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body, // IMPORTANT: not JSON.stringify
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Login failed");
  }

  // { access_token, token_type }
  return res.json();
}

export async function registerUser(payload) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Registration failed");
  }

  return res.json();
}

export async function fetchCurrentUser() {
  const token = localStorage.getItem("access_token");
  if (!token) return null;

  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) return null;

  // { id, email, full_name, role, is_active }
  return res.json();
}
