'use client';

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../dexie/db";
import { generatePastNDays } from "../lib/date-helpers";
import { useHabitActions } from "../hooks/use-habit-actions";
import { HabitRow } from "./habit-row";

export const HabitList = () => {
  const MOCK_USER = 'test-user-id';

  const habits = useLiveQuery(() => db.habits.toArray());
  const logs = useLiveQuery(() => db.habitLogs.where('userId').equals(MOCK_USER).toArray());

  const timeline = generatePastNDays(10);
  const { deleteHabit, toggleBinaryLog, saveMeasurableLog } = useHabitActions(MOCK_USER);

  if (habits === undefined || logs === undefined) {
    return <div className="text-sm text-zinc-400">Initializing local engine...</div>;
  }

  if (habits.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900">
        <p className="text-sm text-zinc-500">No active habits. Create one above to establish tracking arrays.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-x-auto">
      <div className="min-w-[768px] p-6 space-y-4">
        
        {/* Header Timeline Row Layout */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800/60">
          <div className="w-1/3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Habit Profile</span>
          </div>
          
          <div className="w-2/3 grid grid-cols-10 gap-2 text-center">
            {timeline.map((day) => (
              <div key={day.dateStr} className="space-y-1">
                <div className="text-xs font-medium text-zinc-400">{day.label}</div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  {day.dateStr.split('-')[2]}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Rows */}
        <div className="space-y-3">
          {habits.map((habit) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              timeline={timeline}
              logs={logs}
              onDeleteClick={deleteHabit}
              onBinaryToggle={toggleBinaryLog}
              onMeasurableSave={saveMeasurableLog}
              onEditClick={(habit) => {}}
            />
          ))}
        </div>

      </div>
    </div>
  );
};