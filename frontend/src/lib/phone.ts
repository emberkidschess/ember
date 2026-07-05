/**
 * Phone number handling for every country this academy serves: US, Canada,
 * India, and the six GCC countries (Saudi Arabia, UAE, Qatar, Kuwait,
 * Bahrain, Oman). Mirrors backend/src/utils/phoneValidation.ts - keep the
 * digit-length/pattern rules in sync with that file.
 */

export type SupportedCountry = "US" | "CA" | "IN" | "SA" | "AE" | "QA" | "KW" | "BH" | "OM";

interface CountryPhoneRule {
  nationalLength: number;
  pattern: RegExp;
}

const COUNTRY_PHONE_RULES: Record<SupportedCountry, CountryPhoneRule> = {
  US: { nationalLength: 10, pattern: /^[2-9]\d{2}[2-9]\d{6}$/ },
  CA: { nationalLength: 10, pattern: /^[2-9]\d{2}[2-9]\d{6}$/ },
  IN: { nationalLength: 10, pattern: /^[6-9]\d{9}$/ },
  SA: { nationalLength: 9, pattern: /^5\d{8}$/ },
  AE: { nationalLength: 9, pattern: /^5\d{8}$/ },
  QA: { nationalLength: 8, pattern: /^[3567]\d{7}$/ },
  KW: { nationalLength: 8, pattern: /^[569]\d{7}$/ },
  BH: { nationalLength: 8, pattern: /^[36]\d{7}$/ },
  OM: { nationalLength: 8, pattern: /^[79]\d{7}$/ },
};

export const COUNTRY_OPTIONS: { code: SupportedCountry; label: string; flag: string; dialCode: string }[] = [
  { code: "US", label: "United States", flag: "🇺🇸", dialCode: "+1" },
  { code: "CA", label: "Canada", flag: "🇨🇦", dialCode: "+1" },
  { code: "IN", label: "India", flag: "🇮🇳", dialCode: "+91" },
  { code: "SA", label: "Saudi Arabia", flag: "🇸🇦", dialCode: "+966" },
  { code: "AE", label: "United Arab Emirates", flag: "🇦🇪", dialCode: "+971" },
  { code: "QA", label: "Qatar", flag: "🇶🇦", dialCode: "+974" },
  { code: "KW", label: "Kuwait", flag: "🇰🇼", dialCode: "+965" },
  { code: "BH", label: "Bahrain", flag: "🇧🇭", dialCode: "+973" },
  { code: "OM", label: "Oman", flag: "🇴🇲", dialCode: "+968" },
];

/** Strips everything except digits. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Formats raw digits into a readable display format as the user types,
 * grouped in a generic "every 3-4 digits" pattern that reads naturally for
 * any of the supported national number lengths (8, 9, or 10 digits).
 * Example for a 10-digit number: "5551234567" -> "555 123 4567"
 */
export function formatPhoneInput(rawValue: string, country: SupportedCountry = "US"): string {
  const maxLength = COUNTRY_PHONE_RULES[country]?.nationalLength ?? 10;
  const digits = digitsOnly(rawValue).slice(0, maxLength);

  if (digits.length === 0) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

/** True if the input is a valid national number for the given country. */
export function isValidPhoneForCountry(rawValue: string, country: SupportedCountry): boolean {
  const rule = COUNTRY_PHONE_RULES[country];
  if (!rule) return false;
  const digits = digitsOnly(rawValue);
  return digits.length === rule.nationalLength && rule.pattern.test(digits);
}

/** Combines country dial code + national number into E.164 format for storage, e.g. "+15551234567" */
export function toE164(rawValue: string, country: SupportedCountry = "US"): string {
  const option = COUNTRY_OPTIONS.find((c) => c.code === country);
  const maxLength = COUNTRY_PHONE_RULES[country]?.nationalLength ?? 10;
  const digits = digitsOnly(rawValue).slice(0, maxLength);
  return `${option?.dialCode || "+1"}${digits}`;
}

/** Placeholder text showing the expected format for a country, e.g. "555 123 4567". */
export function placeholderForCountry(country: SupportedCountry): string {
  const length = COUNTRY_PHONE_RULES[country]?.nationalLength ?? 10;
  return formatPhoneInput("5".repeat(length), country);
}
