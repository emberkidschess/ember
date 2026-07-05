const CURRENCY_LOCALE: Record<string, string> = {
  USD: "en-US",
  CAD: "en-CA",
  INR: "en-IN",
  SAR: "ar-SA",
  AED: "ar-AE",
  QAR: "ar-QA",
  KWD: "ar-KW",
  BHD: "ar-BH",
  OMR: "ar-OM",
};

/** Formats an amount with its currency symbol, e.g. formatCurrency(1500, "USD") -> "$1,500" */
export function formatCurrency(amount: number, currency: string = "USD"): string {
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE[currency] || "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}
