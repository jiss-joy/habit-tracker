"use client";

import { useEffect, useState, useRef } from "react";
import { Card } from "../components/shadcn/card";
import { Button } from "../components/shadcn/button"; // Assuming you have shadcn button installed
import { Check, Trash2 } from "lucide-react"; // Shadcn default icon library

type Habit = {
  id: string;
  name: string;
  streak: number;
  isDeleted: number;
};

interface HabitCardProps {
  habit: Habit;
  onIncrement: (id: string) => void;
  onDelete: (id: string) => void;
}

export function HabitCard({ habit, onIncrement, onDelete }: HabitCardProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Track values to ensure we only animate background sync modifications
  const prevStreakRef = useRef(habit.streak);
  const prevNameRef = useRef(habit.name);

  useEffect(() => {
    // Intercept cloud data updates arriving over the wire
    if (prevStreakRef.current !== habit.streak || prevNameRef.current !== habit.name) {
      setIsSyncing(true);
      
      prevStreakRef.current = habit.streak;
      prevNameRef.current = habit.name;
    }
  }, [habit.streak, habit.name]);

  return (
    <Card
      onAnimationEnd={() => setIsSyncing(false)}
      className={`p-5 flex items-center justify-between transition-all duration-300 shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 ${
        isSyncing 
          ? "animate-sync-flash" 
          : ""
      }`}
    >
      {/* Habit Details */}
      <div className="flex flex-col gap-1.5">
        <span className="font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
          {habit.name}
        </span>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-800/50">
            🔥 {habit.streak} day streak
          </span>
        </div>
      </div>

      {/* Action Tray */}
      <div className="flex items-center gap-2">
        {/* Checkmark Completion Button */}
        <Button
          size="icon"
          variant="default"
          onClick={() => {
            // Optimistically update ref so local clicks skip the flash loop
            prevStreakRef.current = habit.streak + 1;
            onIncrement(habit.id);
          }}
          className="h-9 w-9 bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-sm"
        >
          <Check className="h-4 w-4 stroke-[3]" />
        </Button>

        {/* Soft Delete Tombstone Button */}
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onDelete(habit.id)}
          className="h-9 w-9 text-zinc-400 hover:text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 transition-colors"
          title="Delete Habit"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}