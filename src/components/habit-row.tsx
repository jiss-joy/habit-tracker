'use client';

import { Habit } from "../dexie/habit";
import { HabitType } from "../db/enums/habit-type";
import { Button } from "./shadcn/button";
import { HabitCell } from "./habit-cell";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./shadcn/dropdown-menu";
import { MoreVertical, Edit2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface HabitRowProps {
  habit: Habit;
  timeline: Array<{ dateStr: string; label: string }>;
  logs: Array<{ id: string; habitId: string; logDate: string; value: number }>;
  onEditClick: (habit: Habit) => void;
  onDeleteClick: (habitId: string) => void;
  onBinaryToggle: (habitId: string, dateStr: string, existingLogId?: string) => Promise<void>;
  onMeasurableSave: (habitId: string, dateStr: string, value: number, existingLogId?: string) => Promise<void>;
}

export function HabitRow({
  habit,
  timeline,
  logs,
  onEditClick,
  onDeleteClick,
  onBinaryToggle,
  onMeasurableSave,
}: HabitRowProps) {
  const isMeasurable = habit.type === HabitType.MEASURABLE;

  const [isSyncing, setIsSyncing] = useState(false);

  // Tracks the timestamp token so we only flash when the server pushes a real change
  const prevUpdatedAtRef = useRef(habit.updatedAt?.toString());

  useEffect(() => {
    const currentSyncToken = habit.updatedAt?.toString();

    if (prevUpdatedAtRef.current && prevUpdatedAtRef.current !== currentSyncToken) {
      setIsSyncing(true);
    }
    prevUpdatedAtRef.current = currentSyncToken;
  }, [habit.updatedAt]);

  return (
    <div
      onAnimationEnd={() => setIsSyncing(false)}
      className={`flex items-center justify-between p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/50 
          hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors group 
          ${isSyncing ? "animate-sync-flash bg-amber-500/10 border-amber-500/40 dark:bg-amber-500/5 dark:border-amber-500/30" : ""}`
      }>

      {/* Left Column Profile details */}
      <div className="w-1/3 pr-4 flex items-center justify-between gap-2">
        <div className="truncate">
          <h3 className="text-sm font-semibold truncate text-zinc-800 dark:text-zinc-200">{habit.name}</h3>
          <p className="text-xs text-zinc-400 truncate mt-0.5">
            {isMeasurable ? `Goal: ${habit.targetValue} ${habit.unit}` : habit.description || 'Binary tracking'}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity rounded-md shrink-0">
              <MoreVertical className="h-4 w-4 text-zinc-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={() => onEditClick(habit)} className="gap-2 cursor-pointer">
              <Edit2 className="h-3.5 w-3.5" /> Edit Habit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDeleteClick(habit.id)} className="text-red-600 focus:text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/30 gap-2 cursor-pointer">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right Column Matrix Target Columns */}
      <div className="w-2/3 grid grid-cols-10 gap-2">
        {timeline.map((day) => {
          const matchedLog = logs.find(
            l => l.habitId === habit.id && l.logDate === day.dateStr && l.value > 0
          );
          return (
            <HabitCell
              key={day.dateStr}
              habitId={habit.id}
              dateStr={day.dateStr}
              isMeasurable={isMeasurable}
              unit={habit.unit}
              habitName={habit.name}
              matchedLog={matchedLog}
              onBinaryToggle={onBinaryToggle}
              onMeasurableSave={onMeasurableSave}
            />
          );
        })}
      </div>
    </div>
  );
}