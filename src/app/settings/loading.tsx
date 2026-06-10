import React from 'react';

export default function SettingsLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 pb-24 pt-4">
      <div className="mb-8">
        <div className="h-8 w-48 skeleton-shimmer border border-border rounded-lg" />
        <div className="h-5 w-32 skeleton-shimmer border border-border rounded-lg mt-3" />
      </div>

      <div className="space-y-6">
        <div className="skeleton-shimmer border border-border rounded-2xl h-[250px]" />
        <div className="skeleton-shimmer border border-border rounded-2xl h-[400px]" />
        <div className="skeleton-shimmer border border-border rounded-2xl h-[300px]" />
      </div>
    </div>
  );
}
