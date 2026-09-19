const PROFILE_API = window.W2W_API_URL || "http://localhost:5000/api";
const profile$ = selector => document.querySelector(selector);

document.addEventListener("DOMContentLoaded", async () => {
  const userId = localStorage.getItem("w2w_guest_id") || crypto.randomUUID();
  localStorage.setItem("w2w_guest_id", userId);
  profile$("#logoutButton").addEventListener("click", () => {
    localStorage.removeItem("w2w_access_token");
    localStorage.removeItem("w2w_user_id");
    localStorage.removeItem("w2w_guest_id");
    window.location.href = "index.html";
  });
  try {
    const response = await fetch(`${PROFILE_API}/users/${encodeURIComponent(userId)}`);
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload.success) {
      profile$("#profileFullName").value = payload.data.full_name || "";
      profile$("#profileEmail").value = payload.data.email || "";
      profile$("#profilePhone").value = payload.data.phone || "";
      profile$("#profileLocation").value = payload.data.location || "";
    }
  } catch (_) {
    profile$("#profilePageMessage").textContent = "Profile could not be loaded. You can still enter your details and save.";
  }
  profile$("#profilePageForm").addEventListener("submit", saveProfile);
});

async function saveProfile(event) {
  event.preventDefault();
  const message = profile$("#profilePageMessage");
  const userId = localStorage.getItem("w2w_user_id");
  const submit = event.currentTarget.querySelector("button[type=submit]");
  submit.disabled = true;
  try {
    const response = await fetch(`${PROFILE_API}/users/${encodeURIComponent(userId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.success) throw new Error(payload.error || "Could not save your profile.");
    message.className = "success-message";
    message.textContent = "Profile saved. Taking you to your dashboard...";
    setTimeout(() => { window.location.href = "dashboard.html"; }, 600);
  } catch (error) {
    message.className = "error-message";
    message.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
}
