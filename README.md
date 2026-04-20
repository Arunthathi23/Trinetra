# TRINETRA Landing Page

Modern React + Tailwind CSS landing page for TRINETRA, an AI Traffic Violation System.

## Scripts

- `npm install` - install dependencies
- `npm run dev` - start development server
- `npm run build` - build production assets
- `npm run preview` - preview built app

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

- Modular component structure in `src/components`
- Routing support added with `react-router-dom`
- Protected routes with authentication guards
- Role-based UI and navigation
- Dark gradient theme with smooth animations
- Charts powered by Recharts library
