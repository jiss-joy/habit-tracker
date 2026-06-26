import { useMemo } from "react";
import { validate as validateUuid, v5 as uuid } from "uuid";

const NAMESPACE = process.env.NEXT_PUBLIC_UUID_NAMESPACE;

/// A custom hook for generating deterministic UUIDs based on a namespace
/// This hook ensures that the namespace is valid and provides a function to generate UUIDs
export function useUuid() {
  // 🛡️ Validate the environment configuration once on initialization
  useMemo(() => {
    if (!NAMESPACE) {
      throw new Error(
        "❌ [MISSING CONFIG] 'NEXT_PUBLIC_UUID_NAMESPACE' is missing from your environment variables."
      );
    }

    if (!validateUuid(NAMESPACE)) {
      throw new Error(
        `❌ [MISSING CONFIG] 'NEXT_PUBLIC_UUID_NAMESPACE' value ("${NAMESPACE}") is not a valid UUID.`
      );
    }
  }, []);

  return (value: string): string => {
    return uuid(value, NAMESPACE!);
  };
}