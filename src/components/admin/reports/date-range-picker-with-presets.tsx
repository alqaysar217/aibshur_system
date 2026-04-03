'use client';
import * as React from 'react';
import { addDays, format, startOfMonth, startOfToday, subDays } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DateRangePickerWithPresetsProps {
  className?: string;
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
}

export function DateRangePickerWithPresets({ className, date, setDate }: DateRangePickerWithPresetsProps) {
    const [isOpen, setIsOpen] = React.useState(false);
  
    const handlePresetChange = (value: string) => {
    const today = new Date();
    switch (value) {
      case 'today':
        setDate({ from: startOfToday(), to: startOfToday() });
        break;
      case 'yesterday':
        const yesterday = startOfDay(subDays(today, 1));
        setDate({ from: yesterday, to: yesterday });
        break;
      case 'last7':
        setDate({ from: startOfDay(subDays(today, 6)), to: today });
        break;
      case 'thisMonth':
        setDate({ from: startOfMonth(today), to: today });
        break;
      default:
        break;
    }
    setIsOpen(false);
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-[280px] justify-start text-left font-normal bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="ml-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'dd/MM/yy')} - {format(date.to, 'dd/MM/yy')}
                </>
              ) : (
                format(date.from, 'LLL dd, y')
              )
            ) : (
              <span>اختر تاريخاً</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-gray-950 border-gray-700 text-white" align="start">
          <div className="flex flex-col sm:flex-row p-2 gap-2">
            <Select onValueChange={handlePresetChange}>
              <SelectTrigger className="w-full sm:w-[180px] bg-gray-800 border-gray-700">
                <SelectValue placeholder="فترات جاهزة" />
              </SelectTrigger>
              <SelectContent position="popper" className="bg-gray-800 border-gray-700 text-white">
                <SelectItem value="today">اليوم</SelectItem>
                <SelectItem value="yesterday">أمس</SelectItem>
                <SelectItem value="last7">آخر 7 أيام</SelectItem>
                <SelectItem value="thisMonth">هذا الشهر</SelectItem>
              </SelectContent>
            </Select>
            <div className="sm:hidden border-b my-2 border-gray-700" />
          </div>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
            className="[&_button]:text-white"
            classNames={{
              day_selected: "bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary focus:text-primary-foreground",
              day_today: "bg-accent/50 text-white",
              day_outside: "text-muted-foreground opacity-50",
              head_cell: "text-muted-foreground",
              nav_button: "hover:bg-accent",
              caption_label: "text-white",
              nav_button_previous: "text-white",
              nav_button_next: "text-white",
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
