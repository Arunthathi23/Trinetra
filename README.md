# TRINETRA Project

TRINETRA is organized into separate frontend and backend applications for cleaner development and deployment.

## Scripts

- Frontend:
	- `cd frontend`
	- `npm install` - install dependencies
	- `npm run dev` - start development server
	- `npm run build` - build production assets
	- `npm run preview` - preview built app

- Backend:
	- `cd backend`
	- `python -m venv venv`
	- `venv\Scripts\python -m pip install -r requirements.txt`
	- `venv\Scripts\python -m uvicorn app.main:app --reload --port 8000`

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
