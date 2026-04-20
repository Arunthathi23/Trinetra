import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height
}: SkeletonProps) {
  const baseClasses = 'bg-slate-800/50 animate-pulse';

  const variantClasses = {
    text: 'h-4 rounded',
    rectangular: 'rounded-lg',
    circular: 'rounded-full'
  };

  const style = {
    width: width || (variant === 'text' ? '100%' : 'auto'),
    height: height || (variant === 'text' ? '1rem' : variant === 'circular' ? width : 'auto')
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/85 p-6 shadow-glow">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton variant="text" width="120px" height="12px" />
          <Skeleton variant="text" width="80px" height="24px" />
        </div>
        <Skeleton variant="circular" width="48px" height="48px" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-slate-800/80 bg-slate-950/85 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton variant="text" width="200px" />
              <Skeleton variant="text" width="150px" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton variant="rectangular" width="60px" height="24px" />
              <Skeleton variant="circular" width="32px" height="32px" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/85 p-6 shadow-glow">
      <div className="space-y-4">
        <Skeleton variant="text" width="150px" height="20px" />
        <Skeleton variant="rectangular" width="100%" height="300px" />
      </div>
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/85 p-6 shadow-glow">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton variant="text" width="200px" height="24px" />
          <Skeleton variant="rectangular" width="120px" height="32px" />
        </div>
        <Skeleton variant="rectangular" width="100%" height="400px" className="rounded-2xl" />
      </div>
    </div>
  );
}