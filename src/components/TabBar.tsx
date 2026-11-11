import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useContext } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { minTouchTarget, radii, spacing, typeScale, useTheme } from '@/theme';
import { withAlpha } from '@/theme/color';

const ICON_SIZE = 24;

/**
 * The bottom tab bar. Only the current tab shows its name, inside a tinted pill; the others are
 * icons. Five full labels do not fit on a narrow phone in Ukrainian, and this keeps every label
 * whole instead of shrinking or cutting it.
 */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { theme } = useTheme();
  const reportHeight = useContext(BottomTabBarHeightCallbackContext);

  return (
    <View
      onLayout={(event) => reportHeight?.(event.nativeEvent.layout.height)}
      style={[
        styles.bar,
        {
          backgroundColor: theme.tabBar.background,
          borderTopColor: theme.tabBar.border,
          paddingBottom: insets.bottom + spacing.sm,
          paddingLeft: insets.left + spacing.md,
          paddingRight: insets.right + spacing.md,
        },
      ]}
    >
      <View role="tablist" style={styles.row}>
        {state.routes.map((route, index) => {
          const descriptor = descriptors[route.key];
          if (!descriptor) return null;

          const { options } = descriptor;
          const focused = index === state.index;
          const label = options.title ?? route.name;
          const color = focused ? theme.tabBar.active : theme.tabBar.inactive;

          const onPress = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigateToTab(route.key);
            }
          };

          const onLongPress = () => {
            emitter.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityLabel={label}
              aria-selected={focused}
              // iOS screen readers do not announce the "tab" role reliably.
              role={Platform.OS === 'ios' ? 'button' : 'tab'}
              onLongPress={onLongPress}
              onPress={onPress}
              style={({ pressed }) => [
                styles.item,
                focused
                  ? [styles.itemFocused, { backgroundColor: withAlpha(theme.tabBar.active, 0.16) }]
                  : styles.itemIdle,
                pressed && styles.pressed,
              ]}
            >
              {options.tabBarIcon?.({ focused, color, size: ICON_SIZE })}
              {focused ? (
                <Text
                  maxFontSizeMultiplier={1.2}
                  numberOfLines={1}
                  style={[styles.label, { color, fontFamily: theme.fonts.medium }]}
                >
                  {label}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  item: {
    minHeight: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
  },
  // Idle tabs share the space the focused tab leaves.
  itemIdle: {
    flex: 1,
  },
  // The focused tab is as wide as its name needs, and gives way only when the screen is too small.
  itemFocused: {
    flexShrink: 1,
    paddingHorizontal: spacing.lg,
  },
  label: {
    ...typeScale.label,
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});
