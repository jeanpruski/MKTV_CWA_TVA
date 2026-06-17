export const TAX_RATE_MAPPING = {
  VAT_0: '117639290',
  VAT_3: '117639291',
  VAT_8_5: '117706428',
  VAT_17: '117639292',
  VAT_20: '117639303',
  VAT_21: '117706425'
} as const;

export const TAX_RATE_LABEL_BY_KEY: Record<keyof typeof TAX_RATE_MAPPING, string> = {
  VAT_0: 'TVA 0%',
  VAT_3: 'TVA 3%',
  VAT_8_5: 'TVA 8.5%',
  VAT_17: 'TVA 17%',
  VAT_20: 'TVA 20%',
  VAT_21: 'TVA 21%'
};

export type TaxRateKey = keyof typeof TAX_RATE_MAPPING;

export function getTaxRateGroupId(key: string): string | undefined {
  return (TAX_RATE_MAPPING as Record<string, string>)[key];
}
