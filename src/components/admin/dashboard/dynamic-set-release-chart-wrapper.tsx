
"use client";

import type { ChartConfig } from '@/components/ui/chart';
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from 'next/dynamic';

// Define the props for the original SetReleaseChart if not already exported
// For now, we'll assume the props are as used in AdminDashboardPage
interface SetReleaseDataPoint {
  year: string;
  count: number;
}

interface DynamicSetReleaseChartWrapperProps {
  data: SetReleaseDataPoint[];
  config: ChartConfig; // Or the specific type for setReleaseChartConfig
}

const SetReleaseChart = dynamic(() => import('@/components/admin/dashboard/set-release-chart'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full flex items-center justify-center">
      <Skeleton className="h-full w-full" />
    </div>
  ),
});

export default function DynamicSetReleaseChartWrapper({ data, config }: DynamicSetReleaseChartWrapperProps) {
  return <SetReleaseChart data={data} config={config} />;
}
