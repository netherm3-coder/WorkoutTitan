import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { createPlayStore } from './playStore';
import type { PurchaseStore } from './store';

/**
 * The store this build sells through, or `null` when it has none. Only a build of the app for
 * Android has one. Expo Go lacks the billing module, so it gets none; iOS waits for an App
 * Store account. The web build has a file of its own and never loads the billing library.
 */
export function createPurchaseStore(): PurchaseStore | null {
  if (Platform.OS !== 'android') return null;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  return createPlayStore();
}
