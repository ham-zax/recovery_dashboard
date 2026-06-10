import React from 'react';

export default function WorkoutLoading() {
  return (
    <div className="max-w-md mx-auto px-4 pb-24 pt-4">
      <div className="mb-8">
        <div className="h-8 w-48 skeleton-shimmer border border-border rounded-lg" />
        <div className="h-5 w-32 skeleton-shimmer border border-border rounded-lg mt-3" />
      </div>

      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton-shimmer rounded-2xl border border-border h-[220px]" />
        ))}
      </div>
    </div>
  );
}
