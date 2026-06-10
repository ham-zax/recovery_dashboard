import React from 'react';

export default function CheckInLoading() {
  return (
    <div className="max-w-md mx-auto px-4 pb-24 pt-4">
      {/* Page Title */}
      <div className="mb-8">
        <div className="h-8 w-48 skeleton-shimmer border border-border rounded-lg" />
        <div className="h-5 w-32 skeleton-shimmer border border-border rounded-lg mt-3" />
      </div>

      <div className="space-y-8">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="skeleton-shimmer rounded-2xl border border-border h-[120px]" />
            <div className="skeleton-shimmer rounded-2xl border border-border h-[120px]" />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="skeleton-shimmer rounded-full border border-border h-[56px]" />
            <div className="skeleton-shimmer rounded-full border border-border h-[56px]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="skeleton-shimmer rounded-2xl border border-border h-[120px]" />
            <div className="skeleton-shimmer rounded-2xl border border-border h-[120px]" />
          </div>
          <div className="skeleton-shimmer rounded-2xl border border-border h-[100px]" />
          <div className="skeleton-shimmer rounded-full h-[56px]" />
        </div>
      </div>
    </div>
  );
}
