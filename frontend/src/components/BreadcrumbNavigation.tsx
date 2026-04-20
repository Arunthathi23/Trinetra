import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path: string;
}

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/monitoring': 'Live Monitoring',
  '/map': 'Map View',
  '/violations': 'Violations',
  '/insights': 'AI Insights',
  '/explainable': 'Explainable AI',
};

export function BreadcrumbNavigation() {
  const location = useLocation();

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [{ label: 'Dashboard', path: '/dashboard' }];

    let currentPath = '';
    pathSegments.forEach((segment) => {
      currentPath += `/${segment}`;
      const label = routeLabels[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1);
      breadcrumbs.push({ label, path: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center space-x-2 text-sm text-slate-400 mb-6"
    >
      {breadcrumbs.map((crumb, index) => (
        <motion.div
          key={crumb.path}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="flex items-center"
        >
          {index === 0 ? (
            <Link
              to={crumb.path}
              className="flex items-center gap-1 hover:text-sky-400 transition-colors duration-200"
            >
              <Home size={16} />
              <span className="hidden sm:inline">{crumb.label}</span>
            </Link>
          ) : (
            <Link
              to={crumb.path}
              className="hover:text-sky-400 transition-colors duration-200"
            >
              {crumb.label}
            </Link>
          )}

          {index < breadcrumbs.length - 1 && (
            <ChevronRight size={16} className="mx-2 text-slate-600" />
          )}
        </motion.div>
      ))}
    </motion.nav>
  );
}