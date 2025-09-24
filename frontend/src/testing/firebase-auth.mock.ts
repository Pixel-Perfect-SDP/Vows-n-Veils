export type User = any;
export type Auth = { currentUser: User | null };
export const browserLocalPersistence = {} as any;

export class GoogleAuthProvider {
  setCustomParameters(_: any) {}
}

export const __state = { auth: { currentUser: null } as Auth };

export const __spies = {
  getAuth: (_app?: any): Auth => __state.auth,
  setPersistence: (_auth: any, _p: any): Promise<any> => Promise.resolve(),
  onAuthStateChanged: (_auth: any, cb: (u: any) => void): (() => void) => { __spies.__onAuthCb = cb; return () => {}; },
  __onAuthCb: (_u: any) => {},
  signInWithEmailAndPassword: (_a: any, email: string, _p: string): Promise<any> =>
    Promise.resolve({ user: { uid: 'u1', email, displayName: 'U One', photoURL: 'p.jpg' } }),
  createUserWithEmailAndPassword: (_a: any, email: string, _p: string): Promise<any> =>
    Promise.resolve({ user: { uid: 'u1', email, displayName: 'U One', photoURL: 'p.jpg' } }),
  signOut: (_a: any): Promise<any> => Promise.resolve(),
  sendEmailVerification: (_user: any): Promise<any> => Promise.resolve(),
  sendPasswordResetEmail: (_a: any, _e: string): Promise<any> => Promise.resolve(),
  updateProfile: (_user: any, _data: any): Promise<any> => Promise.resolve(),
  signInWithPopup: (_a: any, _p: any): Promise<any> =>
    Promise.resolve({ user: { uid: 'u1', email: 'u1@mail.test', displayName: 'U One', photoURL: 'p.jpg' } }),
  signInWithRedirect: (_a: any, _p: any): Promise<any> => Promise.resolve(undefined),
  getAdditionalUserInfo: (_r: any): any => ({ isNewUser: true }),
  fetchSignInMethodsForEmail: (_a: any, _e: string): Promise<any> => Promise.resolve(['password', 'google']),
  linkWithPopup: (_u: any, _p: any): Promise<any> =>
    Promise.resolve({ user: { uid: 'u2', displayName: 'Linked', photoURL: 'linked.jpg' } }),
};

export function getAuth(app?: any): any { return __spies.getAuth(app); }
export function setPersistence(auth: any, p: any): any { return __spies.setPersistence(auth, p); }
export function onAuthStateChanged(auth: any, cb: (u: any) => void): any { return __spies.onAuthStateChanged(auth, cb); }
export function signInWithEmailAndPassword(a: any, e: string, p: string): any { return __spies.signInWithEmailAndPassword(a, e, p); }
export function createUserWithEmailAndPassword(a: any, e: string, p: string): any { return __spies.createUserWithEmailAndPassword(a, e, p); }
export function signOut(a: any): any { return __spies.signOut(a); }
export function sendEmailVerification(user: any): any { return __spies.sendEmailVerification(user); }
export function sendPasswordResetEmail(a: any, e: string): any { return __spies.sendPasswordResetEmail(a, e); }
export function updateProfile(u: any, d: any): any { return __spies.updateProfile(u, d); }
export function signInWithPopup(a: any, p: any): any { return __spies.signInWithPopup(a, p); }
export function signInWithRedirect(a: any, p: any): any { return __spies.signInWithRedirect(a, p); }
export function getAdditionalUserInfo(r: any): any { return __spies.getAdditionalUserInfo(r); }
export function fetchSignInMethodsForEmail(a: any, e: string): any { return __spies.fetchSignInMethodsForEmail(a, e); }
export function linkWithPopup(u: any, p: any): any { return __spies.linkWithPopup(u, p); }
