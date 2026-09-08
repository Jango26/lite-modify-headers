# Architecture

Developer-facing notes for Lite Modify Headers. For what the extension does and how to use it, see the [README](../README.md).

## Stack

**Vite + [@crxjs/vite-plugin](https://crxjs.dev/) + React 19 + TypeScript + Tailwind CSS v4.**

`manifest.json` is the crxjs build entry; the output goes to `dist/` (gitignored). Firefox and Manifest V2 are not supported — the `background.js` / `manifestV2.json` / `webRequest` path was removed after 1.9.0.

## Commands

| Command          | What it does                                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`    | Vite dev server writing `dist/` with HMR. React edits refresh live; `manifest.json` and service worker edits need a manual extension reload. |
| `npm run build`  | `tsc --noEmit` then `vite build` — type errors block the build.                                                                              |
| `npm test`       | Vitest over `src/lib/config.test.ts`. `npm run test:watch` for watch mode.                                                                   |
| `npm run format` | Prettier: 4 spaces, single quotes, no trailing comma, printWidth 120.                                                                        |
| `npm run icons`  | Regenerates `public/icons/` from `scripts/make-icons.mjs`.                                                                                   |

Load the unpacked extension from **`dist/`**, not the repository root.

### Automated verification needs Chrome for Testing

Stable Google Chrome **disables `--load-extension`** (the log shows `--load-extension is not allowed in Google Chrome, ignoring.`), so pointing puppeteer at `/Applications/Google Chrome.app` silently loads nothing. Use Chrome for Testing (`~/.cache/puppeteer/chrome/mac_arm-*/`) or Edge for end-to-end runs.

## Layout

There is exactly one rewrite path: configuration → declarativeNetRequest dynamic rules.

| Path                    | Role                                                                                                                                                                                                                                                                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/config.ts`     | Pure logic: types, the configuration model (`getDefaultConfig` / `createEmptyRule`), 1.x → 2.0 migration (`migrateConfig`), rule conversion (`convertRulesToDynamicRules`). Touches no chrome API and no DOM, so Vitest can exercise it directly. **Configuration structure changes go here.**                                   |
| `src/lib/chrome.ts`     | Side effects: storage reads/writes, icon switching, dNR registration (`applyConfig`). Fully promisified. Shared by the config page, the popup and the service worker, so it **cannot assume `window` / DOM exist** — errors are reported through return values (`applyConfig` returns an error string or `null`), never `alert`. |
| `src/config/`           | The configuration page (`options_ui`, `open_in_tab: true`). All state lives in the `useConfig.ts` hook; `config.items` is the single source of truth and every edit calls `commit()` (store + re-register). No save button.                                                                                                      |
| `src/menu/`             | The toolbar popup: start/stop, per-item toggles, and a link to the configuration page.                                                                                                                                                                                                                                           |
| `src/service-worker.ts` | Re-registers rules on `onStartup` / `onInstalled` only — the configuration may have changed while the extension was disabled.                                                                                                                                                                                                    |
| `public/icons/`         | Copied verbatim into `dist/`. Icons **must** live in `public/`: `applyConfig` swaps to the green set at runtime, and crxjs only bundles the two referenced statically from the manifest.                                                                                                                                         |

## Configuration format

Stored as a JSON string under the `config` key in `chrome.storage.local`; the on/off state is a separate `started` key (`'on'` / `'off'`). Current `CONFIG_FORMAT_VERSION = '3.0'`:

```
{format_version, debug_mode, items: [
  {kind: 'rule',  status, name, apply_on, action, header_name, header_value, url_filter},
  {kind: 'group', status, name, url_filter, headers: [{status, apply_on, action, header_name, header_value}]}
]}
```

`items` is a **flat array mixing single rules and groups**; its order determines priority.

- `action` is `set` / `delete` / `block`; `apply_on` is `req` / `res`.
- A group's headers have **no own `name` or `url_filter`** — the group holds both and `expandGroup` pushes them down onto every header. Turning the group off disables all of them.
- Groups do not support `block`: blocking is purely a function of the URL, unrelated to batch header edits.
- `convertItemsToDynamicRules` = `flattenItems` (expand groups) + `convertRulesToDynamicRules`.

## Things that are easy to break

**Rule priority.** Rules are "top to bottom, first writer wins", implemented as a descending `priority: applicable.length - index` — a lower row index means higher priority. Priority is computed **after** groups are expanded, so a group consumes N slots at its position. Don't break this when touching the ordering logic.

**HTML pages must be build entries.** Listing an html file only under `web_accessible_resources` makes crxjs **copy it verbatim instead of bundling it**, and the shipped `<script src="./main.tsx">` then fails in the browser. That's why the configuration page goes through `options_ui`. Any new page needs to hang off some manifest entry field too.

**start/stop has two owners.** Both the configuration page and the popup can change it. The configuration page syncs via `chrome.storage.local.onChanged` watching **only the `started` key** — do not also watch `config`, which the page itself owns; that races with its own per-keystroke writes.

**Migration runs once.** `loadState` returns a `migrated` flag and the configuration page persists immediately, so migration doesn't re-run on every load. `migrateConfig` picks the source by field: 2.0 just wraps each rule as `{kind: 'rule'}`; 1.x additionally maps `add`/`modify` → `set`, drops cookie actions (MV3 cannot edit individual cookies), and converts `url_contains` to `url_filter` only when `use_url_contains` was on.

## Styling

Tailwind v4, no `tailwind.config.js` — design tokens live in the `@theme` block of `src/index.css` (`--color-accent`, `--color-muted`, …), used as `bg-accent` / `text-muted`.

The brand colour is green `#34a853`, shared by `--color-accent` and `--color-running`: the toolbar icon already turns green while rules are applied, so "brand" and "it is live" are deliberately the same signal. `scripts/make-icons.mjs` holds the same value in its `STATES.green` entry — change both together.

Content width is locked to 1160px centered by the custom `@utility gutter` (`padding-inline: max(40px, calc((100% - 1160px) / 2))`). Padding rather than a wrapper element, so full-bleed bands like the status bar can still paint their background across the whole viewport.
