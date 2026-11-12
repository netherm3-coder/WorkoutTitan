import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { useForeground, type Foreground } from '@/theme';

export type IconProps = {
  name: ComponentProps<typeof Ionicons>['name'];
  color?: keyof Foreground;
  size?: number;
};

/**
 * An icon in the colours of the surface it sits on. A screen that asks for
 * colours itself gets the backdrop's, which do not suit every card.
 */
export function Icon({ name, color = 'muted', size = 20 }: IconProps) {
  const foreground = useForeground();

  return <Ionicons color={foreground[color]} name={name} size={size} />;
}
