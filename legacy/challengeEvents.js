const listeners = {};

// Subscribe to events
export const onChallengeEvent = (event, callback) => {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(callback);

  // unsubscribe function
  return () => {
    listeners[event] = listeners[event].filter(cb => cb !== callback);
  };
};

// Emit events globally
export const emitChallengeEvent = (event, data) => {
  (listeners[event] || []).forEach(cb => cb(data));
};