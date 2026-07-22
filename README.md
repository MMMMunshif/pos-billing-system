# Fancy Shop Manager

A shop inventory, sales, customer-credit and payment management system built with React, Express and Firebase.

## Architecture

- **Frontend:** React 19 + Vite + React Router
- **Authentication:** Firebase Email/Password Authentication
- **Backend:** Node.js + Express REST API
- **Database:** Cloud Firestore through Firebase Admin SDK
- **Authorization:** Firebase ID token verification plus a `users/{uid}` profile check

The operational modules no longer write directly from the browser to Firestore. Products, stock, sales, customers and payments go through the authenticated Express API. Only the signed-in user's own profile is read directly by the frontend during login.

## Main modules

- Dashboard with today's sales, total debt and low-stock information
- Product CRUD
- Stock purchases with automatic stock and average purchase-price updates
- Multi-item cash, credit and partial sales
- Registered customers and credit history
- Debt payment collection
- Daily, monthly, credit, debt, low-stock, inventory and purchase-history reports

## Quick start

1. Install Node.js **20.19+** or **22.12+**.
2. Open this folder in VS Code.
3. Run `npm install` in the root terminal. This installs root, backend and frontend dependencies.
4. Configure `frontend/.env` with the Firebase web-app values.
5. Download a Firebase Admin service-account JSON, save it as `backend/serviceAccountKey.json`, and keep this line in `backend/.env`:

   ```env
   FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
   ```

6. Enable Email/Password authentication, create an Auth user, and create the matching Firestore user profile:

   ```text
   Collection: users
   Document ID: the Firebase Authentication UID
   Fields:
     email: admin@example.com
     name: Shop Admin
     role: admin
   ```

7. Start both applications:

   ```bash
   npm run dev
   ```

8. Open `http://localhost:5173`.
9. API health check: `http://localhost:5000/api/health`.

See [PROJECT_ANALYSIS_AND_SETUP.md](./PROJECT_ANALYSIS_AND_SETUP.md) for complete setup, troubleshooting, API and Firebase instructions.

## Root commands

| Command | Purpose |
|---|---|
| `npm install` | Install root, backend and frontend dependencies |
| `npm run setup` | Reinstall only backend and frontend dependencies |
| `npm run dev` | Start backend and frontend together |
| `npm run dev:backend` | Start only Express API |
| `npm run dev:frontend` | Start only Vite frontend |
| `npm run lint` | Run frontend ESLint |
| `npm run build` | Create frontend production build |
| `npm start` | Start backend without Nodemon |

## Important security files

- Never commit `backend/serviceAccountKey.json`.
- Never commit `.env` files.
- `firestore.rules` allows the browser to read only its own `users/{uid}` profile and blocks direct browser access to operational collections.
- The Admin SDK bypasses Firestore rules, so all backend routes verify Firebase ID tokens first.

## Added update: PDF report, live status, online access

This version adds:

- Product Stock PDF download from Reports → Product Stock.
- Green Live Active status button in the top bar.
- Product duplicate logic based on name + brand + purchased-from shop + selling price.
- Online deployment guide in `ONLINE_DEPLOYMENT_AND_NEW_FEATURES.md`.
