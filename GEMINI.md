# GEMINI.md - Project Context: smartlib-amt

This file provides essential context and instructions for AI agents working on the **smartlib-amt** project.

## 1. Project Overview
**smartlib-amt** is a hybrid web application that combines static frontend hosting with a Google Apps Script (GAS) backend.
- **Frontend**: Single Page Application (SPA) hosted on **Firebase Hosting**.
- **Backend**: **Google Apps Script** Web App acting as a JSONP API.
- **Database**: **Google Sheets**, managed via the GAS backend.
- **Architecture**: "No full page reload" SPA. The frontend communicates with GAS using JSONP to bypass CORS limitations of Apps Script Web Apps.

## 2. Tech Stack
- **Frontend**: Vanilla JavaScript, CSS (with Lucide icons), HTML.
- **Build Tool**: Vite (configured in `package.json`, though currently serving from `public/`).
- **Backend**: Google Apps Script (GAS).
- **Deployment**: 
  - `firebase-tools` for Hosting.
  - `@google/clasp` for Apps Script.

## 3. Directory Structure
- `public/`: Static frontend assets.
  - `index.html`: The SPA shell and landing page.
  - `app.js`: Client-side router, view rendering, and API orchestration.
  - `gas_jsonp.js`: Utility for making JSONP requests to GAS.
  - `app.css`: Minimal styles for the SPA.
- `apps_script/`: Google Apps Script source code.
  - `Code.gs`: Backend logic, JSONP endpoints (`ping`, `list`, `get`, `set`, `delete`), and Google Sheet CRUD.
  - `appsscript.json`: GAS manifest/runtime settings.
- `references/`: Documentation and code snippets.
- `AI_INDEX.md`: High-level project summary and key IDs for AI/humans.
- `SPA_STRUCTURE.md`: Detailed architectural design and development conventions.

## 4. Key Configurations & IDs
- **Firebase Project**: `smartlib-amt-v2`
- **GAS Script ID**: `13IPNEQidzlM9Hwe82SnZ8lrxNZlL9T8bgWacS6LkXRGAkDv90KuLFAhn`
- **GAS Web App URL**: `https://script.google.com/macros/s/AKfycbyELEgEdWlz0jgWLmAL4qIMGUAJWllD2mRgHLmowTK2lAwpHRFCwaCaM3c1E22iGgOu/exec`
- **Google Sheet ID**: `1uaIdRHGge04aFx_OxZJToDfZIaZQYrbAYvTE7U5302A`

## 5. Building and Running

### Development
- **Local Dev**: Run `npm run dev` or `npx serve public`.
- **Backend Testing**: Use the `/db` route in the application to manually test GAS API endpoints.

### Deployment
- **Frontend**: `firebase deploy --only hosting`
- **Backend**: `clasp push` (Push code to Google Apps Script).

## 6. Development Conventions
- **JSONP for API**: All backend calls from the frontend MUST use the `gasJsonp` utility from `public/gas_jsonp.js` to avoid CORS errors.
- **SPA Routing**: Use `data-link` attributes on anchors for internal navigation. The router in `app.js` intercepts these to update the `#outlet` without a page reload.
- **Database Schema**: Google Sheet `db` contains headers: `key`, `value`, `updatedAt`.
- **Thai Documentation**: See `SPA_STRUCTURE_TH.md` for Thai-language architectural notes.

## 7. AI Agent Guidelines (from AGENTS.md)
- **Read First**: Always check `AI_INDEX.md` and `SPA_STRUCTURE.md` before proposing changes.
- **No Re-scaffolding**: Do not re-run `firebase init` or change the frontend structure unless explicitly requested.
- **Contextual Awareness**: Respect the "Render layout first, data later" philosophy described in `SPA_STRUCTURE.md`.
