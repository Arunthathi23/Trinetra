import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import FeatureCard from './FeatureCard';

const features = [
  {
    title: 'Real-time Detection',
    description: 'Capture traffic violations instantly with intelligent camera analysis and instant alerting.',
  },
  {
    title: 'Violation Tracking',
    description: 'Maintain a complete timeline of offenses and secure evidence for every incident.',
  },
  {
    title: 'AI Insights',
    description: 'Leverage predictive analytics to identify high-risk zones and prevent repeat offenses.',
  },
  {
    title: 'Evidence Generation',
    description: 'Auto-generate reliable reports, snapshots, and incident logs for enforcement review.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 12,
    },
  },
};

export default function HeroSection() {
  return (
    <motion.section
      className="relative flex flex-1 flex-col justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-[0_0_80px_rgba(14,165,233,0.08)] sm:p-12"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(139,92,246,0.18),_transparent_30%)]" />
      <motion.div
        className="relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.span
          className="inline-flex rounded-full border border-slate-700/80 bg-slate-900/80 px-4 py-1 text-sm text-sky-300 backdrop-blur"
          variants={itemVariants}
        >
          AI Traffic Violation System
        </motion.span>
        <motion.div
          className="mt-10 max-w-3xl"
          variants={itemVariants}
        >
          <motion.h1
            className="text-5xl font-black tracking-tight text-white sm:text-6xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            TRINETRA
          </motion.h1>
          <motion.p
            className="mt-6 max-w-2xl text-lg leading-8 text-slate-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Eyes on Every Road, Intelligence in Every Decision
          </motion.p>
        </motion.div>

        <motion.div
          className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center"
          variants={itemVariants}
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center rounded-full bg-sky-500 px-8 py-3 text-base font-semibold text-slate-950 transition-all duration-300 hover:-translate-y-0.5 hover:bg-sky-400 hover:shadow-[0_0_20px_rgba(56,189,248,0.4)]"
            >
              Live Monitoring
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-slate-700/80 bg-white/5 px-8 py-3 text-base font-semibold text-slate-100 transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-500/80 hover:bg-slate-900/80 hover:shadow-[0_0_20px_rgba(56,189,248,0.2)]"
            >
              View Dashboard
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-full bg-slate-800/90 px-8 py-3 text-base font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-700/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              Login
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.div
        className="relative z-10 mt-14 grid gap-5 sm:grid-cols-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            variants={itemVariants}
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <FeatureCard title={feature.title} description={feature.description} />
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}
