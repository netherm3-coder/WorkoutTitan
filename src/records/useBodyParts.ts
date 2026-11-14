import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { BODY_PARTS, isBuiltInPart } from '@/domain';

import { useRecords } from './RecordsProvider';

/** A body part as a screen lists it: the built-in ones first, then the person's own. */
export type PartChoice = { id: string; name: string; own: boolean };

/** Every body part there is to measure, and the name of any part a measurement keeps. */
export function useBodyParts(): { parts: PartChoice[]; nameOf: (id: string) => string } {
  const { t } = useTranslation();
  const { bodyParts } = useRecords();

  return useMemo(() => {
    const parts: PartChoice[] = [
      ...BODY_PARTS.map((id) => ({ id, name: t(`body.parts.${id}`), own: false })),
      ...bodyParts.map((part) => ({ ...part, own: true })),
    ];
    const names = new Map(parts.map((part) => [part.id, part.name]));
    // Every measurement on screen has a known part (migration 2 and restoring make sure of it);
    // the id itself is only a fallback.
    const nameOf = (id: string) => names.get(id) ?? (isBuiltInPart(id) ? t(`body.parts.${id}`) : id);
    return { parts, nameOf };
  }, [t, bodyParts]);
}
