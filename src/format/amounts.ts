import type { TFunction } from 'i18next';

import type { Language } from '@/i18n';

import { formatNumber, roundTo } from './numbers';
import { decimalsOf, lengthIn, weightIn, type LengthUnit, type WeightUnit } from './units';

/*
 * Weights and lengths in the unit the person chose. In Ukrainian a pound or an inch after a
 * number declines (1 фунт, 2 фунти, 5 фунтів, 1,5 фунта), so the plural form is picked from the
 * number as it is shown, after rounding: 0.9999 shown as "1" is "1 фунт".
 */

/** "82,5 кг", "181,9 фунта", "181.9 lb". */
export function formatWeight(kg: number, unit: WeightUnit, t: TFunction, language: Language): string {
  const shown = roundTo(weightIn(kg, unit), decimalsOf(unit));
  const value = formatNumber(shown, language, decimalsOf(unit));
  return unit === 'kg' ? t('units.kgValue', { value }) : t('units.lbValue', { value, count: shown });
}

/** "81 см", "31,9 дюйма", "31.9 in". */
export function formatLength(cm: number, unit: LengthUnit, t: TFunction, language: Language): string {
  const shown = roundTo(lengthIn(cm, unit), decimalsOf(unit));
  const value = formatNumber(shown, language, decimalsOf(unit));
  return unit === 'cm' ? t('units.cmValue', { value }) : t('units.inValue', { value, count: shown });
}

/** A stored weight as it goes into a field: the number alone, in the chosen unit. */
export function weightField(kg: number, unit: WeightUnit, language: Language): string {
  return formatNumber(weightIn(kg, unit), language, decimalsOf(unit));
}

/** A stored length as it goes into a field: the number alone, in the chosen unit. */
export function lengthField(cm: number, unit: LengthUnit, language: Language): string {
  return formatNumber(lengthIn(cm, unit), language, decimalsOf(unit));
}
