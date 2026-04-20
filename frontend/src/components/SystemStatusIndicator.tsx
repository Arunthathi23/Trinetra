import { motion } from 'framer-motion';
import { Wifi, WifiOff, Activity } from 'lucide-react';
import { useViolations } from '../context/ViolationsContext';

export function SystemStatusIndicator() {
  const { isConnected } = useViolations();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed top-6 right-6 z-50"
    >
      <div className="flex items-center gap-3 rounded-full border border-slate-700/50 bg-slate-900/90 px-4 py-2 backdrop-blur-xl shadow-2xl">
        <motion.div
          animate={{
            scale: isConnected ? [1, 1.1, 1] : 1,
            opacity: isConnected ? [0.7, 1, 0.7] : 0.5
          }}
          transition={{
            duration: 2,
            repeat: isConnected ? Infinity : 0,
            ease: "easeInOut"
          }}
          className="flex items-center gap-2"
        >
          {isConnected ? (
            <>
              <Wifi size={16} className="text-emerald-400" />
              <Activity size={14} className="text-emerald-400 animate-pulse" />
            </>
          ) : (
            <WifiOff size={16} className="text-rose-400" />
          )}
        </motion.div>

        <div className="flex items-center gap-2">
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="h-2 w-2 rounded-full bg-emerald-400"
          />
          <span className="text-sm font-semibold text-white tracking-wider">
            LIVE
          </span>
        </div>
      </div>
    </motion.div>
  );
}