import React from 'react';

export default function ReviewLoading() {
  return (
    <div className="min-h-screen bg-bg-primary pt-8 px-4 md:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <div className="h-8 w-48 skeleton-shimmer border border-border rounded-lg" />
          <div className="h-4 w-64 skeleton-shimmer border border-border rounded-lg mt-3" />
        </div>
        <div className="h-[44px] w-[200px] skeleton-shimmer border border-border rounded-lg" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-[300px] skeleton-shimmer border border-border rounded-2xl" />
          <div className="h-[300px] skeleton-shimmer border border-border rounded-2xl" />
        </div>
        <div className="space-y-6">
          <div className="h-[150px] skeleton-shimmer border border-border rounded-2xl" />
          <div className="h-[150px] skeleton-shimmer border border-border rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
