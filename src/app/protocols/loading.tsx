import React from 'react';

export default function ProtocolsLoading() {
  return (
    <div className="min-h-screen bg-bg-primary pt-8 px-4 md:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <div className="h-8 w-48 skeleton-shimmer border border-border rounded-lg" />
          <div className="h-4 w-64 skeleton-shimmer border border-border rounded-lg mt-3" />
        </div>
      </div>
      
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton-shimmer border border-border rounded-2xl h-[180px] w-full" />
        ))}
      </div>
    </div>
  );
}
