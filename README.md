# TRINETRA Project

TRINETRA is organized into separate frontend and backend applications for cleaner development and deployment.

## Quick Start

### Backend Setup & Run

1. **Set up Python environment** (first time only):
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate  # On Windows
   source venv/bin/activate  # On macOS/Linux
   pip install -r requirements.txt
   ```

2. **Start the backend server**:
   ```bash
   cd backend
   venv\Scripts\activate  # On Windows
   source venv/bin/activate  # On macOS/Linux
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   - API docs available at: http://localhost:8000/docs
   - Backend runs on: http://localhost:8000

### Frontend Setup & Run

1. **Install dependencies** (first time only):
   ```bash
   cd frontend
   npm install
   ```

2. **Start the dev server**:
   ```bash
   cd frontend
   npm run dev
   ```
   - Frontend runs on: http://localhost:5173

### Running Both Together

Open two terminals and run:

**Terminal 1 - Backend**:
```bash
cd backend
source .venv/Scripts/activate  # or venv\Scripts\activate on Windows
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
```

Then visit: http://localhost:5173

### Build & Deploy

**Frontend build**:
```bash
cd frontend
npm run build    # Creates optimized production build
npm run preview  # Preview the built app locally
```

**Backend**: Deploy with `uvicorn app.main:app --host 0.0.0.0 --port 8000` (without `--reload` for production)

## Deployment on Render

### Backend Deployment

1. **Create a new Web Service on Render**:
   - Go to [render.com](https://render.com) and sign in
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the `Trinetra` repository

2. **Configure Backend Service**:
   - **Name**: `trinetra-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
   - **Instance Type**: Free (or paid tier for production)

3. **Set Environment Variables** (in Render dashboard):
   - No critical env vars needed for demo (uses fallback dummy data)
   - Optional: Add `ENVIRONMENT=production`

4. **Deploy**:
   - Render auto-deploys on each push to main branch
   - Backend URL: `https://trinetra-backend.onrender.com`

### Frontend Deployment

1. **Create a new Static Site on Render**:
   - Go to Render dashboard
   - Click "New +" → "Static Site"
   - Connect your GitHub repository

2. **Configure Frontend Service**:
   - **Name**: `trinetra-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

3. **Update Backend URL** (before deploying):
   - Edit `frontend/src/services/api.ts`
   - Change `baseURL` from `http://localhost:8000` to your deployed backend URL:
   ```typescript
   const api = axios.create({
     baseURL: "https://trinetra-backend.onrender.com",
     headers: {
       "Content-Type": "application/json",
     },
   });
   ```

4. **Update WebSocket URL** (before deploying):
   - Edit `frontend/src/context/ViolationsContext.tsx`
   - Change WebSocket URL:
   ```typescript
   const { alerts: websocketAlerts, isConnected, lastAlert } = useWebSocket(
     'wss://trinetra-backend.onrender.com/ws/violations?video_source=dummy'
   );
   ```

5. **Deploy**:
   - Render auto-deploys on each push
   - Frontend URL: `https://trinetra-frontend.onrender.com`
   - Add environment variables if needed via Render dashboard

### Connect Frontend to Backend on Render

After both services are deployed:
1. Update the WebSocket and API URLs in frontend code (see steps above)
2. Commit changes to GitHub
3. Render auto-deploys both services
4. Visit frontend URL and verify backend connectivity in browser console

**Note**: Free tier services on Render spin down after 15 minutes of inactivity. For production use, upgrade to paid instances.

## Features

- **Landing Page**: Hero section with CTA buttons and feature cards
- **Authentication**: Login system with role-based access (Admin/Officer)
- **Dashboard Layout**: Sidebar navigation with role-based menu items
- **Live Monitoring**: Simulated camera feed with bounding boxes and alerts
- **Violations Management**: Table view with filters, modal previews, and approval workflow
- **AI Insights**: Interactive charts and predictive analytics dashboard

## Routes

- `/` - Landing page
- `/login` - Authentication
- `/dashboard` - Main dashboard overview
- `/monitoring` - Live traffic monitoring
- `/violations` - Incident records management
- `/insights` - AI-powered analytics
- `/explainable` - Explainable AI transparency (Admin only)

## Notes

- Frontend source lives in `frontend/src/components`
- Routing support added with `react-router-dom`
- Protected routes with authentication guards
- Role-based UI and navigation
- Dark gradient theme with smooth animations
- Charts powered by Recharts library
