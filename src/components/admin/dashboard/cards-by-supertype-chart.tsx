
"use client";

import { TrendingUp } from "lucide-react";
import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip as RechartsTooltip, Legend as RechartsLegend } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartLegendContent,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface CardsBySupertypeDataPoint {
  name: string; // e.g., "Pokémon", "Trainer", "Energy"
  value: number; // count of cards
  fill?: string; // Optional fill color for the segment
}

interface CardsBySupertypeChartProps {
  data: CardsBySupertypeDataPoint[];
  config: ChartConfig;
}

const COLORS = [
  "hsl(var(--chart-1))", 
  "hsl(var(--chart-2))", 
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))"
]; // From globals.css

export default function CardsBySupertypeChart({ data, config }: CardsBySupertypeChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-muted-foreground">
        No data available for card distribution by supertype.
      </div>
    );
  }

  // Assign colors to data if not already present
  const chartData = data.map((entry, index) => ({
    ...entry,
    fill: entry.fill || COLORS[index % COLORS.length],
  }));


  return (
    <ChartContainer config={config} className="mx-auto aspect-square h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <RechartsTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            innerRadius={60} // For a donut chart appearance
            labelLine={false}
            // label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }) => {
            //   const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
            //   const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
            //   const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
            //   return ( (percent * 100) > 5 ? // Only show label if percent > 5%
            //     <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px">
            //       {`${name} (${(percent * 100).toFixed(0)}%)`}
            //     </text> : null
            //   );
            // }}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
           <RechartsLegend content={<ChartLegendContent nameKey="name" />} />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
