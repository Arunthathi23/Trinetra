import { motion } from 'framer-motion';

type FeatureCardProps = {
  title: string;
  description: string;
};

export default function FeatureCard({ title, description }: FeatureCardProps) {
  return (
    <motion.article
      className="group relative rounded-3xl border border-slate-800/80 bg-white/5 p-6 shadow-glow backdrop-blur-xl transition-all duration-300 hover:border-sky-500/60 hover:bg-slate-900/70 overflow-hidden"
      whileHover={{
        scale: 1.02,
        boxShadow: "0 20px 40px rgba(56, 189, 248, 0.15)"
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-500/0 via-sky-500/5 to-sky-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded-3xl" />

      <div className="relative">
        <motion.div
          className="mb-4 h-12 w-12 rounded-2xl bg-slate-800/70 text-center text-2xl leading-12 text-sky-400 transition-all duration-300 group-hover:bg-sky-500/15 group-hover:text-sky-300 group-hover:shadow-[0_0_15px_rgba(56,189,248,0.3)]"
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          •
        </motion.div>
        <motion.h3
          className="text-xl font-semibold text-white"
          initial={{ opacity: 0.9 }}
          whileHover={{ opacity: 1 }}
        >
          {title}
        </motion.h3>
        <motion.p
          className="mt-3 text-sm leading-6 text-slate-300"
          initial={{ opacity: 0.8 }}
          whileHover={{ opacity: 1 }}
        >
          {description}
        </motion.p>
      </div>
    </motion.article>
  );
}
