/**
 * Formats large numbers into human-readable format with M/B suffixes
 * @param num - Number to format
 * @returns Formatted string with appropriate suffix (B for billion, M for million)
 * @example
 * formatLargeNumber(1234567) // returns "1.23M"
 * formatLargeNumber(1234567890) // returns "1.23B"
 */
export const formatLargeNumber = (num: number): string => {
  if (num >= 1e9) {
    return `${(num / 1e9).toFixed(2)}B`;
  } else if (num >= 1e6) {
    return `${(num / 1e6).toFixed(2)}M`;
  } else {
    return num.toFixed(2);
  }
};
