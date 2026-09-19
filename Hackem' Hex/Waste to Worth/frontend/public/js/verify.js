const VERIFY_API = window.W2W_API_URL || "http://localhost:5000/api";
const params = new URLSearchParams(window.location.search);
const email = params.get("email") || "";
const emailNode = document.getElementById("verifyEmail");
const messageNode = document.getElementById("verifyMessage");
const verified = params.get("verified") === "1";
emailNode.textContent = email ? `Verification email sent to ${email}` : verified ? "Your email link was opened." : "Verification email sent.";

function decodeUserId(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(atob(payload).split("").map(char => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`).join(""));
    return JSON.parse(json).sub || "";
  } catch (_) {
    return "";
  }
}

function completeVerification() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = hash.get("access_token");
  if (!accessToken) {
    if (verified) {
      messageNode.className = "success-message";
      messageNode.textContent = "Email verified. Sign in to continue.";
      document.getElementById("verifyInstructions").textContent = "Your email is verified. Use the button below to open Waste2Worth.";
    }
    return;
  }
  const userId = decodeUserId(accessToken);
  if (!userId) {
    messageNode.className = "error-message";
    messageNode.textContent = "Your email was verified, but the session could not be started. Please sign in.";
    return;
  }
  localStorage.setItem("w2w_access_token", accessToken);
  localStorage.setItem("w2w_user_id", userId);
  messageNode.className = "success-message";
  messageNode.textContent = "Email verified. Redirecting you to Waste2Worth...";
  document.getElementById("resendButton").hidden = true;
  document.getElementById("signInLink").hidden = true;
  document.getElementById("verifyInstructions").textContent = "Your account is ready.";
  window.setTimeout(() => { window.location.href = "dashboard.html"; }, 900);
}

completeVerification();

document.getElementById("resendButton").addEventListener("click", async event => {
  if (!email) {
    messageNode.textContent = "Return to create account and enter your email address first.";
    return;
  }
  event.currentTarget.disabled = true;
  try {
    const response = await fetch(`${VERIFY_API}/auth/resend-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.success) throw new Error(payload.error || "Could not resend verification email.");
    messageNode.className = "success-message";
    messageNode.textContent = payload.message;
  } catch (error) {
    messageNode.className = "error-message";
    messageNode.textContent = error.message;
  } finally {
    event.currentTarget.disabled = false;
  }
});
