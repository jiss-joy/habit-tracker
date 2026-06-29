/* eslint-disable no-console */
import { hashPassword } from 'better-auth/crypto';
import { reset, seed } from 'drizzle-seed';
import { db } from '..';
import { accounts, sessions, users } from '../schemas/auth';
import { habitLogs } from '../schemas/habit-logs';
import { habits } from '../schemas/habits';

async function main() {
  await reset(db, {
    users,
    accounts,
    sessions,
    habits,
    habitLogs,
  });
  console.info('[INFO] Starting seed data generation...');
  const hashedPassword = await hashPassword('Test1234');
  await seed(db, { users, accounts, habits }, { seed: 456 }).refine(f => ({
    users: {
      count: 2,
      columns: {
        email: f.email(),
      },
      with: {
        accounts: 1,
        habits: 2,
      },
    },
    habits: {
      columns: {
        name: f.valuesFromArray({ values: ['Jog', 'Brush', 'Read', 'Paint'], isUnique: true }),
        targetValue: f.valuesFromArray({
          values: [5, 10, 15],
        }),
        isDeleted: f.default({
          defaultValue: 0,
        }),
        lastSyncId: f.int({ isUnique: true, minValue: 0 }),
      },
    },
    accounts: {
      columns: {
        accountId: f.uuid(),
        providerId: f.default({ defaultValue: 'credential' }),
        password: f.default({ defaultValue: hashedPassword }),
        accessToken: f.default({ defaultValue: null }),
        refreshToken: f.default({ defaultValue: null }),
        idToken: f.default({ defaultValue: null }),
        accessTokenExpiresAt: f.default({ defaultValue: null }),
        refreshTokenExpiresAt: f.default({ defaultValue: null }),
        scope: f.default({ defaultValue: null }),
      },
    },
  }));
  console.info('[INFO] Seed data generation complete.');
}

void main().catch((e) => {
  console.error('[ERROR] Seed error:', e);
  process.exit(1);
}).finally(() => {
  process.exit(0);
});
