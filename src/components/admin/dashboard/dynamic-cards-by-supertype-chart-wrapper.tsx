
"use client";

import type { ChartConfig } from '@/components/ui/chart';
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from 'next/dynamic';

interface CardsBySupertypeDataPoint {
  name: string;
  value: number;
  fill?: string;
}

interface DynamicCardsBySupertypeChartWrapperProps {
  data: CardsBySupertypeDataPoint[];
  config: ChartConfig;
}

const CardsBySupertypeChart = dynamic(
  () => import('@/components/admin/dashboard/cards-by-supertype-chart'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[250px] w-full flex items-center justify-center">
        <Skeleton className="h-full w-full aspect-square max-w-[250px] rounded-full" />
      </div>
    ),
  }
);

export default function DynamicCardsBySupertypeChartWrapper({ data, config }: DynamicCardsBySupertypeChartWrapperProps) {
  return <CardsBySupertypeChart data={data} config={config} />;
}
