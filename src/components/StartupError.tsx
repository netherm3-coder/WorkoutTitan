import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';
import { Screen } from './Screen';

export type StartupErrorProps = {
  title: string;
  /** What happened and what the person can do about it, in plain words. */
  body: string;
  /** The error as the system reported it, for whoever is asked for help. */
  details?: string;
  /** Leave the action out when trying again cannot help. */
  action?: { label: string; onPress: () => void; busy?: boolean };
};

/** Shown instead of the app when it cannot start, so the person is not left with a blank screen. */
export function StartupError({ title, body, details, action }: StartupErrorProps) {
  return (
    <Screen title={title}>
      <Card>
        <View style={styles.text}>
          <AppText>{body}</AppText>
          {details ? (
            <AppText color="muted" selectable variant="caption">
              {details}
            </AppText>
          ) : null}
        </View>
      </Card>

      {action ? <Button disabled={action.busy} label={action.label} onPress={action.onPress} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  text: {
    gap: spacing.md,
  },
});
