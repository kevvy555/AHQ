# Advanced HeroQuest — Furniture Archive

A dependency-free, static furniture catalogue for the Advanced HeroQuest game project. Browse a category tree on the left, then view a furniture image (or its name when artwork is absent), metadata and copyable image-generation prompts on the right.

**Repository:** https://github.com/kevvy555/AHQ

**GitHub Pages URL after enabling Pages:** https://kevvy555.github.io/AHQ/

## Publish on GitHub Pages

The site is already in the root of the `main` branch and requires **no build step**.

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select **main** and **/(root)**, then save.
4. Once GitHub finishes deploying, open https://kevvy555.github.io/AHQ/.

Pages is not automatically activated by committing files. The repository owner needs to perform the one-time setting above, unless it is already configured.

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure |
| `assets/styles.css` | Responsive dark-fantasy design |
| `assets/app.js` | Reads JSON and renders tree, search, image, details and prompts |
| `data/furniture.json` | **The entire editable furniture catalogue** |
| `scripts/validate-catalog.mjs` | Validates IDs, categories, prompts and image references |
| `.github/workflows/validate-catalog.yml` | Runs the validator when changes are pushed or proposed |

There are **40 starter entries** across storage, tables, seating, sleeping, lighting, utility and arcane furniture. Items with no published image have `IsImageGenerated: false` and `image: null`.

## Asset folders

Every one of the **40 current models** has its own `images/` directory within a category-mirrored tree under `assets/furniture/`. Folder paths use category **IDs** from `data/furniture.json` and permanent furniture IDs:

```text
assets/furniture/
  storage/
    bookcases/
      AHQ-FUR-001/
        images/
          primary.png            # approved published image
          candidates/            # optional review images
          alternate-01.png       # optional extra image
        models/                  # 3D files named after the furniture item
        textures/                # texture maps, create when needed
        source/                  # editables / intermediates, create when needed
      AHQ-FUR-002/
        images/.gitkeep          # pending asset
  tables/
    dining-tables/
      AHQ-FUR-015/
        images/.gitkeep
```

The image and GLB directories are tracked with `images/.gitkeep` and `models/.gitkeep`; source/texture folders are created when populated. Each model may have many files, but `image` in JSON selects the **one primary image** rendered by the website. When adding a new asset or moving it to a category, maintain both its directory path and JSON reference. See `AGENTS.md` for all image-generation rules.

## Edit or add a piece of furniture

Edit `data/furniture.json` in GitHub or a code editor. Each model has the following fields:

```json
{
  "id": "AHQ-FUR-001",
  "name": "Narrow Bookcase",
  "categoryId": "bookcases",
  "IsImageGenerated": false,
  "description": "A compact, upright shelf unit for tight corridors or small studies.",
  "imagePrompt": "A narrow dark oak bookcase with three shelves...",
  "baseImagePrompt": "dungeon-furniture-v1",
  "image": null,
  "model": null
}
```

- **id:** Permanent unique model/image record identifier. Do not reuse or change existing IDs.
- **name:** Displayed in the category tree and above the image.
- **categoryId:** A leaf category ID from `categories` in the same JSON file.
- **IsImageGenerated:** Boolean indicating whether the image-generation stage has been completed.
- **description:** What the furniture is for, shown in the details panel.
- **imagePrompt:** Details specific to this one object.
- **baseImagePrompt:** Identifier of a shared prompt in `baseImagePrompts`. The page resolves the ID into its full text. This keeps the entire set visually coherent without repeating lengthy prompts on every record.
- **image:** The path to the published PNG/JPG/WebP/AVIF inside this asset's category-mirrored `images/` directory, or `null` when no image exists.
- **model:** The optional path to an approved GLB file in this asset's `models/` directory, or `null` until one is available. This is independent of `IsImageGenerated`.

When the generated image is approved, save it inside the asset's own folder (for example, `assets/furniture/storage/bookcases/AHQ-FUR-001/images/primary.png`), then update the entry:

```json
"IsImageGenerated": true,
"image": "assets/furniture/storage/bookcases/AHQ-FUR-001/images/primary.png"
```

If `image` is `null` (or fails to load), the catalogue displays the **model name instead of an image**, even if the generation flag is true.

### Reusable prompts and visual consistency

The JSON includes a `baseImagePrompts` object with named art directions. Every model links to one using `baseImagePrompt`. You can change an entire furniture set by editing its base prompt once, or introduce a new named base prompt for a different style or set.

The **Copy combined prompt** control assembles the full shared art direction followed by the furniture-specific description. There are also separate copy controls for each prompt.

For useful future 3D conversion, make source images depict a **single isolated object** with unobstructed geometry and consistent camera/lighting. The prompts are concept art instructions; this website does not generate images or 3D meshes automatically.

## Interactive 3D model viewer

The preview panel includes **Image** and **3D Model** controls. The image remains the default, and choosing 3D loads an interactive GLB where available. Rotate by dragging, zoom with the mouse wheel or pinching, and return to Image at any time. Missing images/GLBs show placeholders instead of broken embeds.

When a GLB has been generated and approved, save it in the existing category-mirrored folder, for example:

```text
assets/furniture/storage/bookcases/AHQ-FUR-001/models/AHQ-FUR-001-Narrow-Bookcase.glb
```

Set the corresponding furniture record to:

```json
"model": "assets/furniture/storage/bookcases/AHQ-FUR-001/models/AHQ-FUR-001-Narrow-Bookcase.glb"
```

Use the naming convention `<ASSET-ID>-<Furniture-Name>.<ext>` for model files, with the furniture name turned into a hyphenated filename-safe slug. Matching exports share the same stem: `AHQ-FUR-001-Narrow-Bookcase.glb` is the interactive website model, while `AHQ-FUR-001-Narrow-Bookcase.stl` is stored for reference and is not displayed. Avoid generic names such as `primary.glb` or `reference.stl`. The website reads the actual GLB path from `model`; if the item's display name changes later, do not rename existing files without updating references.

Keep `image` and `IsImageGenerated` unchanged. The validator enforces the model's asset-specific folder and checks the GLB container header/version/length. Model rendering and mesh quality must also be inspected manually. Prefer self-contained GLB exports with embedded textures.

The viewer uses Google's [`<model-viewer>`](https://modelviewer.dev/) web component pinned to version 4.3.1 from jsDelivr. The website still needs no backend or build process, but displaying GLBs requires browser WebGL support and the CDN script. Optimise model size for mobile and slower connections.

## Run and validate locally

The browser must load JSON over HTTP; opening `index.html` directly with a `file://` URL will not work.

From the repository root:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000/ in your browser.

The JSON validator uses Node.js 22+ and requires no npm dependencies:

```bash
node scripts/validate-catalog.mjs
```

GitHub Actions runs this validation on pushes to `main` and on pull requests.

## Current scope and future extensions

This initial release is a **read-only catalogue**: to persist edits, modify the JSON and commit the changed file. Search, artwork status filters, deep links to models via `#AHQ-FUR-001`, responsive layout, and prompt copying work without any backend.

Potential future data fields, when needed: model footprint/dimensions for dungeon tiles, generation history/variants, and a workflow status beyond the simple image-generated flag. An in-browser editor that saves back to GitHub would require authentication and a separate write integration.
