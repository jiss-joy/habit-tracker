/**
 * Converts an enum object to a Postgres enum.
 * @param enumObject - The enum object to convert.
 * @returns readonly [string, ...string[]] - The Postgres enum.
 */
export function enumToPgEnum(enumObject: Record<string, string>): readonly [string, ...string[]] {
  return Object.values(enumObject).map((obj) => obj) as [string, ...string[]];
}