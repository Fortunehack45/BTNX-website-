/**
 * Utility to convert USD amounts to Nigerian Naira (₦)
 * using an exchange rate of 1 USD = ₦1,500.
 */
export function formatNaira(usdAmount: number): string {
  if (typeof usdAmount !== "number" || isNaN(usdAmount)) {
    return "₦0";
  }
  const nairaAmount = Math.round(usdAmount * 1500);
  return "₦" + nairaAmount.toLocaleString("en-NG");
}
