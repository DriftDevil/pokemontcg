
"use client";

import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer } from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartLegendContent,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { format } from 'date-fns';

interface CardsAddedDataPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

interface CardsAddedChartProps {
  data: CardsAddedDataPoint[];
  config: ChartConfig;
}

export default function CardsAddedChart({ data, config }: CardsAddedChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-muted-foreground">
        No data available for card additions over time.
      </div>
    );
  }
  
  // Format date for XAxis display (e.g., "MMM d")
  const formattedData = data.map(item => ({
    ...item,
    displayDate: format(new Date(item.date), 'MMM d'),
  }));

  return (
    <ChartContainer config={config} className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={formattedData}
          margin={{
            top: 5,
            right: 10,
            left: -10, // Adjust to make Y-axis labels visible
            bottom: 0,
          }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="displayDate"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value, index) => {
                 // Show fewer ticks if data is dense
                if (formattedData.length > 15 && index % Math.floor(formattedData.length / 10) !== 0 && index !== formattedData.length -1 && index !== 0) {
                    return '';
                }
                return value;
            }}
             minTickGap={20}
          />
          <YAxis 
            tickLine={false} 
            axisLine={false} 
            tickMargin={8} 
            allowDecimals={false}
            width={30} // Allocate space for Y-axis labels
          />
          <RechartsTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <RechartsLegend content={<ChartLegendContent />} />
          <Line
            dataKey="count"
            type="monotone"
            stroke="var(--color-count)" // Use CSS variable from config
            strokeWidth={2}
            dot={{
              fill: "var(--color-count)",
            }}
            activeDot={{
              r: 6,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
