'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/src/db';
import { accounts, users } from '@/src/db/schemas/auth';

export async function getRandomDevUser() {
  const userRes = await db
    .select({ email: users.email, password: accounts.password })
    .from(users)
    .innerJoin(accounts, eq(accounts.userId, users.id))
    .limit(1);

  return userRes[0] || null;
}
