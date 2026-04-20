import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ViolationsProvider } from './context/ViolationsContext';
import { ToastContainer } from './components/ToastContainer';
import { PageTransition } from './components/PageTransition';
import DashboardLayout from './components/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import LiveMonitoringPage from './pages/LiveMonitoringPage';
import ViolationsPage from './pages/ViolationsPage';
import AIInsightsPage from './pages/AIInsightsPage';
import ExplainableAIPage from './pages/ExplainableAIPage';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy load the map component for better performance
const MapViewPage = lazy(() => import('./pages/MapViewPage'));

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <ViolationsProvider>
          <BrowserRouter>
          <div className="min-h-screen bg-cool-gradient text-slate-100">
            <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-10 lg:px-10">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <PageTransition>
                          <DashboardPage />
                        </PageTransition>
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/monitoring"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <PageTransition>
                          <LiveMonitoringPage />
                        </PageTransition>
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/map"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Suspense fallback={
                          <div className="flex h-96 items-center justify-center">
                            <div className="text-center">
                              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent mx-auto"></div>
                              <p className="text-slate-400">Loading map...</p>
                            </div>
                          </div>
                        }>
                          <PageTransition>
                            <MapViewPage />
                          </PageTransition>
                        </Suspense>
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/violations"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <PageTransition>
                          <ViolationsPage />
                        </PageTransition>
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/insights"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <PageTransition>
                          <AIInsightsPage />
                        </PageTransition>
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/explainable"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <PageTransition>
                          <ExplainableAIPage />
                        </PageTransition>
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </main>
          </div>
          <ToastContainer />
        </BrowserRouter>
        </ViolationsProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
