import { Ionicons } from '@expo/vector-icons';
import { Tabs, type BottomTabNavigationOptions } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';

import { TabBar } from '@/components';
import { useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
type TabIconProps = Parameters<NonNullable<BottomTabNavigationOptions['tabBarIcon']>>[0];

/** Outline while idle, filled while the tab is open. */
function tabIcon(idle: IconName, active: IconName) {
  return function TabIcon({ focused, color, size }: TabIconProps) {
    // The tab bar always passes a plain colour string; other colour kinds do not apply to icons.
    const iconColor = typeof color === 'string' ? color : undefined;
    return <Ionicons color={iconColor} name={focused ? active : idle} size={size} />;
  };
}

const HomeIcon = tabIcon('bonfire-outline', 'bonfire');
const WorkoutsIcon = tabIcon('barbell-outline', 'barbell');
const BodyIcon = tabIcon('body-outline', 'body');
const AchievementsIcon = tabIcon('trophy-outline', 'trophy');
const SettingsIcon = tabIcon('settings-outline', 'settings');

export default function TabsLayout() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: theme.backdrop.gradient[0] } }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: HomeIcon }} />
      <Tabs.Screen name="workouts" options={{ title: t('tabs.workouts'), tabBarIcon: WorkoutsIcon }} />
      <Tabs.Screen name="body" options={{ title: t('tabs.body'), tabBarIcon: BodyIcon }} />
      <Tabs.Screen
        name="achievements"
        options={{ title: t('tabs.achievements'), tabBarIcon: AchievementsIcon }}
      />
      <Tabs.Screen name="settings" options={{ title: t('tabs.settings'), tabBarIcon: SettingsIcon }} />
    </Tabs>
  );
}
