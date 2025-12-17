## Worker Project API

Express/MongoDB backend for managing admins, workers, clients, projects, hours, and companies. JWT-based auth, Cloudinary upload support, and password reset flows are included.

### Tech Stack
- Node.js + Express
- MongoDB + Mongoose
- JWT auth (`ACCESS_TOKEN_KEY`, `SECRET_KEY`)
- Cloudinary signatures for uploads

### Project Structure
- `index.js` – bootstraps server and DB connection
- `app.js` – Express app, routes, global error handler
- `src/confing/` – DB connection and Cloudinary signature helper
- `src/controller/` – feature controllers (auth, worker, client, project, hours, admin, company)
- `src/routes/` – Express routers mounted at `/api/v1`
- `src/middleware/` – auth + role access middleware
- `src/models/` – Mongoose models
- `src/templates/` – HTML pages for reset, worker view, and file upload test
- `src/utils/` – error helpers and password encryption

### Installation
1) Install dependencies  
`npm install`

2) Environment variables (`.env` in project root):
```
PORT=8002
DB_URI=mongodb://localhost:27017/worker_project
ACCESS_TOKEN_KEY=your_access_secret
SECRET_KEY=your_refresh_secret
RESET_PASS_KEY=your_reset_secret
BASE_URL=http://localhost:8002

CloudName=your_cloudinary_cloud
CloudinaryApiKey=your_api_key
CloudinarySecretKey=your_secret
```

3) Start the server (nodemon)  
`npm start`

### Base URL
- REST base: `/api/v1`
- Health: `GET /` → “Server running”

### Authentication & Security
- JWT access token in `Authorization: Bearer <token>`
- Refresh tokens stored in DB (`tokenMode` collection)
- Role-based access via `accessMiddleware("admin", "worker", ...)`

### Key Routes (prefix `/api/v1`)
- **Auth** (`src/routes/authRoutes.js`)
  - `POST /auth/admin-signup`
  - `POST /auth/admin-login`
  - `POST /auth/refresh-token`
  - `GET /auth/get-reset-url`
  - `PATCH /auth/forget-password`
- **Workers** (`/worker`) – add/update/delete, list, search, mark inactive (admin-protected)
- **Clients** (`/client`) – add, get all/single, update, delete, bulk delete (mostly admin-protected)
- **Projects** (`/project`) – add, list, get single, update
- **Hours** (`/hours`) – submit/update hours, get single/worker-all, weekly view, approve week; `GET /hours/get-url` returns Cloudinary signature
- **Admin** (`/admin`) – manage worker positions
- **Company** (`/company`) – add/update/get company; add company alias (WIP)

Static/template routes:
- `GET /reset-password?q=<token>` – serves reset HTML (validates token)
- `GET /worker?w_id=<id>` – serves worker template
- `GET /file` – file upload test page

### Error Handling
- Centralized via `errorHandle` with `AppError` and `catchAsync`.

### Notes / TODO
- Company alias controller and schema need finishing/polish (field names, enums).
- Add tests and request/response examples as the API stabilizes.

