import { pgSequence } from 'drizzle-orm/pg-core';

export const syncSequence = pgSequence('sync_sequence', {
  startWith: 1,
  increment: 1,
});
