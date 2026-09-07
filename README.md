# Lite Modify Headers

A Chromium extension (Chrome, Edge) that rewrites HTTP request and response headers from a local rules table.

Rules are edited in place: every change is saved and re-applied immediately, there is no save button. Click the status bar to start or stop applying them.

## Rules table

| Column       | Meaning                                                                                            |
| ------------ | -------------------------------------------------------------------------------------------------- |
| `ON`         | Whether the rule is active. Inactive rules are not registered in the browser.                      |
| `TYPE`       | `REQ` applies the rule to request headers, `RES` to response headers.                              |
| `ACTION`     | `Set` writes the header (creating it if absent), `Delete` removes it, `Block` cancels the request. |
| `HEADER`     | Header field name. Not used by `Block`.                                                            |
| `VALUE`      | Header field value. Only used by `Set`.                                                            |
| `URL FILTER` | Which URLs the rule applies to.                                                                    |

Rules apply top to bottom: the first rule to change a header wins. Use the arrows to reorder them.

## URL filter

- Leave it **blank** to apply the rule to all URLs.
- A plain value is matched as a **substring** of the URL, e.g. `example.com/api`.
- A value wrapped in slashes is a **regular expression**, e.g. `/api\/v[12]\//`.
- A `Block` rule requires a filter — without one it would block every request, so it is ignored.

Filters use the [declarativeNetRequest matching syntax](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest#matching-algorithm). The browser caps the number of registered rules and the size of regular expressions; if you exceed it, a message asks you to disable some rules.

## Configuration storage

The configuration lives in `chrome.storage.local` and never leaves the browser. Configurations written in the older 1.x layout are migrated automatically on first load: `add` and `modify` both become `Set`, per-rule `url contains` values become URL filters, and cookie rules are dropped (see below).

## Development

Built with Vite, React, TypeScript and Tailwind CSS.

```sh
npm install
npm run dev     # build to dist/ with hot reload
npm run build   # typecheck, then production build
npm test        # Vitest
```

- **Load it**: open `chrome://extensions`, enable developer mode, and use _Load unpacked_ on the `dist/` directory.
- **Format**: `npm run format`

`src/lib/config.ts` holds the configuration model and the conversion to declarativeNetRequest rules as pure functions, so it is unit tested. `src/lib/chrome.ts` wraps everything that touches a chrome API; both are shared by the config page, the toolbar popup, and the service worker.

## Scope

Manifest V3 removed direct access to headers, so this extension is built entirely on `declarativeNetRequest`. That sets a few deliberate boundaries:

- **Chromium only** (Chrome, Edge). Firefox and Manifest V2 are out of scope.
- **No per-cookie editing.** `declarativeNetRequest` cannot edit one cookie inside a `Cookie` or `Set-Cookie` header; only the whole header can be set or removed.
- **One `Set` action instead of separate add/modify.** Setting a header that does not exist creates it, so the distinction buys nothing.
- **No import/export.** The interface stays small on purpose.

## Permissions

- `storage`: stores the configuration and rules.
- `activeTab`, `tabs`: opens the configuration page in a browser tab.
- `declarativeNetRequest`, `declarativeNetRequestWithHostAccess`, `*://*/*`: applies the rules table.

The extension does not collect personal information.

## Credits

Independently written in Vite, React and TypeScript, inspired by [SimpleModifyHeaders](https://github.com/didierfred/SimpleModifyHeaders) (MPL-2.0). No source files from that project are used here.

## License

MIT.
