/* Waste2Worth â€” progressive enhancement for the static pages. */
const API_URL = window.W2W_API_URL || "http://localhost:5000/api";

document.addEventListener("DOMContentLoaded", () => {
  initNavToggle();
  initUploadPage();
  initResultPage();
  initMarketplacePage();
  initServicesPage();
  initDashboardPage();
  initProfilePage();
  initUpcyclePage();
});

function initNavToggle() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (!toggle || !links) return;
  toggle.setAttribute("aria-expanded", "false");
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  links.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      links.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

function setState(root, message, type = "loading") {
  root.replaceChildren();
  const state = document.createElement("div");
  state.className = `state state-${type}`;
  state.setAttribute("role", type === "error" ? "alert" : "status");
  if (type === "loading") {
    const spinner = document.createElement("span");
    spinner.className = "spinner";
    spinner.setAttribute("aria-hidden", "true");
    state.append(spinner);
  }
  const text = document.createElement("p");
  text.textContent = message;
  state.append(text);
  root.append(state);
}

function text(value, fallback = "") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function explainError(error) {
  if (error?.code === "AI_UNAVAILABLE") {
    return "AI analysis is unavailable right now. You can still edit the item and material manually.";
  }
  if (error?.code === "STORAGE_UNAVAILABLE") {
    return "Image storage is unavailable. Check the Supabase waste-images bucket.";
  }
  if (error?.code === "REQUEST_INVALID") {
    return error.message || "Please check the information you entered.";
  }
  if (error?.code === "SERVER_UNAVAILABLE") {
    return "The backend is running but could not complete this request. Check its terminal for details.";
  }
  if (error?.code === "NETWORK_UNAVAILABLE") {
    return "Cannot reach the backend. Start Backend with npm start and try again.";
  }
  if (error?.name === "TypeError") {
    return "Cannot reach the backend. Start Backend with npm start and try again.";
  }
  return error?.message || "Something went wrong. Check the backend terminal for details.";
}

function el(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

/* Upload */
function initUploadPage() {
  const input = document.getElementById("wasteImage");
  const preview = document.getElementById("previewImg");
  const button = document.getElementById("analyzeBtn");
  const busy = document.getElementById("analyzingState");
  const error = document.getElementById("uploadError");
  const fileDetails = document.getElementById("fileDetails");
  if (!button) return;
  input?.addEventListener("change", () => {
    const file = input.files?.[0];
    error.textContent = "";
    if (!file) {
      if (fileDetails) fileDetails.textContent = "No file selected";
      preview.hidden = true;
      return;
    }
    if (!file.type.startsWith("image/")) {
      input.value = "";
      error.textContent = "Please choose an image file.";
      if (fileDetails) fileDetails.textContent = "No valid image selected";
      preview.hidden = true;
      return;
    }
    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
    preview.setAttribute("aria-label", `Preview of ${file.name}`);
    document.querySelector(".drop-zone-icon")?.setAttribute("hidden", "");
    document.querySelector(".drop-zone > p strong")?.replaceChildren(document.createTextNode("Image ready to analyze"));
    if (fileDetails) fileDetails.textContent = `${file.name} Â· ${formatFileSize(file.size)}`;
  });
  button.addEventListener("click", async () => {
    const file = input?.files?.[0];
    if (!file) { error.textContent = "Choose an image before starting the analysis."; return; }
    error.textContent = "";
    button.disabled = true;
    busy.hidden = false;
    try {
      const response = await fetch(`${API_URL}/analyze`, { method: "POST", body: (() => {
        const form = new FormData(); form.append("image", file);
        return form;
      })() });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error || "The image could not be analyzed.");
      sessionStorage.setItem("w2w_result", JSON.stringify(payload.data));
      window.location.href = "result.html";
    } catch (err) {
      error.textContent = explainError(err);
      button.disabled = false;
      busy.hidden = true;
    }

    function formatFileSize(bytes) {
      if (!Number.isFinite(bytes) || bytes < 1024) return `${bytes || 0} B`;
      if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  });
}

/* Result */
function initResultPage() {
  const root = document.getElementById("resultRoot");
  if (!root) return;
  let result;
  try { result = JSON.parse(sessionStorage.getItem("w2w_result") || "null"); } catch (_) { result = null; }
  if (!result) {
    root.replaceChildren();
    const head = el("div", "section-head");
    head.append(el("h1", null, "No analysis found"), el("p", "lede", "Upload an item to receive a recommendation."), el("a", "btn btn-primary", "Upload an item"));
    head.lastChild.href = "upload.html"; root.append(head); return;
  }
  const fields = [["resultItem", result.item], ["resultCondition", result.condition], ["resultValue", result.estimatedValue], ["resultMaterial", result.material]];
  fields.forEach(([id, value]) => { const node = document.getElementById(id); if (node) node.textContent = text(value, "Not provided"); });
  const confidence = document.getElementById("resultConfidence");
  if (confidence && Number.isFinite(Number(result.confidence))) {
    confidence.textContent = `Identification confidence: ${Math.round(Number(result.confidence) * 100)}%`;
  }
  if (result.analysisStatus === "manual-review" && confidence) {
    confidence.textContent = "AI temporarily unavailable â€” edit the item and material below to continue.";
  }
  const editForm = document.getElementById("resultEditForm");
  const editItem = document.getElementById("editItem");
  const editMaterial = document.getElementById("editMaterial");
  const editMessage = document.getElementById("resultEditMessage");
  editItem.value = text(result.item);
  editMaterial.value = text(result.material, "Unknown") === "Unknown" ? "" : text(result.material);
  editForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = editForm.querySelector("button[type=submit]");
    const item = editItem.value.trim();
    const material = editMaterial.value.trim();
    if (!item || !material) {
      editMessage.textContent = "Enter both an item name and material.";
      return;
    }
    submit.disabled = true;
    editMessage.textContent = "Saving corrections\u2026";
    result.item = item;
    result.material = material;
    sessionStorage.setItem("w2w_result", JSON.stringify(result));
    document.getElementById("resultItem").textContent = item;
    document.getElementById("resultMaterial").textContent = material;
    try {
      if (result.id) {
        await apiFetch(`/analyze/${encodeURIComponent(result.id)}`, {
          method: "PATCH",
          body: JSON.stringify({ item, material })
        });
      }
      editMessage.textContent = "Corrections saved.";
    } catch (error) {
      editMessage.textContent = `Saved for this session, but database update failed: ${error.message}`;
    } finally {
      submit.disabled = false;
    }
  });
  const explanation = document.getElementById("resultExplanation");
  if (explanation) explanation.textContent = text(result.explanation, "No additional explanation was provided.");
  const image = document.getElementById("resultImage");
  if (image) { image.hidden = !result.imageUrl; if (result.imageUrl) image.src = result.imageUrl; }
  const actions = document.getElementById("resultActions");
  actions?.replaceChildren(...(Array.isArray(result.recommendation) ? result.recommendation : []).map(action => el("span", "action-chip", action)));
}

function makeCard(title, details, description, href, cta, imageUrl = "") {
  const article = el("article", "item-card");
  const thumb = el("div", "thumb", details);
  if (imageUrl) {
    thumb.style.backgroundImage = `linear-gradient(150deg, rgba(26, 61, 43, .18), rgba(26, 61, 43, .72)), url("${imageUrl}")`;
    thumb.style.backgroundSize = "cover";
    thumb.style.backgroundPosition = "center";
    thumb.setAttribute("role", "img");
    thumb.setAttribute("aria-label", `${title} image`);
  }
  article.append(thumb, (() => {
    const body = el("div", "body");
    body.append(el("h3", "mt-0", title), el("p", "meta", details), el("p", null, description));
    if (href) { const link = el("a", "btn btn-secondary cta", cta); link.href = href; if (href.startsWith("tel:")) link.setAttribute("aria-label", `${cta}: ${title}`); body.append(link); }
    return body;
  })());
  return article;
}

/* Marketplace */
function initMarketplacePage() {
  const grid = document.getElementById("marketplaceGrid");
  if (!grid) return;
  const form = document.getElementById("listingForm"), message = document.getElementById("listingMessage");
  const buttons = document.querySelectorAll(".filter-btn[data-category]");
  async function render(category = "All") {
    setState(grid, "Loading listingsâ€¦");
    try {
      const payload = await apiFetch(`/marketplace${category === "All" ? "" : `?category=${encodeURIComponent(category)}`}`);
      const items = Array.isArray(payload.data) ? payload.data : [];
      if (!items.length) { setState(grid, "No active listings found for this category.", "empty"); return; }
      grid.replaceChildren(...items.map(item => {
        const price = item.price === null || item.price === undefined ? "" : ` Â· â‚¹${Number(item.price).toLocaleString("en-IN")}`;
        const details = `${text(item.category, "Other")}${price}${item.condition ? ` Â· ${item.condition}` : ""}${item.location ? ` Â· ${item.location}` : ""}`;
        return makeCard(text(item.title, "Untitled listing"), details, text(item.description, "No description provided."), item.contact_phone ? `tel:${item.contact_phone}` : "", "Contact seller", item.image_url || "");
      }));
    } catch (err) { setState(grid, explainError(err), "error"); }
  }
  buttons.forEach(btn => btn.addEventListener("click", () => { buttons.forEach(b => b.classList.remove("selected")); btn.classList.add("selected"); render(btn.dataset.category); }));
  form?.addEventListener("submit", async event => {
    event.preventDefault(); const submit = form.querySelector("button[type=submit]"); submit.disabled = true; message.textContent = "";
    try { const payload = await apiFetch("/marketplace", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form))) }); message.textContent = payload.message || "Listing published."; form.reset(); render(); }
    catch (err) { message.textContent = explainError(err); message.className = "error-message"; }
    finally { submit.disabled = false; }
  });
  render();
}

/* Services */
function initServicesPage() {
  const grid = document.getElementById("servicesGrid");
  if (!grid) return;
  const locationInput = document.getElementById("serviceLocation"), buttons = document.querySelectorAll(".filter-btn[data-type]");
  async function render(type = "All") {
    setState(grid, "Loading servicesâ€¦");
    const params = new URLSearchParams(); if (type !== "All") params.set("type", type); if (locationInput?.value.trim()) params.set("location", locationInput.value.trim());
    try {
      const payload = await apiFetch(`/services${params.toString() ? `?${params}` : ""}`), items = Array.isArray(payload.data) ? payload.data : [];
      if (!items.length) { setState(grid, "No services found. Try another type or location.", "empty"); return; }
      grid.replaceChildren(...items.map(item => {
        const rating = item.rating ? ` Â· â˜… ${item.rating}` : "";
        const details = `${text(item.type, "Service")}${rating}${item.location ? ` Â· ${item.location}` : ""}`;
        const typeImages = {
          Repair: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80",
          Recycler: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=900&q=80",
          Upcycler: "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=900&q=80",
          Donation: "https://images.unsplash.com/photo-1593113646773-028c64a8f1b8?auto=format&fit=crop&w=900&q=80",
          Reseller: "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=900&q=80"
        };
        return makeCard(text(item.name, "Unnamed provider"), details, text(item.description, "Contact this provider for details."), item.contact_phone ? `tel:${item.contact_phone}` : "", "Contact", item.image_url || typeImages[item.type] || typeImages.Recycler);
      }));
    } catch (err) { setState(grid, explainError(err), "error"); }
  }
  buttons.forEach(btn => btn.addEventListener("click", () => { buttons.forEach(b => b.classList.remove("selected")); btn.classList.add("selected"); render(btn.dataset.type); }));
  locationInput?.addEventListener("change", () => render(document.querySelector(".filter-btn[data-type].selected")?.dataset.type || "All")); render();
}

/* Dashboard */
function initDashboardPage() {
  const statsRoot = document.getElementById("impactStats");
  if (!statsRoot) return;
  const form = document.getElementById("dashboardUserForm"), input = document.getElementById("dashboardUserId"), message = document.getElementById("dashboardMessage"), body = document.getElementById("activityBody");
  async function load(userId) {
    setState(statsRoot, "Loading dashboardâ€¦"); body.replaceChildren();
    try {
      const [statsPayload, activityPayload] = await Promise.all([apiFetch(`/dashboard/stats/${encodeURIComponent(userId)}`), apiFetch(`/dashboard/activity/${encodeURIComponent(userId)}`)]);
      const stats = statsPayload.data || {};
      const values = [[text(stats.wasteDivertedKg, "0") + " kg", "Waste diverted"], ["â‚¹" + Number(stats.valueRecovered || 0).toLocaleString("en-IN"), "Value recovered"], [text(stats.itemsReused, "0"), "Items given a second life"], [text(stats.landfillAvoidedKg, "0") + " kg", "Landfill waste avoided"]];
      statsRoot.replaceChildren(...values.map(([value, label]) => { const card = el("div", "impact-stat"); card.append(el("div", "num", value), el("div", "label", label)); return card; }));
      const rows = Array.isArray(activityPayload.data) ? activityPayload.data : [];
      if (!rows.length) { const row = el("tr"); const cell = el("td", null, "No activity recorded yet."); cell.colSpan = 3; row.append(cell); body.append(row); }
      else rows.forEach(item => { const row = el("tr"); row.append(el("td", null, text(item.item, "â€”")), el("td", null, text(item.action, "â€”"))); const status = el("td"); status.append(el("span", "status-pill", text(item.status, "Unknown"))); row.append(status); body.append(row); });
    } catch (err) { setState(statsRoot, explainError(err), "error"); }
  }

  function initProfilePage() {
    const form = document.getElementById("profileForm");
    if (!form) return;
    const userId = getOrCreateUserId();
    const message = document.getElementById("profileMessage");
    const fields = {
      fullName: document.getElementById("profileFullName"),
      email: document.getElementById("profileEmail"),
      phone: document.getElementById("profilePhone"),
      location: document.getElementById("profileLocation")
    };
    apiFetch(`/users/${encodeURIComponent(userId)}`)
      .then(payload => Object.entries(fields).forEach(([key, input]) => {
        if (input) input.value = text(payload.data?.[key === "fullName" ? "full_name" : key]);
      }))
      .catch(error => { if (error.code !== "USER_NOT_FOUND") message.textContent = explainError(error); });
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const submit = form.querySelector("button[type=submit]");
      submit.disabled = true;
      try {
        const payload = await apiFetch(`/users/${encodeURIComponent(userId)}`, {
          method: "PUT",
          body: JSON.stringify(Object.fromEntries(new FormData(form)))
        });
        message.className = "success-message";
        message.textContent = payload.message || "Profile saved.";
        localStorage.setItem("w2w_user_id", userId);
      } catch (error) {
        message.className = "error-message";
        message.textContent = explainError(error);
      } finally {
        submit.disabled = false;
      }
    });
  }

  function getOrCreateUserId() {
    let id = localStorage.getItem("w2w_user_id");
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem("w2w_user_id", id);
    }
    return id;
  }
  form?.addEventListener("submit", event => { event.preventDefault(); const id = input.value.trim(); if (!id) return; localStorage.setItem("w2w_user_id", id); message.textContent = ""; load(id); });
  const saved = getOrCreateUserId();
  input.value = saved;
  load(saved);
}

/* Upcycling */
function initUpcyclePage() {
  const grid = document.getElementById("upcycleGrid"), form = document.getElementById("upcycleForm"), message = document.getElementById("upcycleMessage");
  if (!grid || !form) return;
  const search = document.getElementById("upcycleSearch");
  const difficulty = document.getElementById("upcycleDifficulty");
  const sort = document.getElementById("upcycleSort");
  const count = document.getElementById("upcycleCount");
  const clear = document.getElementById("clearUpcycleSettings");
  const imageForm = document.getElementById("upcycleImageForm");
  const imageInput = document.getElementById("upcycleImage");
  const imageName = document.getElementById("upcycleImageName");
  const imagePreview = document.getElementById("upcycleImagePreview");
  const detected = document.getElementById("upcycleDetected");
  const detectedItems = document.getElementById("upcycleDetectedItems");
  const maxImageBytes = 10 * 1024 * 1024;
  let ideas = [];
  let itemName = "";

  function renderIdeas() {
    const query = search?.value.trim().toLowerCase() || "";
    const level = difficulty?.value || "";
    const filtered = ideas
      .filter(idea => (!level || idea.difficulty === level))
      .filter(idea => !query || `${idea.title} ${idea.purpose} ${(idea.materials || []).join(" ")}`.toLowerCase().includes(query))
      .sort((a, b) => {
        if (sort?.value === "title") return a.title.localeCompare(b.title);
        if (sort?.value === "difficulty") return ["Easy", "Medium", "Advanced"].indexOf(a.difficulty) - ["Easy", "Medium", "Advanced"].indexOf(b.difficulty);
        if (sort?.value === "time") return parseMinutes(a.time) - parseMinutes(b.time);
        return 0;
      });
    if (count) count.textContent = `${filtered.length} of ${ideas.length} idea${ideas.length === 1 ? "" : "s"} shown`;
    if (!filtered.length) {
      setState(grid, ideas.length ? "No ideas match these settings." : "Generate ideas to see practical next steps.", "empty");
      return;
    }
    grid.replaceChildren(...filtered.map(renderIdeaCard));
  }

  function renderIdeaCard(idea) {
    const article = el("article", "item-card upcycle-card");
    const body = el("div", "body");
    body.append(el("h3", "mt-0", text(idea.title, "Untitled idea")));
    body.append(el("p", "meta", `${text(idea.difficulty, "Easy")} Â· ${text(idea.time, "Time varies")} Â· For ${itemName}`));
    body.append(el("p", null, text(idea.purpose, "A possible next life for your item.")));
    if (Array.isArray(idea.materials) && idea.materials.length) body.append(el("p", "meta", `Materials: ${idea.materials.join(", ")}`));
    if (Array.isArray(idea.steps) && idea.steps.length) {
      const list = document.createElement("ol");
      idea.steps.slice(0, 3).forEach(step => list.append(el("li", null, step)));
      body.append(list);
    }
    if (idea.scope) body.append(el("p", "meta", `${idea.scope === "combined" ? "Combined project" : "Individual project"}${idea.items?.length ? ` Â· Uses: ${idea.items.join(", ")}` : ""}`));
    const links = document.createElement("div");
    links.className = "upcycle-links";
    const searchTerms = encodeURIComponent(`${idea.title} ${itemName} upcycling tutorial`);
    [["Search web", `https://www.google.com/search?q=${searchTerms}`], ["Watch ideas", `https://www.youtube.com/results?search_query=${searchTerms}`], ["Browse projects", `https://www.pinterest.com/search/pins/?q=${searchTerms}`]].forEach(([label, href]) => {
      const link = el("a", "btn btn-secondary", label);
      link.href = href; link.target = "_blank"; link.rel = "noopener noreferrer"; links.append(link);
    });
    body.append(links);
    article.append(el("div", "thumb", "â™»"), body);
    return article;
  }

  function parseMinutes(value) {
    const match = String(value || "").match(/\d+/);
    return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
  }

  [search, difficulty, sort].forEach(control => control?.addEventListener("input", renderIdeas));
  [difficulty, sort].forEach(control => control?.addEventListener("change", renderIdeas));
  clear?.addEventListener("click", () => { if (search) search.value = ""; if (difficulty) difficulty.value = ""; if (sort) sort.value = "relevance"; renderIdeas(); });
  form.addEventListener("submit", async event => {
    event.preventDefault(); const submit = form.querySelector("button[type=submit]"); submit.disabled = true; message.textContent = ""; setState(grid, "Generating ideasâ€¦");
    try {
      const payload = await apiFetch("/upcycle/generate", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      const data = payload.data || {};
      ideas = Array.isArray(data.ideas) ? data.ideas : [];
      itemName = text(data.itemName, "your item");
      message.textContent = data.provider ? `Ideas generated using ${data.provider}.` : "Ideas generated.";
      renderIdeas();
    } catch (err) { setState(grid, explainError(err), "error"); message.textContent = explainError(err); }
    finally { submit.disabled = false; }
  });
  async function scanImage(file) {
    const submit = imageForm.querySelector("button[type=submit]");
    submit.disabled = true;
    message.textContent = "";
    setState(grid, "Scanning the image and generating project ideasâ€¦");
    imageName.textContent = `Scanning: ${file.name}`;
    try {
      const body = new FormData(); body.append("image", file);
      const response = await fetch(`${API_URL}/upcycle/generate-from-image`, { method: "POST", body });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.error || "The image could not be processed.");
      const data = payload.data || {};
      const items = Array.isArray(data.items) ? data.items : [];
      if (detected) detected.hidden = false;
      if (detectedItems) detectedItems.textContent = items.length ? items.map(item => `${item.name} (${item.material})`).join(" Â· ") : "No distinct items were detected.";
      ideas = Array.isArray(data.ideas) ? data.ideas : [];
      itemName = items.map(item => item.name).join(", ") || "the detected items";
      renderIdeas();
      imageName.textContent = `Selected: ${file.name} · Scan complete`;
      message.textContent = data.provider ? `Detected items and generated ideas using ${data.provider}.` : "Detected items and generated ideas.";
    } catch (err) {
      setState(grid, explainError(err), "error");
      message.textContent = explainError(err);
      imageName.textContent = `Selected: ${file.name} Â· Scan failed`;
    } finally {
      submit.disabled = false;
    }
  }
  imageInput?.addEventListener("change", () => {
    const file = imageInput.files?.[0];
    if (!file) {
      imageName.textContent = "No image selected";
      imagePreview?.setAttribute("hidden", "");
      return;
    }
    if (!file.type.startsWith("image/")) {
      imageInput.value = "";
      imageName.textContent = "Please select an image file.";
      return;
    }
    if (file.size > maxImageBytes) {
      imageInput.value = "";
      imageName.textContent = "That image is too large. Choose an image under 10 MB.";
      return;
    }
    imageName.textContent = `Selected: ${file.name} Â· Preparing scanâ€¦`;
    if (imagePreview) {
      imagePreview.src = URL.createObjectURL(file);
      imagePreview.removeAttribute("hidden");
    }
    scanImage(file);
  });
  imageForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const file = imageInput?.files?.[0];
    if (!file) {
      message.textContent = "Choose an image first.";
      imageName.textContent = "No image selected";
      return;
    }
    await scanImage(file);
  });
  renderIdeas();
}

async function apiFetch(path, options = {}) {
  let response;
  const accessToken = localStorage.getItem("w2w_access_token");
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(options.headers || {})
      }
    });
  } catch (error) {
    error.code = "NETWORK_UNAVAILABLE";
    throw error;
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    const error = new Error(payload.error || "The request failed.");
    error.code = payload.code || (response.status >= 500 ? "SERVER_UNAVAILABLE" : "REQUEST_INVALID");
    throw error;
  }
  return payload;
}
