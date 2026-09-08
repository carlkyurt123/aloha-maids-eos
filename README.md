# Aloha Maids — End of Shift Report

Internal tool for the sales team to log end-of-shift stats. Every submission is appended
as a new row in a Google Sheet.

- **Live URL (target):** https://eos.alohamaidsnews.com
- **Frontend:** static `index.html` (no framework, no build step)
- **Backend:** one Vercel serverless function (`api/submit.js`) that writes to Google Sheets

---

## Project layout

```
.
├── index.html          # the form (served as the homepage)
├── api/
│   └── submit.js        # POST /api/submit — appends a row to the Google Sheet
├── package.json          # declares the `googleapis` dependency for the function
├── .env.example           # documents the 3 env vars the function needs
└── .gitignore
```

There's no build step — Vercel serves `index.html` as a static file and runs
`api/submit.js` as a serverless function automatically. Nothing else to configure.

---

## 1. Google Sheet setup

1. Create a new Google Sheet (or use an existing one).
2. Rename the first tab to **`EOS Reports`** (must match exactly — the function writes to
   the range `EOS Reports!A:M`).
3. Add a header row:

   ```
   Timestamp | Shift Date | Name | Received Calls | Outbound Calls | Booking by Staff | Booking Online | Booking by Customer | Email Quote Sent | Marketing/Robo | Text Brigade | Quote Form Lead | New Recurring
   ```

   **Booking by Customer** (column H) is retired — the form no longer collects it.
   The column and its header stay so existing rows keep their alignment, and new
   rows leave the cell blank rather than writing a `0` that would look like a real
   count. Don't delete the column unless you also narrow the range in
   `api/submit.js` from `A:M` to `A:L`.

4. Copy the **Sheet ID** out of the URL — the long string between `/d/` and `/edit`:

   ```
   https://docs.google.com/spreadsheets/d/THIS_IS_THE_SHEET_ID/edit
   ```

### Create the service account (lets the function write to the sheet)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create a project
   (or reuse one).
2. Enable the **Google Sheets API** for that project (APIs & Services → Enable APIs →
   search "Google Sheets API" → Enable).
3. Go to **IAM & Admin → Service Accounts → Create Service Account**. Any name works,
   e.g. `aloha-maids-eos`. No project-level role needed — access is granted directly on
   the sheet in the next step.
4. Open the new service account → **Keys** tab → **Add Key → Create new key → JSON**.
   This downloads a `.json` file — keep it private, don't commit it.
5. Open the Google Sheet → **Share** → paste the service account's email (looks like
   `aloha-maids-eos@your-project.iam.gserviceaccount.com`, found in the JSON file and in
   the Cloud Console) → give it **Editor** access.

From the downloaded JSON you need two values for the environment variables below:
`client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`, and `private_key` → `GOOGLE_PRIVATE_KEY`.

---

## 2. Environment variables

Copy `.env.example` to `.env` for local testing (never commit `.env` — it's already in
`.gitignore`). In Vercel, set the same three under **Project Settings → Environment
Variables**:

| Variable | Value |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | the `client_email` from the JSON key |
| `GOOGLE_PRIVATE_KEY` | the `private_key` from the JSON key, quotes included, `\n` kept literal |
| `GOOGLE_SHEET_ID` | the Sheet ID from step 1 |

---

## 3. GitHub

```bash
git init
git add .
git commit -m "Initial commit: Aloha Maids EOS report"
gh repo create aloha-maids-eos --private --source=. --remote=origin --push
```

(Or create the repo manually on github.com and `git remote add origin <url>` then
`git push -u origin main`.)

---

## 4. Vercel deployment

1. [vercel.com](https://vercel.com) → **Add New → Project** → import the GitHub repo.
2. Framework preset: **Other** (no build command / output directory needed).
3. Add the 3 environment variables from step 2 before deploying (or right after, then
   redeploy).
4. Deploy.

---

## 5. Custom domain — eos.alohamaidsnews.com

1. In the Vercel project → **Settings → Domains** → add `eos.alohamaidsnews.com`.
2. Vercel will show a CNAME target (usually `cname.vercel-dns.com`).
3. In the DNS settings for `alohamaidsnews.com` (wherever that domain is registered/
   managed), add:

   ```
   Type:  CNAME
   Name:  eos
   Value: cname.vercel-dns.com
   ```

4. Wait for DNS to propagate (usually minutes, sometimes longer). Vercel's Domains page
   shows a green check once it's verified and SSL is issued.

---

## Local development

```bash
npm install
npx vercel dev
```

This runs the static file and the `/api/submit` function together at `localhost:3000`,
using the `.env` file for credentials.

---

## How it works

1. Sales rep fills out the form and hits **Submit my EOS Report**.
2. The browser POSTs `{ name, shiftDate, timestamp, values }` to `/api/submit`.
3. The function authenticates as the service account and appends one row to
   `EOS Reports!A:M` in the target sheet.
4. On success, the page shows a loading spinner then a "Mahalo" thank-you screen. On
   failure (network issue, bad credentials, etc.), the report is still cached in that
   browser's `localStorage` and the rep sees a message to flag it to their manager.
