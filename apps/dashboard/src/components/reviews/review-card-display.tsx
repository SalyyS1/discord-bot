'use client';

import { Star, Verified } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ReviewCardProps {
  review: {
    id: string;
    rating: number;
    text: string;
    createdAt: Date | string;
    user: {
      id: string;
      name: string | null;
      image: string | null;
    };
  };
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-700'
          }`}
        />
      ))}
    </div>
  );
}

export function ReviewCardDisplay({ review }: ReviewCardProps) {
  const createdDate = typeof review.createdAt === 'string'
    ? new Date(review.createdAt)
    : review.createdAt;

  return (
    <div className="group relative p-6 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-cyan-500/20 hover:bg-white/[0.03] transition-all duration-500">
      {/* Gradient glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />

      <div className="relative z-10">
        {/* Rating */}
        <div className="flex items-center gap-2 mb-4">
          <StarRating rating={review.rating} />
          <span className="text-sm text-gray-500">Verified review</span>
        </div>

        {/* Review text */}
        <p className="text-gray-300 leading-relaxed mb-6 group-hover:text-white transition-colors duration-300">
          &ldquo;{review.text}&rdquo;
        </p>

        {/* Author info */}
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold shadow-lg group-hover:scale-110 transition-transform duration-300">
            {review.user.image ? (
              <img
                src={review.user.image}
                alt={review.user.name || 'User'}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span>{(review.user.name || 'U')[0].toUpperCase()}</span>
            )}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                {review.user.name || 'Anonymous User'}
              </span>
              <Verified className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-sm text-gray-500">
              {formatDistanceToNow(createdDate, { addSuffix: true })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 to-blue-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left rounded-b-xl" />
    </div>
  );
}
