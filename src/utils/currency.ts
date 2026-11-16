/**
 * Utility to format amounts in Nigerian Naira (₦).
 * Automatically handles both raw Naira values (> 1,000) and legacy USD values (<= 1,000)
 * at the standardized atelier rate of 1 USD = ₦1,500.
 */
export function toNaira(amount: number): number {
  if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
    return 0;
  }
  // If amount is less than or equal to 1,000, it is a legacy USD price; convert to Naira
  if (amount <= 1000) {
    return Math.round(amount * 1500);
  }
  return Math.round(amount);
}

export function formatNaira(amount: number): string {
  if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
    return "₦0";
  }
  const naira = toNaira(amount);
  return "₦" + naira.toLocaleString("en-NG");
}

