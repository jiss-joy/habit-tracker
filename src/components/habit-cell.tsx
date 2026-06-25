'use client';

import { useState } from 'react';
import { Button } from "./shadcn/button";
import { Input } from "./shadcn/input";
import { Popover, PopoverContent, PopoverTrigger } from "./shadcn/popover";
import { Check, Minus } from "lucide-react";

interface HabitCellProps {
  habitId: string;
  dateStr: string;
  isMeasurable: boolean;
  unit?: string | null;
  habitName: string;
  matchedLog?: { id: string; value: number } | null;
  onBinaryToggle: (habitId: string, dateStr: string, existingLogId?: string) => Promise<void>;
  onMeasurableSave: (habitId: string, dateStr: string, value: number, existingLogId?: string) => Promise<void>;
}

export function HabitCell({
  habitId,
  dateStr,
  isMeasurable,
  unit,
  habitName,
  matchedLog,
  onBinaryToggle,
  onMeasurableSave,
}: HabitCellProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  let customClasses = "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700";
  if (matchedLog) {
    customClasses = isMeasurable
      ? "bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900"
      : "bg-emerald-500 dark:bg-emerald-600 text-white border-transparent hover:bg-emerald-600 dark:hover:bg-emerald-700";
  }

  if (isMeasurable) {
    return (
      <Popover 
        open={open} 
        onOpenChange={(v) => {
          setOpen(v);
          if (v) setInputValue(matchedLog ? String(matchedLog.value) : '');
        }}
      >
        <PopoverTrigger asChild>
          <Button variant='ghost' className={`aspect-square h-auto w-full p-0 flex flex-col items-center justify-center rounded-md text-xs font-semibold border transition-all active:scale-95 shadow-none ${customClasses}`}>
            {matchedLog ? (
              <>
                <span className="text-[10px] leading-none">{matchedLog.value}</span>
                <span className="text-[8px] opacity-70 font-normal mt-0.5">{unit}</span>
              </>
            ) : <Minus className="h-3 w-3 opacity-40" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-3 space-y-2 text-sm" side="top" align="center">
          <div className="font-medium text-xs text-zinc-500">Log {habitName}</div>
          <div className="flex gap-2">
            <Input 
              type="number" 
              className="h-8 text-xs" 
              value={inputValue} 
              onChange={(e) => setInputValue(e.target.value)} 
              autoFocus 
            />
            <Button 
              size="sm" 
              className="h-8 text-xs px-2" 
              onClick={async () => {
                const parsed = Number(inputValue);
                if (!isNaN(parsed) && parsed > 0) {
                  await onMeasurableSave(habitId, dateStr, parsed, matchedLog?.id);
                  setOpen(false); // Cleanly shuts down upon completion
                }
              }}
            >
              Save
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Button 
      variant='ghost' 
      onClick={() => onBinaryToggle(habitId, dateStr, matchedLog?.id)} 
      className={`aspect-square h-auto w-full p-0 flex flex-col items-center justify-center rounded-md text-xs font-semibold border transition-all active:scale-95 shadow-none ${customClasses}`}
    >
      {matchedLog ? <Check className="h-4 w-4 stroke-[3]" /> : <Minus className="h-3 w-3 opacity-40" />}
    </Button>
  );
}