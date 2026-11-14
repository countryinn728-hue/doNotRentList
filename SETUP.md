# Do Not Rent List — Setup Guide

A free, no-login internal tool for the front desk. Data lives in one Google Sheet,
a Google Apps Script serves it as a JSON API, and one HTML page (hosted on GitHub
Pages) is the app. All 3 PCs see the same list; every load/refresh pulls fresh data.

**You will do this once, in order. Takes about 15 minutes.**

---

## Part 1 — Create the Google Sheet

1. Go to <https://sheets.google.com> and click the **blank** ("+") to create a new spreadsheet.
2. Rename it (top-left) to: **Do Not Rent List**.
3. At the bottom, **double-click the tab** named `Sheet1` and rename it to exactly: `DoNotRent`
4. In **row 1**, type these 7 headers, one per cell, starting at cell **A1** (exact spelling, all lowercase):

   | A | B | C | D | E | F | G |
   |---|---|---|---|---|---|---|
   | `id` | `first_name` | `last_name` | `reason` | `notes` | `added_by` | `created_at` |

   > If you skip this, the script will create the tab and headers automatically the
   > first time someone adds an entry — but doing it now avoids confusion.

---

## Part 2 — Add the Apps Script backend

1. In the sheet, click the **Extensions** menu → **Apps Script**.
2. A new tab opens with a file called `Code.gs` containing a `function myFunction() {}`.
   **Delete everything** in that file.
3. Open the `Code.gs` file from this project, **copy all of it**, and **paste** it into the Apps Script editor.
4. Click the **💾 Save** icon (or Ctrl+S).

---

## Part 3 — Deploy as a Web App

1. Top-right of the Apps Script editor, click **Deploy** → **New deployment**.
2. Click the **gear icon** ⚙ next to "Select type" → choose **Web app**.
3. Fill in:
   - **Description:** `Do Not Rent API` (anything is fine)
   - **Execute as:** **Me** (your Google account)
   - **Who has access:** **Anyone**
     > This must be "Anyone" so the front-desk PCs can reach the API without a
     > Google login. The URL is long and unguessable; only people you give it to
     > can use it. (It does NOT make your Sheet public — only this API.)
4. Click **Deploy**.
5. Google will ask you to **authorize**:
   - Click **Authorize access** → pick your Google account.
   - You may see **"Google hasn't verified this app."** This is normal for your own
     script. Click **Advanced** → **Go to Do Not Rent List (unsafe)** → **Allow**.
6. Copy the **Web app URL**. It looks like:

   ```
   https://script.google.com/macros/s/AKfycb.....................pg/exec
   ```

   **Keep this URL** — you paste it into the HTML in Part 4.

> **If you ever change `Code.gs` later:** Deploy → **Manage deployments** → pencil/edit
> icon → **Version: New version** → **Deploy**. The URL stays the same.

---

## Part 4 — Paste the URL into index.html

1. Open `index.html` in a text editor (Notepad works).
2. Near the top of the page body, find this line:

   ```js
   const WEB_APP_URL = "PASTE_YOUR_WEB_APP_URL_HERE";
   ```

3. Replace `PASTE_YOUR_WEB_APP_URL_HERE` with the URL you copied — **keep the quotes**:

   ```js
   const WEB_APP_URL = "https://script.google.com/macros/s/AKfycb..../exec";
   ```

4. Save the file.

**Quick local test:** double-click `index.html` to open it in a browser. Add a test
entry, then search for it. If it appears, the backend works. (Delete the test entry
when done.)

---

## Part 5 — Host it on GitHub Pages (free)

1. Go to <https://github.com> and sign in. Click **+** (top-right) → **New repository**.
2. Name it (e.g. `do-not-rent`), set it to **Public**, and click **Create repository**.
   > Public only means the *code* is visible. Your Sheet and its data stay private —
   > they are only reachable through the Web App URL you control.
3. On the new repo page, click **uploading an existing file** (or **Add file → Upload files**).
4. Drag in your `index.html` (the one with the URL pasted in). Click **Commit changes**.
5. Go to the repo's **Settings** tab → **Pages** (left sidebar).
6. Under **Build and deployment → Source**, choose **Deploy from a branch**.
7. Set **Branch** to `main` and folder to `/ (root)`, then click **Save**.
8. Wait ~1 minute, then refresh the Pages settings screen. It will show your live URL:

   ```
   https://YOUR-USERNAME.github.io/do-not-rent/
   ```

9. Open that URL. Bookmark it on all 3 PCs (front desk x2 + manager office).

---

## Daily use

- **Search:** cursor is already in the search box on load. Type a name.
  - 🔴 **DO NOT RENT — MATCH FOUND** (with reason/notes) = do not rent.
  - 🟢 **No match — OK to rent**.
- **Add:** fill the Add form (reason is required), click **Add**.
- **Refresh:** click **↻ Refresh** to pull the newest list from the other PCs.
  The "Last updated" time shows when you last synced.
- **Delete:** each row in the full list has a **Delete** button (asks to confirm).

Every page load and every Refresh fetches the latest data — no stale cache.

---

## Troubleshooting

- **"Web App URL not set"** — you didn't paste the URL in Part 4, or the quotes are missing.
- **List won't load / errors** — the deployment access must be **Anyone** (Part 3, step 3).
  Re-check via Deploy → Manage deployments.
- **Changes to Code.gs don't take effect** — you must redeploy a **New version**
  (see the note at the end of Part 3).
- **Nothing saves** — confirm the tab is named exactly `DoNotRent` and headers match Part 1.
