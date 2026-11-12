import type { Language } from '@/i18n';

/** Ukrainian writes decimals with a comma, English with a point. */
const DECIMAL_MARK: Record<Language, string> = { uk: ',', en: '.' };

/**
 * A number the way the language writes it, with no more decimals than it needs:
 * 12, 7.5, 82.25. Rounded to two decimals.
 */
export function formatNumber(value: number, language: Language): string {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded).replace('.', DECIMAL_MARK[language]);
}

/**
 * Reads what a person typed into a number field. Both decimal marks are accepted whatever the
 * language, because phone keyboards differ. `null` for anything that is not a plain number.
 */
export function parseDecimal(text: string): number | null {
  const cleaned = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;

  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}
