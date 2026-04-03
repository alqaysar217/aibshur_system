import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string;
  description: string;
  Icon: LucideIcon;
  iconColorClass: string;
}

export default function KpiCard({ title, value, description, Icon, iconColorClass }: KpiCardProps) {
  return (
    <Card className="bg-white/5 border-white/20 backdrop-blur-sm rounded-3xl shadow-lg text-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-gray-300">{title}</CardTitle>
        <Icon 
          className={cn('w-6 h-6', iconColorClass)} 
          style={{ filter: `drop-shadow(0 0 10px currentColor)` }}
        />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-black">{value}</div>
        <p className="text-xs text-gray-400">{description}</p>
      </CardContent>
    </Card>
  );
}
