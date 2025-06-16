
"use client";

import { ChartConfig, ChartContainer, ChartTooltipContent, ChartLegendContent } from '@/components/ui/chart';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend } from 'recharts';

interface SetReleaseDataPoint {
  year: string;
  count: number;
}

interface SetReleaseChartProps {
  data: SetReleaseDataPoint[];
  config: ChartConfig;
}

export default function SetReleaseChart({ data, config }: SetReleaseChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No set release data available to display chart.
      </div>
    );
  }

  return (
    <ChartContainer config={config} className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} accessibilityLayer margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="year"
            tickLine={false}
            tickMargin={5} // Slightly reduced margin
            axisLine={false}
            interval="preserveStartEnd" // Allows Recharts to skip labels to prevent overlap
            // Consider adding minTickGap if labels are still too dense on some views:
            // minTickGap={10} 
          />
          <YAxis allowDecimals={false} tickMargin={10} axisLine={false} />
          <RechartsTooltip
            cursor={{ fill: 'hsl(var(--muted))' }}
            content={<ChartTooltipContent indicator="dot" />} 
          />
          <RechartsLegend content={<ChartLegendContent />} />
          <Bar dataKey="count" fill="var(--color-count)" radius={4} nameKey="Sets Released" />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

