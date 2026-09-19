const ADMIN_API = window.W2W_API_URL || "http://localhost:5000/api";
const providerLabels = { gemini: "Gemini", openai: "OpenAI", openrouter: "OpenRouter", claude: "Claude", supabase: "Supabase", server: "Site / server" };
let adminPassword = "";
let providerData = {};
let selectedProvider = "gemini";

const $admin = selector => document.querySelector(selector);
const fieldLabel = field => field.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());

document.addEventListener("DOMContentLoaded", () => {
  $admin("#adminLogin").addEventListener("submit", unlock);
  $admin("#providerForm").addEventListener("submit", saveProvider);
});

async function adminFetch(path, options = {}) {
  const response = await fetch(`${ADMIN_API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", "x-admin-password": adminPassword, ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) throw new Error(payload.error || "Admin request failed.");
  return payload;
}

async function unlock(event) {
  event.preventDefault();
  adminPassword = $admin("#adminPassword").value;
  try {
    const payload = await adminFetch("/admin/providers");
    providerData = payload.data || {};
    $admin("#adminLogin").hidden = true;
    $admin("#adminPanel").hidden = false;
    renderTabs();
    renderForm();
  } catch (error) {
    $admin("#adminMessage").textContent = error.message;
  }
}

function renderTabs() {
  const grid = $admin("#providerGrid");
  grid.replaceChildren(...Object.keys(providerLabels).map(provider => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `provider-tab${provider === selectedProvider ? " selected" : ""}`;
    button.textContent = providerLabels[provider];
    button.addEventListener("click", () => { selectedProvider = provider; renderTabs(); renderForm(); });
    return button;
  }));
}

function renderForm() {
  const form = $admin("#providerForm");
  form.replaceChildren();
  Object.entries(providerData[selectedProvider] || {}).forEach(([field, value]) => {
    const label = document.createElement("label");
    label.textContent = fieldLabel(field);
    const input = document.createElement("input");
    input.name = field;
    input.value = value || "";
    input.type = field.endsWith("KEY") || field === "ADMIN_PASSWORD" ? "password" : "text";
    input.placeholder = field.endsWith("KEY") ? "Paste a new key or leave the masked value unchanged" : "";
    input.autocomplete = "off";
    label.append(input);
    form.append(label);
  });
  const actions = document.createElement("div");
  actions.className = "btn-row";
  actions.innerHTML = '<button class="btn btn-primary" type="submit">Save settings</button><button class="btn btn-secondary" type="button" id="clearProvider">Clear this provider</button>';
  form.append(actions);
  $admin("#clearProvider").addEventListener("click", () => saveProvider(null, true));
}

async function saveProvider(event, clear = false) {
  event?.preventDefault();
  const body = clear ? { clear: true } : Object.fromEntries(new FormData($admin("#providerForm")));
  try {
    const payload = await adminFetch(`/admin/providers/${selectedProvider}`, { method: "PUT", body: JSON.stringify(body) });
    $admin("#adminMessage").textContent = payload.message;
    const refreshed = await adminFetch("/admin/providers");
    providerData = refreshed.data || providerData;
    renderForm();
  } catch (error) {
    $admin("#adminMessage").textContent = error.message;
  }
}
