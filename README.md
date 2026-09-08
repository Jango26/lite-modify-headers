<div align="right">

**English** · [简体中文](./README.zh-CN.md)

</div>

# Lite Modify Headers

Rewrite HTTP **request** and **response** headers in Chrome — from one table, with no setup.

Fill in a row, flip the switch, done. No account, no server, no telemetry — your rules stay in the browser.

![Configuration page](./docs/images/options-overview.png)

## Why it's easy

- **One table, that's the whole app.** Everything lives on a single page: one row per rule, six short fields, no wizards, no nested menus.
- **No save button.** Every change is stored and applied the moment you type it. What you see is what the browser is doing.
- **One switch for everything.** Flip _Running / Paused_ and all your rules stop or resume — they stay written down while off, so nothing gets lost.
- **Nothing to learn to get started.** Header name, value, and which URLs it applies to. Leave the URL blank and it applies everywhere.
- **You can always tell it's working.** The toolbar icon turns green while rules are live, and the status bar shows how many are actually registered.
- **Still there when you need more.** Three actions (`Set` / `Delete` / `Block`), regex URL filters, top-to-bottom priority, and groups for whole sets of headers.

## Install

### From the Chrome Web Store (recommended)

<!-- TODO: replace with the Chrome Web Store listing URL -->

**[Install from the Chrome Web Store](#)** — automatic updates, and no developer mode needed.

### From source (local build)

For running an unreleased version or hacking on the code. A locally loaded extension needs **Developer mode** left on and does not update itself.

```sh
npm install
npm run build
```

Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and select the **`dist/`** directory (not the repository root).

## Usage

### 1. Click the toolbar icon

The popup is the on/off switch: toggle all rules, toggle individual ones, or jump to the configuration page.

![Toolbar popup](./docs/images/popup.png)

### 2. Add a rule

On the configuration page, click **+ Add rule** and fill in the row:

| Column       | Meaning                                                                       |
| ------------ | ----------------------------------------------------------------------------- |
| `ON`         | Whether the rule is active. Inactive rules are not registered in the browser. |
| `TYPE`       | `REQ` applies to request headers, `RES` to response headers.                  |
| `ACTION`     | `Set` writes the header, `Delete` removes it, `Block` cancels the request.    |
| `HEADER`     | Header field name. Not used by `Block`.                                       |
| `VALUE`      | Header field value. Only used by `Set`.                                       |
| `URL FILTER` | Which URLs the rule applies to. Blank means every URL.                        |

There is nothing to save. A rule starts working as soon as it is complete — a `Set` rule needs a header name, a `Block` rule needs a URL filter.

### 3. Turn it on

Flip the switch in the page header or in the popup. The toolbar icon turns green while rules are being applied.

### Grouping related headers

When several headers belong together — say a set of CORS response headers for one API host — click **+ Add group**. The group holds the shared **name** and **URL filter**, each header inside only carries its own type, action, name and value, and switching the group off disables all of them at once.

## URL filter

- Leave it **blank** to apply the rule to all URLs.
- A plain value is matched as a **substring** of the URL, e.g. `example.com/api`.
- A value wrapped in slashes is a **regular expression**, e.g. `/api\/v[12]\//`.
- A `Block` rule **requires** a filter — without one it would block every request, so it is ignored.

Filters use the [declarativeNetRequest matching syntax](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest#matching-algorithm). The browser caps the number of registered rules and the size of regular expressions; if you exceed it, a message asks you to disable some rules.

## Priority

Rules apply top to bottom — the first rule to touch a header wins. Reorder with the arrows. A group takes as many slots as it has headers, at the position where it sits in the list.

## Examples

| Goal                                     | Type  | Action   | Header                        | Value              | URL filter             |
| ---------------------------------------- | ----- | -------- | ----------------------------- | ------------------ | ---------------------- |
| Send a fixed auth token to a staging API | `REQ` | `Set`    | `Authorization`               | `Bearer dev-token` | `staging.example.com`  |
| Pretend a different user agent           | `REQ` | `Set`    | `User-Agent`                  | `MyBot/1.0`        | `example.com`          |
| Drop the referrer everywhere             | `REQ` | `Delete` | `Referer`                     |                    |                        |
| Relax CORS while developing              | `RES` | `Set`    | `Access-Control-Allow-Origin` | `*`                | `/^https:\/\/api\./`   |
| Stop a tracker from loading              | `REQ` | `Block`  |                               |                    | `tracking.example.com` |

## Privacy

The configuration lives in `chrome.storage.local` and never leaves the browser. The extension collects no personal information and talks to no server. Configurations written in the older 1.x layout are migrated automatically on first load.

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

## Development

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the stack, project layout, configuration format and the parts that are easy to break.

## Credits

Independently written in Vite, React and TypeScript, inspired by [SimpleModifyHeaders](https://github.com/didierfred/SimpleModifyHeaders) (MPL-2.0). No source files from that project are used here.

## License

MIT.
