import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../context/ToastContext';
import { ViolationAlert } from '../hooks/useWebSocket';

interface ToastProps {
  alert: ViolationAlert;
  onClose: () => void;
}

function Toast({ alert, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    const timer = setTimeout(() => setIsVisible(true), 100);

    // Auto-hide after 5 seconds
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for animation to complete
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, [onClose]);

  const severityColors = {
    High: 'border-rose-500/50 bg-rose-500/10 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.3)]',
    Medium: 'border-amber-500/50 bg-amber-500/10 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)]',
    Low: 'border-sky-500/50 bg-sky-500/10 text-sky-300 shadow-[0_0_20px_rgba(14,165,233,0.3)]',
  };

  const severityGlow = {
    High: 'shadow-[0_0_30px_rgba(244,63,94,0.4)]',
    Medium: 'shadow-[0_0_30px_rgba(245,158,11,0.4)]',
    Low: 'shadow-[0_0_30px_rgba(14,165,233,0.4)]',
  };

  const severityIcons = {
    High: '🚨',
    Medium: '⚠️',
    Low: 'ℹ️',
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ x: '100%', opacity: 0, scale: 0.8 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: '100%', opacity: 0, scale: 0.8 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            opacity: { duration: 0.2 }
          }}
          className="fixed top-4 right-4 z-50 max-w-sm"
        >
          <motion.div
            className={`rounded-2xl border p-4 backdrop-blur-xl ${severityColors[alert.severity]} ${severityGlow[alert.severity]}`}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <div className="flex items-start gap-3">
              <motion.span
                className="text-2xl"
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {severityIcons[alert.severity]}
              </motion.span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm">
                  🚨 Violation detected
                </p>
                <p className="text-xs opacity-90 mt-1">
                  {alert.violation_type} · {alert.vehicle_id} at {alert.location}
                </p>
                <p className="text-xs opacity-75 mt-1">
                  {(alert.confidence * 100).toFixed(1)}% confidence
                </p>
              </div>
              <motion.button
                onClick={() => {
                  setIsVisible(false);
                  setTimeout(onClose, 300);
                }}
                className="text-white/60 hover:text-white transition-colors rounded-full p-1 hover:bg-white/10"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                ✕
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((alert) => (
          <Toast
            key={alert.id}
            alert={alert}
            onClose={() => removeToast(alert.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}