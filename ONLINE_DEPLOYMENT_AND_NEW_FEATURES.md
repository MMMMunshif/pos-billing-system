# Fancy Shop Manager - New Features and Online Deployment

## Added features

### 1. Product Stock PDF download
Location: Reports page → Product Stock tab.

Flow:
1. Select **Product Stock**.
2. Choose shop filter if needed.
3. Click **Generate Report**.
4. Click **Download Product Stock PDF**.

The PDF includes product name, brand, purchased-from shop, stock, minimum alert quantity, price, total records, and total stock quantity.

### 2. Live Active status button
A green **Live Active** button is shown in the top bar.

- Green: frontend + backend + Firebase Admin are working.
- Yellow: backend is running, but Firebase Admin setup has a problem.
- Red: backend is not reachable.

The button checks `/api/health` every 10 seconds. You can also click it to refresh the status manually.

### 3. Correct duplicate stock logic
Products merge only when all of these are the same:

- Product name
- Brand
- Purchased-from shop
- Selling price

Example:

- `torchlight + abans + Local Supplier + 1500` stays as one row.
- `torchlight + abans + Local Supplier + 2500` becomes a separate row.

## Local run

```bash
npm install
npm run dev
```

Open:

```text
Frontend: http://localhost:5173
Backend health: http://localhost:5000/api/health
```

## Online deployment plan

To access the system from phone or from Colombo / India / anywhere, `localhost` is not enough. You need:

1. Backend online URL for Express API.
2. Frontend online URL for React app.
3. Firebase Authentication and Firestore continue to work as cloud services.

### Recommended beginner setup

- Backend: Render Web Service.
- Frontend: Firebase Hosting.
- Database/Auth: Existing Firebase project.

### Backend deployment notes

When deploying backend, do not upload `serviceAccountKey.json`. Add these as environment variables in the backend host:

```env
FIREBASE_PROJECT_ID=ancy-shop-manager
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@ancy-shop-manager.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_LINES\n-----END PRIVATE KEY-----\n"
CLIENT_URL=https://your-frontend-domain.web.app
```

Backend start command:

```bash
npm start
```

### Frontend deployment notes

Before building frontend, set the backend public URL:

```env
VITE_API_URL=https://your-backend-url.onrender.com
```

Then build:

```bash
npm --prefix frontend run build
```

Firebase Hosting public directory should be:

```text
frontend/dist
```

For single page app rewrite, choose **Yes** when Firebase asks:

```text
Configure as a single-page app? Yes
```

Deploy:

```bash
firebase deploy --only hosting
```

After deployment, update backend `CLIENT_URL` to include the frontend domain. If you need local + online both:

```env
CLIENT_URL=http://localhost:5173,https://your-frontend-domain.web.app
```
