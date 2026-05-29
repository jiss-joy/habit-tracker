import { pgEnum } from "drizzle-orm/pg-core";
import { enumToPgEnum } from "../helpers/enum-to-pg-enum";

export enum HabitType {
  BINARY = 'BINARY',
  MEASURABLE = 'MEASURABLE',
}

export const habitTypeEnum = pgEnum('habit_type_enums', enumToPgEnum(HabitType));