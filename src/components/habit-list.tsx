'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { Card } from '../components/shadcn/card'; // ⚡ Importing shadcn Card
import { useDexieDb } from '../contexts/dexie-context';
import { getDexieDb } from '../dexie/db';
import { useHabitActions } from '../hooks/use-habit-actions';
import { generatePastNDays } from '../utils/date-helpers';
import { HabitRow } from './habit-row';

export const HabitList = () => {
  const MOCK_USER = '00000000-0000-0000-0000-000000000000';
  const db = useDexieDb();

  const habits = useLiveQuery(async () =>
    db.habits.toArray().then(rows => rows.filter(habit => habit.isDeleted !== 1)),
  );
  const logs = useLiveQuery(async () =>
    db.habitLogs.where('userId').equals(MOCK_USER).toArray(),
  );

  const timeline = generatePastNDays(10);
  const { deleteHabit, toggleBinaryLog, saveMeasurableLog } = useHabitActions(MOCK_USER);

  // ⏳ 2. Premium Skeleton Loading State (Prevents layout jumping)
  if (habits === undefined || logs === undefined) {
    return (
      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-4">
        <div className="h-6 w-1/4 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-md" />
        <div className="space-y-3">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-14 w-full bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  // 📭 3. Shadcn Styled Empty State
  if (habits.length === 0) {
    return (
      <Card className="text-center py-16 border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 rounded-xl">
        <span className="text-2xl block mb-2">🎯</span>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200">No active tracking metrics</p>
        <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
          Create a routine item above to establish your multi-day execution array.
        </p>
      </Card>
    );
  }

  // 🗓️ 4. The Unified Production Tracking Matrix
  return (
    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-x-auto">
      <div className="min-w-[768px] p-6 space-y-4">

        {/* Header Timeline Row Layout */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-900">
          <div className="w-1/3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Habit Profile
            </span>
          </div>

          <div className="w-2/3 grid grid-cols-10 gap-2 text-center">
            {timeline.map(day => (
              <div key={day.dateStr} className="space-y-1">
                <div className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
                  {day.label}
                </div>
                <div className="text-[10px] text-zinc-500 font-mono tracking-tighter">
                  {day.dateStr.split('-')[2]}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Matrix Rows */}
        <div className="space-y-2.5">
          {habits.map(habit => (
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
    </Card>
  );
};
