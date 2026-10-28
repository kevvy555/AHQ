import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogFile = path.join(root, "data", "furniture.json");
const errors = [];
const fail = (message) => errors.push(message);
const requiredText = (value) => typeof value === "string" && value.trim().length > 0;

let catalog;
try {
  catalog = JSON.parse(fs.readFileSync(catalogFile, "utf8"));
} catch (error) {
  console.error("Cannot read furniture.json:", error.message);
  process.exit(1);
}

if (catalog.catalogVersion !== 1) fail("catalogVersion must be 1");
if (!Array.isArray(catalog.categories)) fail("categories must be an array");
if (!Array.isArray(catalog.items)) fail("items must be an array");
if (!catalog.baseImagePrompts || typeof catalog.baseImagePrompts !== "object" || Array.isArray(catalog.baseImagePrompts)) {
  fail("baseImagePrompts must be an object");
}

const categoryIds = new Set();
function collectCategories(categories) {
  for (const category of categories) {
    if (!requiredText(category.id) || !requiredText(category.name)) {
      fail("Each category needs a nonempty id and name");
      continue;
    }
    if (categoryIds.has(category.id)) fail("Duplicate category ID: " + category.id);
    categoryIds.add(category.id);
    if (category.children) {
      if (!Array.isArray(category.children)) fail("children of " + category.id + " must be an array");
      else collectCategories(category.children);
    }
  }
}
if (Array.isArray(catalog.categories)) collectCategories(catalog.categories);

const prompts = catalog.baseImagePrompts || {};
for (const [promptId, prompt] of Object.entries(prompts)) {
  if (!requiredText(promptId) || !requiredText(prompt)) fail("Empty base image prompt: " + promptId);
}

const categoryPaths = new Map();
function indexPaths(categories, ancestry = []) {
  for (const category of categories) {
    const pathIds = [...ancestry, category.id];
    categoryPaths.set(category.id, pathIds);
    if (Array.isArray(category.children)) indexPaths(category.children, pathIds);
  }
}
if (Array.isArray(catalog.categories)) indexPaths(catalog.categories);

const itemIds = new Set();
for (const item of Array.isArray(catalog.items) ? catalog.items : []) {
  if (!requiredText(item.id) || !requiredText(item.name)) fail("An item has no valid ID/name");
  if (itemIds.has(item.id)) fail("Duplicate item ID: " + item.id);
  itemIds.add(item.id);
  if (!categoryIds.has(item.categoryId)) fail(item.id + ": unknown category " + item.categoryId);
  if (typeof item.IsImageGenerated !== "boolean") fail(item.id + ": IsImageGenerated must be a boolean");
  if (!requiredText(item.description)) fail(item.id + ": missing description");
  if (!requiredText(item.imagePrompt)) fail(item.id + ": missing imagePrompt");
  if (!requiredText(item.baseImagePrompt) || !Object.hasOwn(prompts, item.baseImagePrompt)) {
    fail(item.id + ": unknown baseImagePrompt ID " + item.baseImagePrompt);
  }
  if (!Object.hasOwn(item, "image")) fail(item.id + ": missing image field (use null until an image exists)");
  const categoryTrail = categoryPaths.get(item.categoryId);
  if (!categoryTrail) continue;
  const modelDir = "assets/furniture/" + categoryTrail.join("/") + "/" + item.id;
  if (!fs.existsSync(path.join(root, modelDir, "images"))) {
    fail(item.id + ": missing model image directory: " + modelDir + "/images");
  }
  if (item.IsImageGenerated && !item.image) {
    fail(item.id + ": generated flag requires an image file");
  }
  if (item.image !== null && item.image !== undefined) {
    const prefix = modelDir + "/images/";
    const filename = typeof item.image === "string" && item.image.startsWith(prefix)
      ? item.image.slice(prefix.length) : "";
    const valid = /^[a-z0-9][a-z0-9_-]*\.(?:png|jpe?g|webp|avif)$/i.test(filename);
    if (!valid) fail(item.id + ": image must be inside its own model images folder: " + prefix);
    else if (!fs.existsSync(path.join(root, item.image))) fail(item.id + ": image file does not exist: " + item.image);
  }
}

if (errors.length) {
  console.error("Furniture catalogue validation failed:");
  errors.forEach((error) => console.error(" - " + error));
  process.exit(1);
}
console.log("Furniture catalogue valid: " + itemIds.size + " items, " + categoryIds.size +
  " categories, " + Object.keys(prompts).length + " shared base prompts.");
