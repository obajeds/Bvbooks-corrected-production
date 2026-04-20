import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

interface DateRangeFilterProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

export function DateRangeFilter({ dateRange, onDateRangeChange }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const presets = [
    { label: "Today", days: 0 },
    { label: "Last 7 days", days: 7 },
    { label: "Last 30 days", days: 30 },
    { label: "Last 90 days", days: 90 },
  ];

  const handlePresetClick = (days: number) => {
    const today = new Date();
    if (days === 0) {
      onDateRangeChange({ from: startOfDay(today), to: endOfDay(today) });
    } else {
      onDateRangeChange({ 
        from: startOfDay(subDays(today, days)), 
        to: endOfDay(today) 
      });
    }
    setIsOpen(false);
  };

  const clearFilter = () => {
    onDateRangeChange(undefined);
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
                </>
              ) : (
                format(dateRange.from, "MMM d, yyyy")
              )
            ) : (
              <span>Filter by date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-popover" align="start">
          <div className="flex">
            <div className="border-r p-2 space-y-1">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-sm"
                  onClick={() => handlePresetClick(preset.days)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={(range) => {
                onDateRangeChange(range);
                if (range?.from && range?.to) {
                  setIsOpen(false);
                }
              }}
              numberOfMonths={1}
            />
          </div>
        </PopoverContent>
      </Popover>
      {dateRange && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={clearFilter}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
