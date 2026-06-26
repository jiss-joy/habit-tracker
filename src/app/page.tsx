import { AddHabitDialog } from "../components/add-habit-button";
import { HabitList } from "../components/habit-list";
import { SyncStatusBar } from "../components/sync-button";

export default function HabitDashboard() {
  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-black p-8 text-zinc-900 dark:text-zinc-100 font-sans">
      <main className="w-full max-w-5xl mx-auto space-y-6">
        
        {/* Header - Static, loads instantly via SSR */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Habits</h1>
            <p className="text-sm text-zinc-500">Consistent daily execution.</p>
          </div>
          {/* We will add the Add Habit trigger component here next */}
          <AddHabitDialog />
        </div>

        {/* Dynamic Data Region */}
        <HabitList />
        <SyncStatusBar/>

      </main>
    </div>
  );
}