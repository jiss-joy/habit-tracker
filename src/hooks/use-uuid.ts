import { useCallback } from 'react';
import { v5 as uuid, validate as validateUuid } from 'uuid';

const NAMESPACE = process.env.NEXT_PUBLIC_UUID_NAMESPACE;

/// A custom hook for generating deterministic UUIDs based on a namespace
/// This hook ensures that the namespace is valid and provides a function to generate UUIDs
export function useUuid() {
  // 🛡️ FIX 1 & 2: Validate once at the module level using explicit string checks
  if (NAMESPACE === undefined || NAMESPACE === '') {
    throw new Error(
      '❌ [MISSING CONFIG] \'NEXT_PUBLIC_UUID_NAMESPACE\' is missing from your environment variables.',
    );
  }

  if (!validateUuid(NAMESPACE)) {
    throw new Error(
      `❌ [MISSING CONFIG] 'NEXT_PUBLIC_UUID_NAMESPACE' value ("${NAMESPACE}") is not a valid UUID.`,
    );
  }

  // Use useCallback to keep the function reference stable across renders
  return useCallback((value: string): string => {
    return uuid(value, NAMESPACE);
    // ^ Note: The "!" assertion is no longer needed! TypeScript knows NAMESPACE is a safe string here.
  }, []);
}
