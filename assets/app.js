const byId = (id) => document.getElementById(id);

let catalogue = null;
let selectedId = null;
let activeFilter = "all";
let searchText = "";
let visibleItems = [];
let toastTimer = null;
const collapsed = new Set();
const categoryPaths = new Map();

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function indexCategories(categories, trail = []) {
  for (const category of categories) {
    if (categoryPaths.has(category.id)) throw new Error("Duplicate category ID: " + category.id);
    const path = [...trail, category];
    categoryPaths.set(category.id, path);
    if (category.children) indexCategories(category.children, path);
  }
}

function validateCatalogue(data) {
  if (!data || !Array.isArray(data.categories) || !Array.isArray(data.items) ||
      !data.baseImagePrompts || typeof data.baseImagePrompts !== "object") {
    throw new Error("The furniture JSON is missing required collections.");
  }
  categoryPaths.clear();
  indexCategories(data.categories);
  const seen = new Set();
  for (const item of data.items) {
    if (!item.id || !item.name || typeof item.description !== "string" ||
        typeof item.imagePrompt !== "string" || typeof item.IsImageGenerated !== "boolean" ||
        typeof item.baseImagePrompt !== "string" || !categoryPaths.has(item.categoryId) ||
        !Object.hasOwn(data.baseImagePrompts, item.baseImagePrompt)) {
      throw new Error("Invalid furniture entry: " + (item.id || "unknown"));
    }
    if (seen.has(item.id)) throw new Error("Duplicate furniture ID: " + item.id);
    seen.add(item.id);
    if (item.image !== null && item.image !== undefined && !safeImagePath(item.image)) {
      throw new Error("Invalid image path on " + item.id);
    }
  }
}

function safeImagePath(value) {
  return typeof value === "string" &&
    /^assets\/images\/[a-z0-9][a-z0-9_./-]*\.(?:png|jpe?g|webp|avif)$/i.test(value) &&
    !value.split("/").includes("..");
}

function filteredItems() {
  return catalogue.items.filter((item) => {
    if (activeFilter === "pending" && item.IsImageGenerated) return false;
    if (activeFilter === "generated" && !item.IsImageGenerated) return false;
    if (!searchText) return true;
    const categoryNames = categoryPaths.get(item.categoryId).map((part) => part.name).join(" ");
    return [item.id, item.name, item.description, categoryNames]
      .some((value) => value.toLocaleLowerCase().includes(searchText));
  });
}

function categoryMatches(categoryId) {
  return visibleItems.filter((item) => categoryPaths.get(item.categoryId)
    .some((part) => part.id === categoryId));
}

function setMobileMenu(open) {
  byId("sidebar").classList.toggle("open", open);
  byId("menuToggle").setAttribute("aria-expanded", String(open));
}

function navigateTo(itemId, updateUrl = true) {
  selectedId = itemId;
  if (updateUrl && itemId) {
    const newHash = "#" + encodeURIComponent(itemId);
    if (location.hash !== newHash) history.replaceState(null, "", newHash);
  }
  render();
  setMobileMenu(false);
}

function syncSelection() {
  visibleItems = filteredItems();
  if (visibleItems.length && !visibleItems.some((item) => item.id === selectedId)) {
    selectedId = visibleItems[0].id;
    history.replaceState(null, "", "#" + encodeURIComponent(selectedId));
  }
  render();
}

function makeTreeButton(label, count, open, className, onClick) {
  const button = element("button", className);
  button.type = "button";
  button.setAttribute("aria-expanded", String(open));
  button.append(
    element("span", "tree-caret" + (open ? "" : " closed"), "▾"),
    element("span", "", label),
    element("span", "tree-count", String(count))
  );
  button.addEventListener("click", onClick);
  return button;
}

function renderTree() {
  const tree = byId("categoryTree");
  tree.replaceChildren();
  const searching = Boolean(searchText);
  for (const group of catalogue.categories) {
    const itemsInGroup = categoryMatches(group.id);
    if (!itemsInGroup.length) continue;
    const groupElement = element("div", "tree-group");
    const groupOpen = searching || !collapsed.has(group.id);
    groupElement.appendChild(makeTreeButton(group.name, itemsInGroup.length, groupOpen, "tree-group-button", () => {
      if (collapsed.has(group.id)) collapsed.delete(group.id);
      else collapsed.add(group.id);
      renderTree();
    }));
    if (groupOpen) {
      const groupChildren = element("div", "tree-sub");
      for (const subcategory of group.children || []) {
        const subItems = categoryMatches(subcategory.id);
        if (!subItems.length) continue;
        const subOpen = searching || !collapsed.has(subcategory.id);
        groupChildren.appendChild(makeTreeButton(subcategory.name, subItems.length, subOpen, "tree-sub-button", () => {
          if (collapsed.has(subcategory.id)) collapsed.delete(subcategory.id);
          else collapsed.add(subcategory.id);
          renderTree();
        }));
        if (subOpen) {
          const itemList = element("div", "tree-items");
          for (const item of subItems) {
            const button = element("button", "tree-item" + (item.id === selectedId ? " selected" : ""));
            button.type = "button";
            if (item.id === selectedId) button.setAttribute("aria-current", "true");
            button.append(element("span", "", item.name), element("span", "state-dot" + (item.IsImageGenerated ? " ready" : "")));
            button.title = item.id;
            button.addEventListener("click", () => navigateTo(item.id));
            itemList.appendChild(button);
          }
          groupChildren.appendChild(itemList);
        }
      }
      groupElement.appendChild(groupChildren);
    }
    tree.appendChild(groupElement);
  }
  if (!tree.childElementCount) tree.appendChild(element("p", "tree-no-results", "No matching entries."));
  byId("visibleCount").textContent = String(visibleItems.length);
}

function metaRow(label, value, format = "text") {
  const row = element("div", "meta-row");
  row.appendChild(element("dt", "", label));
  const definition = element("dd");
  if (format === "code") {
    definition.appendChild(element("code", "", value));
  } else if (format === "status") {
    definition.appendChild(element("span", "meta-chip" + (value ? " yes" : ""), value ? "TRUE — generated" : "FALSE — pending"));
  } else {
    definition.textContent = value;
  }
  row.appendChild(definition);
  return row;
}

function placeholder(item) {
  const wrapper = element("div", "placeholder");
  wrapper.append(
    element("div", "placeholder-symbol", "◇"),
    element("div", "placeholder-caption", "FURNITURE CONCEPT"),
    element("div", "placeholder-title", item.name),
    element("p", "placeholder-hint", "Artwork not yet available")
  );
  return wrapper;
}

function renderArtwork(item) {
  const stage = byId("artStage");
  stage.replaceChildren();
  for (const corner of ["tl", "tr", "bl", "br"]) {
    stage.appendChild(element("span", "corner " + corner));
  }
  const image = item.image;
  if (image) {
    const picture = element("img");
    picture.src = new URL(image, document.baseURI).href;
    picture.alt = "Generated concept image of " + item.name;
    picture.loading = "eager";
    picture.decoding = "async";
    picture.addEventListener("error", () => {
      picture.replaceWith(placeholder(item));
      byId("previewLabel").textContent = "IMAGE FILE MISSING";
      byId("previewCaption").textContent = "The image path is set, but the file could not be loaded.";
    }, {once:true});
    stage.appendChild(picture);
  } else {
    stage.appendChild(placeholder(item));
  }
  byId("previewLabel").textContent = image ? "IMAGE ON FILE" : "CONCEPT PENDING";
  byId("previewCaption").textContent = image
    ? "Visual reference for this furniture asset."
    : "A visual will appear here once generated and added to the archive.";
}

function renderDetails() {
  const item = visibleItems.find((entry) => entry.id === selectedId);
  const empty = !item;
  byId("emptyState").hidden = !empty;
  byId("assetContent").hidden = empty;
  byId("entryPosition").textContent = empty ? "0 / 0" : (visibleItems.indexOf(item) + 1) + " / " + visibleItems.length;
  byId("previousButton").disabled = empty || visibleItems.indexOf(item) === 0;
  byId("nextButton").disabled = empty || visibleItems.indexOf(item) === visibleItems.length - 1;
  if (empty) {
    byId("breadcrumbs").textContent = "ARCHIVE / FURNITURE";
    return;
  }

  const path = categoryPaths.get(item.categoryId);
  const baseText = catalogue.baseImagePrompts[item.baseImagePrompt];
  const breadcrumb = byId("breadcrumbs");
  breadcrumb.replaceChildren(document.createTextNode("ARCHIVE / " + path.map((category) => category.name).join(" / ") + " / "));
  breadcrumb.appendChild(element("strong", "", item.name));
  byId("assetName").textContent = item.name;
  byId("assetCategory").textContent = path[path.length - 1].name.toUpperCase();
  byId("assetSubtitle").textContent = item.description;
  const badge = byId("statusBadge");
  badge.textContent = item.IsImageGenerated ? "Image generated" : "Awaiting artwork";
  badge.className = "status-badge " + (item.IsImageGenerated ? "generated" : "pending");

  renderArtwork(item);
  const metadata = byId("metadata");
  metadata.replaceChildren(
    metaRow("Name", item.name),
    metaRow("Asset ID", item.id, "code"),
    metaRow("Category", path.map((category) => category.name).join(" / ")),
    metaRow("IsImageGenerated", item.IsImageGenerated, "status"),
    metaRow("Description", item.description),
    metaRow("Image file", item.image || "Not yet assigned", item.image ? "code" : "text")
  );
  byId("basePromptId").textContent = item.baseImagePrompt;
  byId("basePromptText").textContent = baseText;
  byId("imagePromptText").textContent = item.imagePrompt;
}

function render() {
  renderTree();
  renderDetails();
}

function showToast(message) {
  const toast = byId("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}

async function copyText(text) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied to clipboard");
  } catch {
    showToast("Clipboard unavailable in this browser.");
  }
}

function selectedItem() {
  return catalogue.items.find((item) => item.id === selectedId);
}

function selectedPrompt() {
  const item = selectedItem();
  if (!item) return null;
  return {
    base: catalogue.baseImagePrompts[item.baseImagePrompt],
    image: item.imagePrompt
  };
}

function moveSelection(delta) {
  const index = visibleItems.findIndex((item) => item.id === selectedId);
  const next = visibleItems[index + delta];
  if (next) navigateTo(next.id);
}

function readHashId() {
  try {
    return decodeURIComponent(location.hash.slice(1));
  } catch {
    return "";
  }
}

function bindEvents() {
  byId("searchInput").addEventListener("input", (event) => {
    searchText = event.target.value.trim().toLocaleLowerCase();
    syncSelection();
  });

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((candidate) => {
        const active = candidate === button;
        candidate.classList.toggle("active", active);
        candidate.setAttribute("aria-pressed", String(active));
      });
      syncSelection();
    });
  });

  byId("previousButton").addEventListener("click", () => moveSelection(-1));
  byId("nextButton").addEventListener("click", () => moveSelection(1));
  byId("copyBasePrompt").addEventListener("click", () => copyText(selectedPrompt()?.base));
  byId("copyImagePrompt").addEventListener("click", () => copyText(selectedPrompt()?.image));
  byId("copyFullPrompt").addEventListener("click", () => {
    const prompts = selectedPrompt();
    if (prompts) copyText(prompts.base + "\n\n" + prompts.image);
  });
  byId("resetFilters").addEventListener("click", () => {
    activeFilter = "all";
    byId("searchInput").value = "";
    searchText = "";
    document.querySelector('[data-filter="all"]').click();
  });
  byId("menuToggle").addEventListener("click", () => {
    setMobileMenu(!byId("sidebar").classList.contains("open"));
  });
  document.addEventListener("click", (event) => {
    if (byId("sidebar").classList.contains("open") &&
        !byId("sidebar").contains(event.target) &&
        !byId("menuToggle").contains(event.target)) {
      setMobileMenu(false);
    }
  });
  window.addEventListener("hashchange", () => {
    const targetId = readHashId();
    if (!catalogue.items.some((item) => item.id === targetId)) return;
    if (!visibleItems.some((item) => item.id === targetId)) {
      byId("searchInput").value = "";
      searchText = "";
      activeFilter = "all";
      document.querySelectorAll("[data-filter]").forEach((button) => {
        const active = button.dataset.filter === "all";
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      visibleItems = filteredItems();
    }
    navigateTo(targetId, false);
  });
}

async function start() {
  try {
    const response = await fetch(new URL("../data/furniture.json", import.meta.url));
    if (!response.ok) throw new Error("Could not load furniture.json (HTTP " + response.status + ").");
    catalogue = await response.json();
    validateCatalogue(catalogue);
    byId("totalCount").textContent = String(catalogue.items.length);
    byId("artCount").textContent = String(catalogue.items.filter((item) => item.IsImageGenerated && item.image).length);
    visibleItems = filteredItems();
    const requestedId = readHashId();
    selectedId = catalogue.items.some((item) => item.id === requestedId)
      ? requestedId : (visibleItems[0]?.id || null);
    bindEvents();
    render();
  } catch (error) {
    byId("assetContent").hidden = true;
    byId("errorState").hidden = false;
    byId("errorState").textContent = "The catalogue could not be loaded. " + error.message +
      " Make sure you are viewing it via a web server or GitHub Pages, not a file:// URL.";
    console.error(error);
  }
}

start();
