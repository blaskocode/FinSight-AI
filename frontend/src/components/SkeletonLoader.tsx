// SkeletonLoader Component
// Loading placeholders for async content

export function SkeletonLoader({ type = 'card' }: { type?: 'card' | 'text' | 'circle' | 'table' }) {
  if (type === 'card') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 animate-pulse">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gray-200 rounded-lg" />
          <div className="flex-1 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-20 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (type === 'text') {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-4/6" />
      </div>
    );
  }

  if (type === 'circle') {
    return (
      <div className="animate-pulse">
        <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto" />
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-4 bg-gray-200 rounded flex-1" />
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="h-4 bg-gray-200 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

