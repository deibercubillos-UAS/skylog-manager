export default function Loading() {
  return (
    <div className="p-6 max-w-7xl mx-auto animate-pulse">
      {/* Skeleton del Header */}
      <div className="mb-8 flex justify-between items-center">
        <div className="space-y-3">
          <div className="h-8 w-64 bg-gray-200 rounded-md"></div>
          <div className="h-4 w-40 bg-gray-100 rounded-md"></div>
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-24 bg-gray-200 rounded-lg"></div>
          <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
        </div>
      </div>

      {/* Skeleton de la Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 h-12 border-b border-gray-100"></div>
        <div className="divide-y divide-gray-50">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-6 flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 w-48 bg-gray-100 rounded"></div>
                <div className="h-3 w-24 bg-gray-50 rounded"></div>
              </div>
              <div className="h-4 w-32 bg-gray-100 rounded"></div>
              <div className="h-6 w-20 bg-gray-100 rounded-full"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}