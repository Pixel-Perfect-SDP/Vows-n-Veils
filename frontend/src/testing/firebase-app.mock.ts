export type FirebaseApp = any;
export const __app: FirebaseApp = {} as any;

export const __spies = {
  getApps: () => [] as any[],
  initializeApp: (_cfg?: any) => __app,
  getApp: () => __app,
};

export function getApps() { return __spies.getApps(); }
export function initializeApp(cfg?: any) { return __spies.initializeApp(cfg); }
export function getApp() { return __spies.getApp(); }
