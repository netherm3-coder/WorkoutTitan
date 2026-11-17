/* global jest */
// AsyncStorage is a native module; tests get its official in-memory stand-in.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The database is native too. Tests get a real SQLite database in memory with the app's layout;
// see src/db/__mocks__/open.ts.
jest.mock('./src/db/open');

// So is the billing library. Unless a test hands in a fake store, the app runs as in Expo Go,
// with nothing to buy.
jest.mock('./src/purchases/createStore', () => ({ createPurchaseStore: jest.fn(() => null) }));

// Progress photos are files kept by a native module, picked through the system's photo picker.
// Tests get the files in memory (src/photos/__mocks__/files.ts) and a picker that hands over
// whatever a test asks for, nothing by default.
jest.mock('./src/photos/files');
jest.mock('./src/photos/pick', () => ({ MAX_PICKED: 10, pickPhotos: jest.fn(async () => []) }));
