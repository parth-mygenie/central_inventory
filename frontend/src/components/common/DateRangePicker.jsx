import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X } from "lucide-react";
import { format, startOfDay, endOfDay, subDays, startOfWeek, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

const PRESETS = [
  { label: "Today", getRange: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { label: "Yesterday", getRange: () => ({ from: startOfDay(subDays(new Date(), 1)), to: endOfDay(subDays(new Date(), 1)) }) },
  { label: "This Week", getRange: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfDay(new Date()) }) },
  { label: "This Month", getRange: () => ({ from: startOfMonth(new Date()), to: endOfDay(new Date()) }) },
  { label: "Last 7 Days", getRange: () => ({ from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) }) },
  { label: "Last 30 Days", getRange: () => ({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) }) },
];

/**
 * DateRangePicker — Date range selection with presets.
 * Uses react-day-picker v8 (already installed).
 */
export default function DateRangePicker({ dateRange, onDateRangeChange }) {
  const [open, setOpen] = useState(false);

  const handlePreset = (preset) => {
    const range = preset.getRange();
    onDateRangeChange?.(range);
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onDateRangeChange?.(null);
  };

  const displayText = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, "d MMM")} – ${format(dateRange.to, "d MMM yyyy")}`
      : format(dateRange.from, "d MMM yyyy")
    : "Select dates";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          data-testid="date-range-picker-trigger"
          variant="outline"
          size="sm"
          className={cn(
            "h-8 text-xs gap-1.5 font-normal",
            !dateRange?.from && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          {displayText}
          {dateRange?.from && (
            <span
              onClick={handleClear}
              className="ml-1 hover:bg-muted rounded-full p-0.5 cursor-pointer"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          {/* Presets sidebar */}
          <div className="border-r py-2 px-1 space-y-0.5 min-w-[120px]">
            <p className="text-[10px] font-medium text-muted-foreground px-2 pb-1 uppercase tracking-wider">
              Quick Select
            </p>
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                data-testid={`date-preset-${preset.label.toLowerCase().replace(/\s+/g, "-")}`}
                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors"
                onClick={() => handlePreset(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {/* Calendar */}
          <div className="p-2">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range) => {
                onDateRangeChange?.(range || null);
                if (range?.from && range?.to) {
                  setOpen(false);
                }
              }}
              numberOfMonths={1}
              defaultMonth={dateRange?.from || new Date()}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
