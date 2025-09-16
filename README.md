# FinTrack – Personal Finance Website

A modern, responsive web app to track income and expenses, attach documents (invoices/receipts), manage savings and reminders, and export ITR/GST-ready Excel files. Authentication is handled via Firebase (Email/Password + Google). All feature pages are protected and require login.

## Tech Stack

- React 18 + TypeScript + Vite
- React Router v6
- Tailwind CSS + shadcn/ui components
- TanStack Query (data fetching/caching)
- Firebase (Auth, Firestore, Storage)
- Recharts (charts)
- SheetJS/xlsx (Excel export)

## Project Structure (paths are relative)

- client/
  - App.tsx – routes and providers
  - global.css – Tailwind and global tokens
  - components/
    - layout/
      - AppHeader.tsx – top navigation (shows Log in/Sign out)
      - AppFooter.tsx – footer
      - Layout.tsx – page layout wrapper
    - routing/
      - ProtectedRoute.tsx – guards routes; redirects to /login
    - ui/ – shadcn components
  - context/
    - AuthContext.tsx – authentication state (user/loading/configured)
  - lib/
    - firebase.ts – Firebase initialization helpers
    - utils.ts – general utilities
  - pages/
    - Index.tsx – marketing/overview (demo login notice)
    - Login.tsx – email/password + Google login/signup
    - Dashboard.tsx – KPIs + charts
    - Income.tsx – add/list income with invoice upload
    - Expenses.tsx – add/list expenses with receipt upload
    - GoalsReminders.tsx – savings goals and bill reminders
    - ITR.tsx – ITR export (Excel)
    - GST.tsx – GST export (Excel)
    - NotFound.tsx – 404
- public/ – static assets
- tailwind.config.ts – Tailwind configuration
- vite.config.ts – Vite config (client)
- vite.config.server.ts – Vite config (server build)
- netlify/ – optional serverless function example
- server/ – optional Node server build output target

## Prerequisites

- Node.js 18+ (LTS recommended)
- pnpm (preferred) or npm

If using this project inside Builder.io cloud projects, use [Open Settings](#open-settings) to configure environment variables instead of committing a .env file.

## 1) Install & Run Locally

- Install dependencies
  - pnpm install
  - or: npm install
- Start dev server
  - pnpm dev
  - or: npm run dev
- Build
  - pnpm build
  - or: npm run build
- Preview server build (optional)
  - pnpm start

## 2) Firebase Setup

1. Create a Firebase project → Add a Web App → copy the config.
2. Enable products:
   - Authentication: enable Email/Password and Google providers
   - Firestore: create database (Production or Test mode)
   - Storage: create default bucket
3. Authorized domains: add your local and deployed domains (e.g., localhost, Netlify/Vercel URL).

Environment variables (required):

- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID

How to set env vars:

- Local: create a .env file at repo root (do not commit secrets)
  - Example:
    - VITE_FIREBASE_API_KEY=...
    - VITE_FIREBASE_AUTH_DOMAIN=...
    - VITE_FIREBASE_PROJECT_ID=...
    - VITE_FIREBASE_STORAGE_BUCKET=...
    - VITE_FIREBASE_MESSAGING_SENDER_ID=...
    - VITE_FIREBASE_APP_ID=...
- In Builder cloud projects: use [Open Settings](#open-settings) and set the same keys there.

## 3) Firestore & Storage Rules (baseline)

Adjust before production to your compliance requirements. Example restrictive rules (per‑user access):

Firestore (rules):

- rules_version = '2';
- service cloud.firestore {
- match /databases/{database}/documents {
-     function signedIn() { return request.auth != null; }
-     match /incomes/{docId} {
-       allow read, write: if signedIn() && request.auth.uid == resource.data.uid;
-     }
-     match /expenses/{docId} {
-       allow read, write: if signedIn() && request.auth.uid == resource.data.uid;
-     }
- }
- }

Storage (rules):

- rules_version = '2';
- service firebase.storage {
- match /b/{bucket}/o {
-     function signedIn() { return request.auth != null; }
-     // Invoices
-     match /invoices/{uid}/{docId}/{filename} {
-       allow read, write: if signedIn() && request.auth.uid == uid;
-     }
-     // Receipts
-     match /receipts/{uid}/{docId}/{filename} {
-       allow read, write: if signedIn() && request.auth.uid == uid;
-     }
- }
- }

## 4) Using the App

- Open /login → create account or sign in (Email/Password or Google)
- You’ll be redirected back to the page you attempted to visit
- Dashboard: view totals and charts (demo data shown if Firebase not configured)
- Income: add entries (source, amount, date, notes), upload invoice; saved to Firestore and Storage
- Expenses: add entries (category, amount, date, notes), upload receipt; saved to Firestore and Storage
- Goals & Reminders: plan savings and bill reminders (local/demo unless extended to Firestore)
- ITR/GST: pick date range → export Excel with SheetJS; sheets include links to uploaded docs

## 5) Data Model

- Firestore Collections
  - incomes: { uid, source, amount, date, notes, invoiceUrl, createdAt, updatedAt }
  - expenses: { uid, category, amount, date, notes, receiptUrl, createdAt, updatedAt }
- Storage Paths
  - invoices/{uid}/{docId}/{filename}
  - receipts/{uid}/{docId}/{filename}

## 6) Configuration Flags

- Firebase connectivity is detected in client/lib/firebase.ts via import.meta.env
- When not configured, the app falls back to “demo mode” on some pages and shows guidance text

## 7) Quality

- Typecheck: pnpm typecheck
- Tests: pnpm test (Vitest)
- Format: pnpm format.fix

## 8) Deployment

Choose one:

- Netlify
  - Connect via Builder MCP: [Open MCP popover](#open-mcp-popover) → Connect to Netlify → Deploy
  - Or manual: create new site → connect repo → build command: pnpm build, publish: dist/spa
- Vercel
  - Connect via Builder MCP: [Open MCP popover](#open-mcp-popover) → Connect to Vercel → Deploy
  - Or manual: import project → framework: Vite → build command: pnpm build → output dir: dist/spa
- Preview (non‑production): [Open Preview](#open-preview)

Ensure environment variables are set in your hosting provider. For Builder cloud projects, set them in [Open Settings](#open-settings).

## 9) Extending

- Make Goals & Reminders persistent by modeling collections (e.g., goals, reminders) similar to incomes/expenses
- Add role-based rules if you need shared books/teams
- Add pagination and filtering to tables (TanStack Table)
- Enhance exports: multiple sheets per month/quarter, CSV/PDF variants

## 10) Troubleshooting

- “Authentication not configured” page → set VITE*FIREBASE*\* env vars
- Cannot read/write Firestore/Storage → verify security rules and that request.auth.uid matches uid
- Excel export downloads empty → check date range filters and that data exists
- Google sign‑in blocked → add domain to Firebase Authorized Domains

## License

MIT
