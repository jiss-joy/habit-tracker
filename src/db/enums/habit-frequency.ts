import { pgEnum } from "drizzle-orm/pg-core";
import { enumToPgEnum } from "../helpers/enum-to-pg-enum";

export enum HabitFrequencies {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export const habitFrequencyEnum = pgEnum('habit_frequency_enums', enumToPgEnum(HabitFrequencies));