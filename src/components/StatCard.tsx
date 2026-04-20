import { motion } from 'framer-motion';

type StatCardProps = {
  title: string;
  value: number;
  change: string;
  icon: string;
};

export default function StatCard({ title, value, change, icon }: StatCardProps) {
  return (
    <motion.div
      className="group relative rounded-[1.75rem] border border-slate-800/80 bg-slate-950/90 p-6 shadow-glow transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(56,189,248,0.15)]"
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-[1.75rem] bg-gradient-to-r from-sky-500/0 via-sky-500/5 to-sky-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex items-center justify-between gap-4">
        <div>
          <motion.p
            className="text-sm uppercase tracking-[0.35em] text-slate-400"
            initial={{ opacity: 0.8 }}
            whileHover={{ opacity: 1 }}
          >
            {title}
          </motion.p>
          <motion.p
            className="mt-4 text-4xl font-semibold text-white"
            initial={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            {value.toLocaleString()}
          </motion.p>
        </div>
        <motion.div
          className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-900/80 text-2xl shadow-inner"
          whileHover={{
            scale: 1.1,
            boxShadow: "0 0 20px rgba(56,189,248,0.3)"
          }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          {icon}
        </motion.div>
      </div>
      <motion.p
        className="relative mt-4 text-sm text-slate-400"
        initial={{ opacity: 0.8 }}
        whileHover={{ opacity: 1 }}
      >
        {change}
      </motion.p>
    </motion.div>
  );
}
