import { Text, type TextProps, type TextStyle } from 'react-native';

import { typeScale, useForeground, useTheme, useTone, type Foreground, type TextVariant } from '@/theme';

type FontRole = 'regular' | 'medium' | 'bold';

const FONT_ROLE: Record<TextVariant, FontRole> = {
  display: 'bold',
  title: 'bold',
  heading: 'bold',
  body: 'regular',
  label: 'medium',
  caption: 'regular',
};

const DEFAULT_COLOR: Record<TextVariant, keyof Foreground> = {
  display: 'heading',
  title: 'heading',
  heading: 'heading',
  body: 'text',
  label: 'text',
  caption: 'muted',
};

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  /** Colour role; resolved against the card or backdrop the text sits on. */
  color?: keyof Foreground;
  /** Semi-bold face for emphasis inside body text. */
  strong?: boolean;
  align?: TextStyle['textAlign'];
};

/**
 * The only text component screens should use: it applies the skin's font and picks a colour
 * that is readable on whatever surface surrounds it.
 */
export function AppText({ variant = 'body', color, strong = false, align, style, ...rest }: AppTextProps) {
  const { theme } = useTheme();
  const foreground = useForeground();
  const tone = useTone();

  const fontRole: FontRole = strong && FONT_ROLE[variant] === 'regular' ? 'medium' : FONT_ROLE[variant];
  const shadow = variant === 'display' && tone === 'backdrop' ? theme.titleShadow : null;

  return (
    <Text
      accessibilityRole={variant === 'display' || variant === 'title' ? 'header' : undefined}
      {...rest}
      style={[
        typeScale[variant],
        {
          fontFamily: theme.fonts[fontRole],
          color: foreground[color ?? DEFAULT_COLOR[variant]],
          textAlign: align,
        },
        shadow && {
          textShadowColor: shadow.color,
          textShadowOffset: { width: shadow.offsetX, height: shadow.offsetY },
          textShadowRadius: shadow.radius,
        },
        style,
      ]}
    />
  );
}
