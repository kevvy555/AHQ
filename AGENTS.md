# AHQ — Repository Agent Instructions

## Purpose and scope

This repository contains the **Advanced HeroQuest Furniture Archive**, a static GitHub Pages catalogue of medieval-fantasy furniture and dungeon props. The furniture imagery is primarily intended to become source material for **3D asset generation**, so visual consistency, clear geometry and accurate object details matter more than decorative illustration.

These instructions apply to agents working anywhere in this repository. For image-generation tasks, follow the workflow below **before** changing any catalogue data or publishing artwork.

## Source of truth

- **`data/furniture.json` is canonical.** Do not invent furniture records or override their descriptions to suit an image.
- Each furniture record has a permanent, unique `id`, `name`, `description`, `categoryId`, `imagePrompt`, `baseImagePrompt`, `IsImageGenerated` and `image`.
- Resolve `baseImagePrompt` as a **key** in the root `baseImagePrompts` dictionary. The value is the shared art direction, not an image filename.
- Generate from **both** the resolved shared base prompt and the furniture-specific `imagePrompt`; use the record's `description` to cross-check intent.
- Preserve existing IDs, categories, prompts and unrelated records. Do not rewrite shared prompts or silently change the requested furniture's contents.
- Treat `IsImageGenerated` as a publication-state flag: it must remain `false` until an image is **approved, saved and referenced** in the published catalogue.

## Standard model asset hierarchy

The website's `categories` tree in `data/furniture.json` determines every model directory. Create **one directory per permanent asset ID**, nested under the exact category **IDs**, not their display names.

```text
assets/furniture/
  storage/
    bookcases/
      AHQ-FUR-001/
        images/
          primary.png              # approved image used by the website
          candidates/              # optional unapproved review images
          alternate-01.png         # optional retained alternative
        models/                    # 3D outputs, GLB / OBJ / etc.
        textures/                  # texture maps and materials
        source/                    # editable or intermediate project files
  tables/
    dining-tables/
      AHQ-FUR-015/
        images/
```

**Rules:**
- Derive the directory as `assets/furniture/<category-id-path>/<ASSET-ID>/`; for example `assets/furniture/storage/bookcases/AHQ-FUR-001/`.
- Each of the initial 40 models has an `images/.gitkeep` marker to make its empty folder visible in Git. Other subfolders are created only when there are files to store in them.
- The ID is stable even if an item's display name changes. Never organise by name or by the JSON array index.
- Keep **all** assets for an item in its model directory: published/reference images under `images/`, generated 3D files under `models/`, maps under `textures/`, and editable files under `source/`.
- Use `images/primary.png` as the canonical approved website image. Store other variants in `images/` and review candidates in `images/candidates/`, but do not refer to an unapproved candidate in the JSON.
- The JSON `image` must be a repository-relative path into that **same asset ID's own `images/` directory**. A pending model has `image: null`.
- Do not put new assets in the obsolete shared `assets/images/` directory.
- When moving a model to a different category, migrate its entire folder and JSON image path together.
- If adding a new model, create its category-mirrored model directory with `images/.gitkeep` in the same change.
- The browser's `safeImagePath` check and `scripts/validate-catalog.mjs` enforce the new paths. Update both together if the schema ever changes.

## Workflow for each furniture asset

### 1. Inspect and prepare

1. Read this file, `README.md` and `data/furniture.json`.
2. Look up the exact requested asset **by ID**, not by array position.
3. Read the full shared base prompt, specific prompt and description.
4. Look for an approved image from the same base-prompt family. The existing image at `assets/furniture/storage/bookcases/AHQ-FUR-001/images/primary.png` can be used as the initial style anchor for `dungeon-furniture-v1` after the user confirms its visual style is approved, when the generator supports image references.
5. Check whether an image, existing review candidates or an in-progress change already exists before generating anything.
6. Confirm an actual image-generation capability is available in the execution environment. A GitHub checkout alone does **not** provide one. If no generator is available, report that limitation rather than fabricating artwork.

### 2. Construct the generation input

Build the effective prompt in this order:

1. The exact text of the referenced `baseImagePrompts[baseImagePrompt]`.
2. The furniture item's exact `imagePrompt`.
3. Only the minimum supplementary camera, image-format and 3D-readability constraints from this file, when not already present.

If the shared and item-specific prompts conflict, highlight the conflict for review rather than quietly discarding requested detail. **Do not edit the JSON prompts just to make generation work.**

### 3. Maintain a consistent image language

Unless an approved base prompt explicitly says otherwise, use these defaults:

| Aspect | Default |
| --- | --- |
| Subject | Exactly one complete, standalone furniture object |
| View | Three-quarter view showing front and right side |
| Camera | Orthographic or very weak perspective, slightly elevated (around 15–20°) |
| Lighting | Soft, neutral upper-left illumination; subdued shadows |
| Canvas | Tight but uncropped object, centred, approximately 10% clear margin |
| Background | Prefer genuinely transparent RGBA; otherwise a clean, neutral background, disclosed at review |
| Resolution | Target at least 1024 pixels on the shorter dimension, subject to generator limits |
| Master format | Lossless PNG |
| Materials | Credible medieval construction, weathered wood, aged iron, restrained brass and other prompt-specified materials |
| Finish | Cohesive, stylised, hand-painted game-asset concept suitable for 3D reconstruction |

Keep silhouette, framing, shadow direction, texture scale and rendering style comparable between related objects. Fit portrait-oriented items like bookcases into portrait canvases where practical; do not distort the furniture just to force uniform dimensions.

Do **not** include dungeon rooms, floor tiles, scene backgrounds, people, captions, lettering, watermarks or extraneous props. Objects requested by the item's own prompt (for example, books on a bookcase) are **not** extraneous and must not be omitted without approval.

### 4. Verify 3D suitability

Review each candidate at full size and at thumbnail size. Reject or rework candidates that have:

- Missing, duplicated, disconnected or implausibly merged structural elements.
- Incorrect shelf, leg, drawer, door or support counts relative to the prompt.
- Impossible load-bearing structures, warped symmetry or inconsistent geometry.
- Important surfaces concealed by decoration or an excessively dramatic camera angle.
- Cropped edges, strong perspective distortion, messy outlines or excessive tiny details.
- Background artefacts, false transparency, unwanted text, scenery or multiple unrelated objects.
- A visual style that differs noticeably from the approved style reference.

Visible furnishings should remain physically understandable for a 3D modelling system. If the requested decoration compromises geometry, **raise that trade-off in the review**; do not unilaterally change the catalogue definition.

### 5. Review first — publish second

- Generate **exactly one image per requested asset** unless the user explicitly requests more. For the **first asset** (`AHQ-FUR-001`, Narrow Bookcase), generate just one image to establish the visual baseline; do not generate additional furniture.
- Store the review image temporarily as `<MODEL-DIR>/images/candidates/candidate-01.png` if a repository path is needed, but **do not update `data/furniture.json` during review**. A locally generated image can be presented directly without committing it.
- Present the actual image for review and briefly report any visual or geometry limitations. Do not claim it is approved or final.
- **Wait for explicit human approval before publishing the image as the final asset.** A successful generation is not automatically approval.
- After approval, save the approved master to `<MODEL-DIR>/images/primary.png` (example: `assets/furniture/storage/bookcases/AHQ-FUR-001/images/primary.png`). Do not overwrite an approved file without permission.
- Update **only** the corresponding JSON record:
  - `"image": "<MODEL-DIR>/images/primary.png"`
  - `"IsImageGenerated": true`
- Discard rejected candidates rather than committing them to the published catalogue. If the user explicitly requests a commit of an unapproved candidate, keep it under `<MODEL-DIR>/images/candidates/` and leave the JSON unchanged.
- Do **not** create a branch or pull request unless the user explicitly asks for one. Work on the already checked-out branch; when the user requests a direct commit/push, use `main` only if that is the selected branch.
- An approved first image becomes the **style anchor** for the rest of its base-prompt family. Do not change that family's art direction silently; propose a new prompt ID (for example, `dungeon-furniture-v2`) for a deliberate style change.

## Image files and data integrity

- Keep published artwork in the category-mirrored model directory under `assets/furniture/`, using `images/primary.png` for the approved website preview.
- Use PNG masters with real image data. Do not substitute SVG mock-ups, text placeholders or images taken from the web and claim they are generated.
- Only reference a file that actually exists, can be decoded and is correctly matched to the record.
- If claiming transparency, check that the file has an alpha channel **and meaningful transparent pixels**. An RGBA file with an opaque background is not a transparent image.
- Do not convert a poor image into a supposedly approved asset simply to satisfy a filename convention.
- Keep any optional future 3D model files distinct from source artwork.

## Validation and delivery

After publishing an approved image:

1. Run `node scripts/validate-catalog.mjs`.
2. Check that the PNG loads, the dimensions are reasonable, and alpha/transparency claims are accurate.
3. Check that the catalogue displays the image for the intended asset and that other records are unchanged.
4. Do not create branches or pull requests by default. Commit/push to the checked-out branch only when requested; this repository's normal publishing branch is `main`.
5. Report the asset ID/name, generator used, candidate/final path, approval state, actual validation results and commit link (if committed).

**Never claim that an image was generated, reviewed, approved, published or tested unless that step actually occurred.** If image-generation tools, file creation, image inspection or a GitHub push are unavailable, explicitly state what remains blocked.

## First-image special rule

For **`AHQ-FUR-001` — Narrow Bookcase**, an image is already referenced in the catalogue. Do not regenerate, overwrite or change the furniture prompt without explicit request. Its prompt includes three shelves, a closed lower plinth, leather-bound books and carved uprights. Confirm that the image is an approved visual style anchor before using it for other models. Continue generating only one image per requested model and follow the existing human-review gate.
