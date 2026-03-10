import React from 'react';
import { motion } from 'framer-motion';

interface RankBadgeProps {
  rating: number;
  className?: string;
}

export const RankBadge: React.FC<RankBadgeProps> = ({ rating, className = '' }) => {
  let color = '#9CA3AF'; // Gray
  let glow = 'rgba(156, 163, 175, 0.5)';
  let label = 'Novice';

  if (rating >= 4.5) {
    color = '#F59E0B'; // Gold
    glow = 'rgba(245, 158, 11, 0.8)';
    label = 'Master';
  } else if (rating >= 4.0) {
    color = '#3B82F6'; // Blue
    glow = 'rgba(59, 130, 246, 0.8)';
    label = 'Expert';
  } else if (rating >= 3.0) {
    color = '#10B981'; // Green
    glow = 'rgba(16, 185, 129, 0.8)';
    label = 'Advanced';
  } else if (rating >= 2.0) {
    color = '#8B5CF6'; // Purple
    glow = 'rgba(139, 92, 246, 0.8)';
    label = 'Intermediate';
  }

  return (
    <motion.div
      className={`inline-flex items-center justify-center relative ${className}`}
      whileHover={{ scale: 1.1 }}
      title={`${label} (${(rating || 0).toFixed(1)})`}
    >
      <motion.svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        animate={{
          filter: [`drop-shadow(0 0 2px ${glow})`, `drop-shadow(0 0 8px ${glow})`, `drop-shadow(0 0 2px ${glow})`],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path
          d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.svg>
    </motion.div>
  );
};
