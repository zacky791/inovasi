# Smart City Infrastructure Reporting System

MVP for reporting damaged public infrastructure via photo upload. AI Vision analyzes images and results appear on an admin dashboard with Google Maps.

## Architecture

```
React (Vite)  →  REST API  →  Node.js Express
                                    ├── Local uploads/
                                    ├── OpenAI Vision API
                                    └── PostgreSQL
```

## Folder Structure

```
Inovasi/
├── backend/
│   ├── database/
│   │   └── schema.sql
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js
│   │   ├── controllers/
│   │   │   └── report.controller.js
│   │   ├── middlewares/
│   │   │   ├── error.middleware.js
│   │   │   └── upload.middleware.js
│   │   ├── models/
│   │   │   └── report.model.js
│   │   ├── routes/
│   │   │   └── report.routes.js
│   │   ├── services/
│   │   │   ├── ai.service.js
│   │   │   └── report.service.js
│   │   └── utils/
│   │       └── file.util.js
│   ├── uploads/
│   ├── .env.example
│   ├── package.json
│   ├── server.js
│   └── src/app.js
├── frontend/
│   ├── src/
│   │   ├── assets/styles/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── router/
│   │   ├── services/
│   │   └── utils/
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- OpenAI API key
- Google Maps JavaScript API key

## Installation

### 1. Database

Create an empty database named `smart_city`, then run the schema:

```bash
psql -U postgres -c "CREATE DATABASE smart_city;"
psql -U postgres -d smart_city -f backend/database/schema.sql
```

Or use DBeaver: connect to PostgreSQL → create database `smart_city` → run `backend/database/schema.sql`.

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your PostgreSQL credentials and OpenAI API key
npm install
npm start
```

Backend runs at `http://localhost:3001`

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# Edit .env with your Google Maps API key
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3001) |
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port (default: `5432`) |
| `DB_USER` | PostgreSQL username |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_NAME` | Database name (`smart_city`) |
| `DB_SSL` | `true` for Render/cloud Postgres |
| `DATABASE_URL` | Optional full connection string (Render) |
| `OPENAI_API_KEY` | OpenAI API key for Vision |
| `UPLOAD_DIR` | Upload folder (default: `uploads`) |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend URL (default: `http://localhost:3001`) |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key |

## API Endpoints

### POST /api/reports

Create a new report (multipart/form-data).

**Fields:** `image`, `latitude`, `longitude`

**Flow:**
1. Save image locally
2. Insert report with `status = "processing"`
3. Return response immediately
4. Call OpenAI Vision asynchronously
5. Update report with AI results and `status = "pending"`

### GET /api/reports

Return all reports, newest first.

### GET /api/reports/:id

Return a single report.

## Report Flow

```
Citizen submits photo + GPS
        ↓
Backend saves image + DB record (processing)
        ↓
Response returned to user immediately
        ↓
AI analyzes image in background
        ↓
Report updated (pending) with issue_type, severity, description, confidence
        ↓
Dashboard shows marker on map (auto-refresh every 10s)
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/report` | Citizen reporting (camera/upload + GPS) |
| `/dashboard` | Admin map with color-coded markers |

## Marker Colors

| Severity | Color |
|----------|-------|
| High | Red |
| Medium | Yellow |
| Low | Green |
| Processing / Unknown | Gray |

## License

MIT
# inovasi
