# Mail Plus — Gmail HTTP add-on on Cloudflare

Backend deployed: https://mail-plus-gmail.smwlyqswkwt232.workers.dev
Deployment ID: fd90030b9fdd47f08e9d06da244fba2f

## Status
Cloudflare backend deployed; Google registration and installation are NOT complete.
Until ADDON_CLIENT_ID and ADDON_SERVICE_ACCOUNT are configured, all action endpoints fail closed (503).
GET /health exposes only service/version/setup status. No email content or tokens are logged or persisted.

## Features
Hebrew Gmail sidebar cards; add/complete personal cloud tasks; create a follow-up from the current message subject; link to existing full Mail Plus web app.
Designed emails (compose window → "מייל מעוצב"): choose one of 6 designs (royal blue, emerald, gold, burgundy, ocean, slate) and a ready wording (free, acknowledgement, follow-up, thanks, meeting, update), add title/body/signature/role and an optional ב״ה line. The add-on inserts an inline-styled HTML email (background, colored header, signature block) at the cursor in the draft (`updateDraftActionMarkup`, MUTABLE_HTML), so it stays editable. Theme, signature and role can be remembered per owner in gmail_addon_prefs.
GET /preview shows all designs with sample text only (public, no user data).
Tasks in gmail_addon_tasks are separate from existing web-app tasks. No AI generation. The add-on never sends mail; the user sends the draft. Gmail does not let add-ons apply a template automatically on send, so the template is inserted with one click while composing.
Only current-message metadata and the current compose action are requested, not whole mailbox access.

## Finish Google registration
1. In Google Cloud project yemot-admin, enable Google Workspace Marketplace SDK and Google Workspace add-ons API.
2. Configure OAuth consent as needed. In Workspace Marketplace SDK > HTTP Deployments create mail-plus-cloudflare using deployment.json.
3. From Authorization Resource copy OAuth Client ID and Service Account Email. These are identifiers, not secrets.
4. Set Cloudflare Worker plain-text vars ADDON_CLIENT_ID and ADDON_SERVICE_ACCOUNT to those exact values.
5. Install the test deployment into the intended Google account and authorize it. Reload Gmail; verify home, add/complete task, message follow-up and designed email insertion.
Do not substitute the existing web app client ID; use the HTTP deployment authorization resource.
Backend verifies service account JWT signature, endpoint audience and email, plus end-user JWT signature/client audience and owner allowlist.
Google registration must be completed before advertising the addon as installed.

## Worker
Upload worker.mjs, auth.mjs and templates.mjs as ES modules, main_module worker.mjs, compatibility date 2026-11-14.
D1 binding DB: 55626022-0bb9-408c-8622-9bd5ba2142fa.
Keep preview URLs disabled.
Schema: CREATE TABLE IF NOT EXISTS gmail_addon_tasks (id TEXT PRIMARY KEY, owner TEXT NOT NULL, title TEXT NOT NULL, created INTEGER NOT NULL, done INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS gmail_addon_tasks_owner ON gmail_addon_tasks(owner,done,created);
CREATE TABLE IF NOT EXISTS gmail_addon_prefs (owner TEXT PRIMARY KEY, theme TEXT NOT NULL, signature TEXT NOT NULL, role TEXT NOT NULL, bh INTEGER NOT NULL DEFAULT 1); (also created automatically on first use)
After updating deployment.json (new compose scope), update the HTTP deployment in Workspace Marketplace SDK and re-authorize the add-on.
Tests: node test.mjs (Node 22+).
