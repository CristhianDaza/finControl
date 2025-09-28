# 💸 FinControl

FinControl is a modern, minimalist personal finance manager.
Track income, expenses, accounts, debts, budgets, goals, and recurring transactions with a clean UI,
bilingual support (EN/ES), charts, and customizable themes.

- Accessible, responsive UI (mobile‑first)
- Firebase Authentication (Email/Password)
- Roles and admin mode
- Invitation codes with expiration for sign‑ups
- Firestore as real‑time database
- Charts with Chart.js (lazy‑loaded)
- Lightweight i18n (EN/ES)
- Editable themes and dark/light presets
- Route protection (auth/admin)
- Code splitting by domain (Vite + Rollup)


## 🧰 Tech stack

- Vite 7 + Vue 3 (Composition API)
- Pinia (stores) + Vue Router 4
- Firebase (Auth, Firestore, Analytics)
- Chart.js 4

Main scripts (package.json):
- dev: Vite dev server (port 5174)
- build / preview
- build:analyze and bundle:analyze to inspect bundle
- i18n:scan to find hardcoded strings


## 🗂️ Project structure (overview)

- `src/main.js`: app bootstrap (Pinia, Router, i18n, theme)
- `src/router/index.js`: routes and guards (auth/admin)
- `src/services/firebase.js`: Firebase initialization
- `src/stores/*`: global state (auth, accounts, budgets, etc.)
- `src/components/*`: reusable/modals
- `src/views/*`: route views (Home, Transactions, Accounts, etc.)
- `src/i18n/*`: custom i18n with lazy‑loading of `es.json` and `en.json`
- `scripts/i18n-scan.js`: finds hardcoded strings
- `public/_redirects`: SPA redirects (Netlify/static hosting)
- `vite.config.js`: alias `@`, HMR, domain‑based code splitting


## 🚀 Getting started

Requirements:
- Node.js 18+ (recommended)
- A Firebase project (Auth + Firestore)

1) Install dependencies

```bat
REM Windows (cmd.exe)
npm install
```

2) Configure environment variables

- Copy `.env.example` to `.env` and fill Firebase values.

```bat
copy .env.example .env
```

Required (all start with `VITE_` so Vite exposes them to the client):
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_APP_ID
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_MEASUREMENT_ID
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET

Optional:
- VITE_ADMIN_UIDS: comma‑separated list of user UIDs granted admin rights in addition to Firestore `role: 'admin'`.

3) Run in development

```bat
npm run dev
```

- Open http://localhost:5174 (configured in `vite.config.js`).

4) Build and preview

```bat
npm run build
npm run preview
```

- Vite Preview serves on port 4173 by default.


## 🔐 Firebase setup

1) Create a Firebase project and add a Web App.
2) Enable Email/Password under Authentication.
3) Create a Firestore database (production mode recommended).
4) Copy the app credentials into `.env`.
5) In Authentication > Settings, add your dev host (e.g., `localhost`) to Authorized domains.

Minimal collections:

- `users/{uid}`
  - `email` (string)
  - `createdAt` (Timestamp)
  - `lastActiveAt` (Timestamp)
  - `isActive` (bool)
  - `role` ("user" | "admin")
  - `planExpiresAt` (Timestamp, optional)

- `inviteCodes/{CODE}` (for gated sign‑up)
  - `status` ("unused" | "used")
  - `plan` ("monthly" | "semiannual" | "annual")
  - `expiresAt` (Timestamp)
  - `graceExpiresAt` (Timestamp)
  - `usedBy` (uid, optional)
  - `usedByEmail` (string, optional)
  - `usedAt` (Timestamp, optional)

Notes:
- The `auth` store auto‑creates `users/{uid}` on first login if missing.
- A user is admin if `role === 'admin'` or their UID is in `VITE_ADMIN_UIDS`.


## 👥 Auth, roles, and invitations

- Sign‑in: Email/Password (Firebase Auth).
- Route guards: `requiresAuth` and, for admin routes, `requiresAdmin` (see `src/router/index.js`).
- Invitation sign‑up: validates `inviteCodes/{CODE}` is `unused` and not expired. When redeemed, the code becomes `used` and the user doc is created with `planExpiresAt`.

Quick example to create an invitation in Firestore:
- Doc: `inviteCodes/ABC123`
- Data:
  - `status`: "unused"
  - `plan`: "monthly"
  - `expiresAt`: future Timestamp
  - `graceExpiresAt`: future Timestamp


## 🌐 i18n (EN/ES)

- Initial locale is based on browser or saved preference.
- Lazy‑loads `locales/es.json` and `locales/en.json`.
- Helpers: `t(path, params)`, `tp(path, count, params)` and formatters (`formatNumber`, `formatCurrency`, `formatDate`, etc.).

Utilities:
- `npm run i18n:scan`: reports hardcoded strings in `.vue`/`.js`.


## 🎨 Theming and customization

- Dark/light presets in `src/stores/settings.js`.
- Editable CSS variables (base/accent colors and per‑transaction type).
- Preferences saved locally and synced to Firestore when authenticated via `useUserPrefs`.


## 📊 Charts and performance

- Chart.js is loaded on demand.
- Domain‑based code splitting: vendor (Vue/Pinia/Router), Firebase, Charts, and app sections (transactions, accounts, budgets, goals, debts, admin). See `vite.config.js` (`manualChunks`).


## 🧪 Available scripts

```bat
npm run dev            REM dev server (http://localhost:5174)
npm run build          REM build to /dist
npm run preview        REM preview production build
npm run build:analyze  REM build in analyze mode
npm run bundle:analyze REM build + open bundle analyzer on /dist
npm run i18n:scan      REM find hardcoded strings to translate
```

Notes:
- `bundle:analyze` uses `npx vite-bundle-analyzer dist` and will install it on demand if needed.


## 🚢 Deployment

The app is a static SPA. Any static hosting works:

- Netlify: honors `public/_redirects` (`/* /index.html 200`).
- Vercel: static project (build: `npm run build`, output: `dist`).
- Firebase Hosting: set `public` to `dist` after `npm run build`.

Typical steps:
1) `npm run build`
2) Upload `dist/` to your hosting
3) Provide environment variables to the build (via `.env` or host settings)


## 🛟 Troubleshooting

- Blank screen after login:
  - Ensure all `VITE_FIREBASE_*` variables are correct.
  - Add your domain to Firebase Auth Authorized domains.
  - Check Firestore rules (reads/writes required by the app).

- Firestore permission errors:
  - Verify `users/{uid}` exists and rules permit the operation.

- Unable to sign up new users:
  - If sign‑up requires an invitation code, ensure `inviteCodes/{CODE}` exists, is `unused`, and not expired.

- Dev server port already in use:
  - Change the port in `vite.config.js` or stop the conflicting process.


## 🧭 Conventions and architecture

- Alias `@` resolves to `src/`.
- Domain‑based Pinia stores (auth, accounts, budgets, etc.).
- Lazy‑loaded routes (code‑split by view).
- Custom i18n with EN/ES fallback.
- Centralized number, currency, and date formatters in `src/i18n/index.js`.


## 🤝 Contributing

1) Create a branch from `main`
2) Add tests/validations if you change public behavior
3) Run `npm run build` locally and review warnings
4) Open a PR describing the change and any deployment notes


## 📄 License

No license file included. If you plan to distribute, add a suitable license (MIT, Apache‑2.0, etc.).


## 📫 Support

Questions or suggestions?
Open an issue or PR.
If you need help with Firebase setup or deployment, include environment details and relevant error logs.
