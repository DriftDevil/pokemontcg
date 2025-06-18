
"use client";

import type { ChartConfig } from '@/components/ui/chart';
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from 'next/dynamic';

interface CardsAddedDataPoint {
  date: string;
  count: number;
}

interface DynamicCardsAddedChartWrapperProps {
  data: CardsAddedDataPoint[];
  config: ChartConfig;
}

const CardsAddedChart = dynamic(
  () => import('@/components/admin/dashboard/cards-added-chart'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[250px] w-full flex items-center justify-center">
        <Skeleton className="h-full w-full" />
      </div>
    ),
  }
);

export default function DynamicCardsAddedChartWrapper({ data, config }: DynamicCardsAddedChartWrapperProps) {
  return <CardsAddedChart data={data} config={config} />;
}
