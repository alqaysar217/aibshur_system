'use client';
import * as React from 'react';
import { addDays, format, startOfMonth, startOfToday, subDays, endOfDay } from 'date-fns';
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
        setDate({ from: startOfToday(), to: endOfDay(today) });
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        setDate({ from: startOfDay(yesterday), to: endOfDay(yesterday) });
        break;
      case 'last7':
        setDate({ from: startOfDay(subDays(today, 6)), to: endOfDay(today) });
        break;
      case 'thisMonth':
        setDate({ from: startOfMonth(today), to: endOfDay(today) });
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
              'w-[280px] justify-start text-left font-normal rounded-lg',
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
        <PopoverContent className="w-auto p-0 rounded-lg" align="start">
          <div className="flex flex-col sm:flex-row p-2 gap-2">
            <Select onValueChange={handlePresetChange}>
              <SelectTrigger className="w-full sm:w-[180px] rounded-lg">
                <SelectValue placeholder="فترات جاهزة" />
              </SelectTrigger>
              <SelectContent position="popper" className="rounded-lg">
                <SelectItem value="today">اليوم</SelectItem>
                <SelectItem value="yesterday">أمس</SelectItem>
                <SelectItem value="last7">آخر 7 أيام</SelectItem>
                <SelectItem value="thisMonth">هذا الشهر</SelectItem>
              </SelectContent>
            </Select>
            <div className="sm:hidden border-b my-2" />
          </div>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
