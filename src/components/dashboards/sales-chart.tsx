'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

const chartData = [
  { month: 'يناير', revenue: 1860 },
  { month: 'فبراير', revenue: 3050 },
  { month: 'مارس', revenue: 2370 },
  { month: 'أبريل', revenue: 730 },
  { month: 'مايو', revenue: 2090 },
  { month: 'يونيو', revenue: 2140 },
];

const chartConfig = {
  revenue: {
    label: 'الإيرادات',
    color: 'hsl(var(--primary))',
  },
};

export default function SalesChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>نظرة عامة على الإيرادات</CardTitle>
        <CardDescription>آخر 6 أشهر</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-72 w-full">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ right: 20 }}
            accessibilityLayer
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="month"
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              width={60}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <XAxis dataKey="revenue" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={5} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
