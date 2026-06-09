import React from 'react';

export default function RootLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] w-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-accent-purple/20 border-t-accent-purple rounded-full animate-spin" />
        <span className="text-xs text-text-secondary font-mono tracking-widest uppercase opacity-70">
          Loading
        </span>
      </div>
    </div>
  );
}
