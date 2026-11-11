import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing, useForeground } from '@/theme';

import { AppText } from './AppText';

export type EmptyStateProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
};

/** What a section shows before there is any data in it. Place it inside a `Card`. */
export function EmptyState({ icon, title, body }: EmptyStateProps) {
  const foreground = useForeground();

  return (
    <View style={styles.row}>
      <Ionicons color={foreground.accent} name={icon} size={32} style={styles.icon} />
      <View style={styles.text}>
        <AppText variant="heading">{title}</AppText>
        <AppText color="muted">{body}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  icon: {
    marginTop: 2,
  },
  text: {
    flex: 1,
    gap: spacing.xs,
  },
});
