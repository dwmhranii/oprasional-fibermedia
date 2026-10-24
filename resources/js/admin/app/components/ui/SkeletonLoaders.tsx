import React from 'react';

export const TaskSkeleton: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 animate-pulse px-4 sm:px-0">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-11 h-11 bg-gray-200 rounded-md"></div>
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-4 bg-gray-200 rounded w-48"></div>
        </div>
      </div>

      <div className="border rounded-lg bg-gray-50/50 p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
          <div className="h-5 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="md:col-span-2">
          <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
          <div className="h-5 bg-gray-200 rounded w-full"></div>
        </div>
      </div>

      <div className="border rounded-lg p-6 space-y-6">
        <div className="h-6 bg-gray-200 rounded w-48 border-b pb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border rounded-lg p-4 bg-white h-24 flex flex-col justify-between">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-8 bg-gray-200 rounded w-12 mt-2"></div>
          </div>
        ))}
      </div>
      
      <div className="space-y-4">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-5 bg-white space-y-4">
            <div className="flex justify-between">
              <div className="h-5 bg-gray-200 rounded w-40"></div>
              <div className="h-6 bg-gray-200 rounded-full w-24"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="pt-4 border-t flex justify-end">
              <div className="h-10 bg-gray-200 rounded w-full sm:w-32"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const TimelineSkeleton: React.FC = () => {
  return (
    <div className="border rounded-lg p-6 bg-white space-y-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-48 border-b pb-4 mb-4"></div>
      <div className="space-y-6 relative ml-2">
        <div className="absolute left-1 top-2 bottom-2 w-px bg-gray-200 z-0"></div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-4 relative z-10">
            <div className="w-3 h-3 rounded-full bg-gray-300 border-2 border-white flex-shrink-0 mt-1"></div>
            <div className="-mt-1 space-y-2 w-full">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
