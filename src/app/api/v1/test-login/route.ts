import { db } from '@/src/db';
import { users } from '@/src/db/schemas/auth';

export async function POST() {
  return db.select().from(users).limit(1);
}
