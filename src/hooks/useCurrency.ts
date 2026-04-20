import { useBusiness } from "@/hooks/useBusiness";

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

const CURRENCY_CONFIGS: Record<string, CurrencyConfig> = {
  NGN: { code: "NGN", symbol: "₦", name: "Nigerian Naira", locale: "en-NG" },
  USD: { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" },
  GBP: { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB" },
  EUR: { code: "EUR", symbol: "€", name: "Euro", locale: "de-DE" },
  GHS: { code: "GHS", symbol: "₵", name: "Ghanaian Cedi", locale: "en-GH" },
  KES: { code: "KES", symbol: "KSh", name: "Kenyan Shilling", locale: "en-KE" },
  ZAR: { code: "ZAR", symbol: "R", name: "South African Rand", locale: "en-ZA" },
};

export function useCurrency() {
  const { data: business } = useBusiness();
  const currencyCode = business?.currency || "NGN";
  const config = CURRENCY_CONFIGS[currencyCode] || CURRENCY_CONFIGS.NGN;

  const formatCurrency = (amount: number, options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }) => {
    return new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency: config.code,
      minimumFractionDigits: options?.minimumFractionDigits ?? 0,
      maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    }).format(amount);
  };

  const formatCompact = (amount: number) => {
    return `${config.symbol}${(amount / 1000).toFixed(0)}k`;
  };

  return {
    currencyCode: config.code,
    currencySymbol: config.symbol,
    currencyName: config.name,
    locale: config.locale,
    formatCurrency,
    formatCompact,
  };
}

// Export list of available currencies for settings dropdown
export const AVAILABLE_CURRENCIES = Object.values(CURRENCY_CONFIGS);
