/**
 * Get array indices (0-based) that match the given prefix when converted to display indices (1-based).
 *
 * @param totalChecks - Total number of checks
 * @param prefix - The digit string to match (e.g., "1", "12")
 * @returns Array of 0-based indices where (index+1).toString() starts with prefix
 *
 * @example
 * getMatchedIndices(25, "1")  // Returns [0, 9, 10, ..., 18] (checks 1, 10-19)
 * getMatchedIndices(25, "12") // Returns [11] (check 12)
 * getMatchedIndices(5, "9")   // Returns [] (no check 9)
 */
export function getMatchedIndices(
  totalChecks: number,
  prefix: string,
): number[] {
  return Array.from({ length: totalChecks }, (_, i) => i).filter((i) =>
    (i + 1).toString().startsWith(prefix),
  );
}
