# Fancy Shop Manager — Full Analysis and VS Code Setup

## 1. Original project analysis

The uploaded project already had a complete-looking React UI, Firebase Authentication and Firestore service files. However, its backend was not a complete application backend.

### Original backend limitations

- The Express server had only `/api/health` and `/api/dashboard/summary`.
- Product, stock, sale, customer and payment operations were performed directly from the React browser.
- The frontend did not call `VITE_API_URL` for business operations.
- The backend `.env` did not contain Firebase Admin credentials.
- `verifyToken` attempted to use Firebase Admin Auth before guaranteeing that Firebase Admin was initialized.
- Multi-step sales and payments were not atomic. A failure in the middle could save a sale but fail to deduct all stock, or change debt without completing all related writes.
- Stock deduction read a product and updated it later without a Firestore transaction, allowing two simultaneous sales to create incorrect stock.
- The included `node_modules` had platform-specific files and failed on another operating system.
- ESLint had Fast Refresh errors in the context files.

## 2. What has been fixed

### Backend APIs added

All routes below require a valid Firebase ID token and a matching Firestore user profile.

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | API and Firebase Admin status |
| GET | `/api/auth/me` | Current authenticated user/profile |
| GET | `/api/dashboard/summary` | Dashboard summary |
| GET/POST | `/api/products` | List/create products |
| GET/PUT/DELETE | `/api/products/:id` | Read/update/delete product |
| PATCH | `/api/products/:id/stock` | Safely adjust stock |
| GET/POST | `/api/customers` | List/create customers |
| GET/PUT/DELETE | `/api/customers/:id` | Customer CRUD |
| GET | `/api/customers/:id/sales` | Customer sales history |
| GET | `/api/customers/:id/payments` | Customer payment history |
| PATCH | `/api/customers/:id/debt` | Adjust customer debt |
| GET/POST | `/api/stock-purchases` | List/create stock purchases |
| GET/POST | `/api/sales` | List/create sales |
| GET | `/api/sales/:id/items` | Sale item details |
| POST | `/api/payments` | Record debt payment |

### Transaction safety added

Firestore transactions are now used for:

- Stock purchase + product creation/update + supplier record
- Sale creation + all item records + all product stock deductions + customer debt update
- Customer payment + customer debt reduction
- Manual stock/debt adjustment

This means the related records either complete together or fail together.

### Frontend changed to backend API

The existing page components were preserved. Their service functions now call the Express backend with the current Firebase user's ID token. Existing `subscribeProducts`, `subscribeCustomers` and `subscribeSales` interfaces are preserved through lightweight polling and refresh-on-window-focus.

### Development quality fixes

- Added centralized API error handling and 404 handling.
- Added strict input validation for quantities, money and dates.
- Added CORS allow-list support.
- Added graceful backend shutdown.
- Fixed Auth and Toast context lint errors.
- Added root commands and VS Code tasks.
- Clean-installed dependencies to remove incompatible ZIP-provided native modules.
- Verified frontend ESLint and production build.

## 3. Required software

Install:

- Visual Studio Code
- Node.js 20.19 or later, or Node.js 22.12 or later
- npm, included with Node.js

Check in a terminal:

```bash
node -v
npm -v
```

## 4. Open in VS Code

1. Extract the fixed ZIP.
2. Open VS Code.
3. Select **File → Open Folder**.
4. Select the `fancy-shop-manager` folder containing the root `package.json`.
5. Open **Terminal → New Terminal**.

## 5. Install dependencies

From the root folder:

```bash
npm install
```

The root `postinstall` script also installs `backend` and `frontend` dependencies.

Do not copy `node_modules` from another computer. Always run the install commands on the computer where the project will run.

## 6. Firebase frontend configuration

In Firebase Console:

1. Create/select the Firebase project.
2. Add a Web App.
3. Copy its web configuration into `frontend/.env`.

Example:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_API_URL=http://localhost:5000
```

Restart Vite after editing this file.

## 7. Firebase backend configuration — compulsory

The backend needs a Firebase Admin service account. The Firebase web configuration is not enough for the backend.

1. Firebase Console → Project Settings → Service accounts.
2. Generate a new private key JSON.
3. Rename/save it as:

```text
backend/serviceAccountKey.json
```

4. Ensure `backend/.env` contains:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
```

Never upload the real JSON to GitHub, WhatsApp groups or public hosting. It provides privileged access to the Firebase project.

## 8. Enable login

1. Firebase Console → Authentication.
2. Enable Email/Password sign-in.
3. Create an admin or staff user.
4. Copy that user's UID.
5. In Firestore, create `users/{UID}`.

Admin example:

```json
{
  "email": "admin@example.com",
  "name": "Shop Admin",
  "role": "admin"
}
```

Staff example:

```json
{
  "email": "staff@example.com",
  "name": "Shop Staff",
  "role": "staff"
}
```

The role must be lowercase `admin` or `staff` because the login screen checks the selected role.

## 9. Create Firestore and apply rules

Create a Cloud Firestore database. For this backend-based architecture, use the included `firestore.rules` content in Firebase Console → Firestore Database → Rules, then publish it.

The rules intentionally:

- Allow an authenticated user to read only their own `users/{uid}` profile.
- Block browser access to products, stock, sales, customers and payments.
- Let only the authenticated Express backend access operational collections through Firebase Admin SDK.

## 10. Create indexes

Use the included `firestore.indexes.json`. The important composite indexes are:

- `stockPurchases`: `productId ASC`, `purchaseDate DESC`
- `sales`: `customerId ASC`, `saleDate DESC`
- `payments`: `customerId ASC`, `paymentDate DESC`

You can deploy them with Firebase CLI or create them from Firestore's index-error links.

## 11. Run the system

From the root folder:

```bash
npm run dev
```

You should see two processes:

```text
BACKEND  Fancy Shop API running on http://localhost:5000
FRONTEND Local: http://localhost:5173
```

Open:

```text
http://localhost:5173
```

You can also run them separately.

Terminal 1:

```bash
npm run dev:backend
```

Terminal 2:

```bash
npm run dev:frontend
```

In VS Code, press `Ctrl+Shift+B` and select **Fancy Shop: Run frontend + backend**.

## 12. Verify backend

Open:

```text
http://localhost:5000/api/health
```

Correct configured response:

```json
{
  "success": true,
  "firebaseConfigured": true
}
```

If it says Firebase Admin is not configured, confirm:

- `backend/serviceAccountKey.json` exists.
- The JSON is valid and belongs to the same Firebase project as `frontend/.env`.
- `FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json` exists in `backend/.env`.
- The backend was restarted after adding the file.

## 13. Typical errors

### `npm.ps1 cannot be loaded because running scripts is disabled`

Use Command Prompt instead of PowerShell, or run the commands with `npm.cmd`:

```powershell
npm.cmd install
npm.cmd run dev
```

A per-user PowerShell option is:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### `Cannot find native binding` / Rolldown binding error

Delete local dependencies and install again:

```bash
rm -rf node_modules frontend/node_modules backend/node_modules
npm install
```

On Windows Command Prompt:

```cmd
rmdir /s /q node_modules
rmdir /s /q frontend\node_modules
rmdir /s /q backend\node_modules
npm install
```

### Login succeeds but page says profile is not set up

Create a Firestore document at `users/{Authentication UID}` with `email`, `name` and `role`.

### `This account is registered as admin, not staff`

Select the same role on the login screen as the `role` field stored in Firestore.

### API returns 401

The token is missing, expired, or from a different Firebase project. Sign out, sign in again and confirm frontend/backend use the same project.

### API returns 503

The Express process is running, but Firebase Admin service-account configuration is missing or invalid.

### Firestore asks for an index

Use the link in the Firebase error to create the index, or deploy `firestore.indexes.json`.

### Port already in use

Change backend `PORT` and frontend `VITE_API_URL` together. Example:

```env
# backend/.env
PORT=5001
```

```env
# frontend/.env
VITE_API_URL=http://localhost:5001
```

## 14. Test commands used on the fixed project

```bash
npm run lint
npm run build
node --check backend/server.js
```

Results at handoff:

- Frontend ESLint: passed
- Frontend production build: passed
- Backend JavaScript syntax checks: passed
- Express server start: passed
- Health endpoint: correctly reports 503 until a real service account is added
- Frontend dependency audit: 0 known vulnerabilities after non-breaking fixes
- Backend audit: remaining moderate findings are transitive Google/Firebase SDK dependencies; the suggested forced fix is a breaking Firebase Admin downgrade and was not applied

## 15. Current limitation

The real Firebase database/authenticated API flow cannot be executed without your private Firebase Admin service-account JSON. That secret was not in the uploaded ZIP and should not be generated or guessed by anyone else. Once you place the JSON in `backend/serviceAccountKey.json`, the implemented backend is ready to connect to your Firebase project.
