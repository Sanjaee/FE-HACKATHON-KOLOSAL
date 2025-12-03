import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const SkeletonCardLayout = () => (
  <div className="bg-white rounded-xl shadow p-3 flex flex-col h-full animate-pulse">
    <Skeleton className="w-full h-48 rounded-lg mb-3" />
    <div className="flex-1 flex flex-col gap-2">
      <Skeleton className="h-6 w-3/4 rounded" />
      <Skeleton className="h-4 w-1/2 rounded" />
      <div className="flex gap-2 mt-2">
        <Skeleton className="h-4 w-10 rounded" />
        <Skeleton className="h-4 w-10 rounded" />
      </div>
      <div className="flex gap-2 mt-2">
        <Skeleton className="h-4 w-12 rounded" />
        <Skeleton className="h-4 w-12 rounded" />
        <Skeleton className="h-4 w-12 rounded" />
      </div>
      <div className="flex-1" />
      <Skeleton className="h-6 w-1/2 rounded mt-2" />
    </div>
  </div>
);

export default SkeletonCardLayout;
