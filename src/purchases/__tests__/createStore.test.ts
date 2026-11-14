import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import type * as CreateStore from '../createStore';

// The setup file stands a fake in for this module; here the real one is under test.
const { createPurchaseStore } = jest.requireActual<typeof CreateStore>('../createStore');

afterEach(() => {
  jest.restoreAllMocks();
});

describe('the store of a build', () => {
  it('is Google Play in a build of the app for Android', () => {
    jest.replaceProperty(Constants, 'executionEnvironment', ExecutionEnvironment.Standalone);
    expect(createPurchaseStore()).toEqual(expect.objectContaining({ connect: expect.any(Function), buy: expect.any(Function) }));

    jest.replaceProperty(Constants, 'executionEnvironment', ExecutionEnvironment.Bare);
    expect(createPurchaseStore()).not.toBeNull();
  });

  it('is none in Expo Go, which has no billing in it', () => {
    jest.replaceProperty(Constants, 'executionEnvironment', ExecutionEnvironment.StoreClient);
    expect(createPurchaseStore()).toBeNull();
  });

  it('is none on iOS until the app is in the App Store', () => {
    jest.replaceProperty(Constants, 'executionEnvironment', ExecutionEnvironment.Standalone);
    jest.replaceProperty(Platform, 'OS', 'ios');
    expect(createPurchaseStore()).toBeNull();
  });
});
