const AUTH_API = window.W2W_API_URL || "http://localhost:5000/api";
let authMode = "login";
const auth$ = selector => document.querySelector(selector);

document.addEventListener("DOMContentLoaded", () => {
  const isSignupPage = window.location.pathname.endsWith("signup.html");
  authMode = isSignupPage ? "signup" : "login";
  auth$("loginTab")?.addEventListener("click", () => setAuthMode("login"));
  auth$("signupTab")?.addEventListener("click", () => setAuthMode("signup"));
  auth$("authForm").addEventListener("submit", submitAuth);
  auth$("resendVerification")?.addEventListener("click", resendVerification);
  if (new URLSearchParams(window.location.search).get("verified") === "1") {
    setAuthMode("login");
    showMessage("Email verified. You can now sign in.", true);
  } else {
    setAuthMode(authMode);
  }
});

function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === "signup";
  if (auth$("authTitle")) auth$("authTitle").textContent = signup ? "Create your account" : "Sign in";
  auth$("authSubmit").textContent = signup ? "Create account" : "Sign in";
  if (auth$("loginTab")) auth$("loginTab").className = `btn ${signup ? "btn-secondary" : "btn-primary"}`;
  if (auth$("signupTab")) auth$("signupTab").className = `btn ${signup ? "btn-primary" : "btn-secondary"}`;
  auth$("authPassword").autocomplete = signup ? "new-password" : "current-password";
  auth$("confirmPasswordWrap")?.toggleAttribute("hidden", !signup);
  auth$("confirmPassword")?.toggleAttribute("required", signup);
  auth$("fullNameWrap")?.toggleAttribute("hidden", !signup);
  auth$("phoneWrap")?.toggleAttribute("hidden", !signup);
  auth$("locationWrap")?.toggleAttribute("hidden", !signup);
  auth$("fullName")?.toggleAttribute("required", signup);
  auth$("phone")?.toggleAttribute("required", signup);
  auth$("location")?.toggleAttribute("required", signup);
}

async function submitAuth(event) {
  event.preventDefault();
  const submit = auth$("authSubmit");
  submit.disabled = true;
  showMessage("");
  try {
    const email = auth$("authEmail").value.trim();
    const password = auth$("authPassword").value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
    if (authMode === "signup") {
      if (password !== auth$("confirmPassword").value) throw new Error("Passwords do not match.");
      if (password.length < 8) throw new Error("Password must be at least 8 characters.");
    }
    const body = { email, password };
    if (authMode === "signup") {
      body.fullName = auth$("fullName").value.trim();
      body.phone = auth$("phone").value.trim();
      body.location = auth$("location").value.trim();
    }
    const payload = await request(`/auth/${authMode === "signup" ? "signup" : "login"}`, body);
    if (payload.data?.session?.access_token) {
      localStorage.setItem("w2w_access_token", payload.data.session.access_token);
      localStorage.setItem("w2w_user_id", payload.data.user.id);
      const metadata = payload.data.user.user_metadata || {};
      if (authMode === "signup" || metadata.full_name) {
        await saveProfile(payload.data.user.id, {
          fullName: body.fullName || metadata.full_name,
          email,
          phone: body.phone || metadata.phone,
          location: body.location || metadata.location
        });
      }
      window.location.href = authMode === "signup" ? "profile.html" : "dashboard.html";
      return;
    }
    if (authMode === "signup") {
      showMessage(payload.message || "Account created. Check your email to verify it.", true);
    }
    const verificationEmail = encodeURIComponent(auth$("authEmail").value.trim());
    window.location.href = `verify.html?email=${verificationEmail}`;
  } catch (error) {
    showMessage(error.message);
    if (/verify|confirm/i.test(error.message)) auth$("resendVerification")?.removeAttribute("hidden");
  } finally {
    submit.disabled = false;
  }
}

async function saveProfile(userId, body) {
  await request(`/users/${encodeURIComponent(userId)}`, {
    fullName: body.fullName,
    email: body.email,
    phone: body.phone,
    location: body.location
  }, true, "PUT");
}

async function resendVerification() {
  const email = auth$("authEmail").value.trim();
  if (!email) { showMessage("Enter your email address first."); return; }
  try {
    const payload = await request("/auth/resend-verification", { email });
    showMessage(payload.message, true);
  } catch (error) {
    showMessage(error.message);
  }
}

async function request(path, body, authenticated = false, method = "POST") {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem("w2w_access_token");
  if (authenticated && token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${AUTH_API}${path}`, { method, headers, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.success) throw new Error(payload.error || "Authentication request failed.");
  return payload;
}

function showMessage(message, success = false) {
  const node = auth$("authMessage");
  if (!node) return;
  node.className = success ? "success-message" : "error-message";
  node.textContent = message || "";
}
