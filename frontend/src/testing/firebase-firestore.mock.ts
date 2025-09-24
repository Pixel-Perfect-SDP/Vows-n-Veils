export type Firestore = any;
export type DocumentData = any;
export type DocumentSnapshot<T = any> = any;

export const __db: any = {};
export const __spies = {
  getFirestore: (_app?: any): any => __db,
  doc: (_db: any, collOrRef: any, id?: string): any => ({ coll: collOrRef, id }),
  setDoc: (_ref: any, _data: any, _opts?: any): Promise<any> => Promise.resolve(),
  serverTimestamp: (): any => ({ __stamp: true }),

  // Collections & queries (minimal shapes to satisfy app code)
  collection: (_db: any, path: string): any => ({ path }),
  addDoc: (_colRef: any, _data: any): Promise<any> => Promise.resolve({ id: 'new-id' }),
  getDoc: (_docRef: any): Promise<any> =>
    Promise.resolve({ exists: () => true, id: _docRef?.id ?? 'id', data: () => ({}) }),
  getDocs: (_q: any): Promise<any> =>
    Promise.resolve({ docs: [], forEach: (_fn: (d: any) => void) => {} }),
  query: (...args: any[]): any => ({ __q: args }),
  where: (...args: any[]): any => ({ __where: args }),
  limit: (n: number): any => ({ __limit: n }), 
  orderBy: (...args: any[]): any => ({ __orderBy: args }),
  onSnapshot: (_q: any, next: (snap: any) => void, _error?: (e: any) => void): any => {
    next({ forEach: (_fn: (d: any) => void) => {}, docs: [] });
    return () => {};
  },
  deleteDoc: (_ref: any): Promise<any> => Promise.resolve(),
  updateDoc: (_ref: any, _data: any): Promise<any> => Promise.resolve(),
};

export function getFirestore(app?: any): any { return __spies.getFirestore(app); }
export function doc(db: any, collOrRef: any, id?: string): any { return __spies.doc(db, collOrRef, id); }
export function setDoc(ref: any, data: any, opts?: any): any { return __spies.setDoc(ref, data, opts); }
export function serverTimestamp(): any { return __spies.serverTimestamp(); }

export function collection(db: any, path: string): any { return __spies.collection(db, path); }
export function addDoc(colRef: any, data: any): any { return __spies.addDoc(colRef, data); }
export function getDoc(docRef: any): any { return __spies.getDoc(docRef); }
export function getDocs(q: any): any { return __spies.getDocs(q); }
export function query(...args: any[]): any { return __spies.query(...args); }
export function where(...args: any[]): any { return __spies.where(...args); }
export function orderBy(...args: any[]): any { return __spies.orderBy(...args); }
export function limit(n: number): any { return __spies.limit(n); }  
export function onSnapshot(q: any, next: (snap: any) => void, error?: (e: any) => void): any {
  return __spies.onSnapshot(q, next, error);
}
export function deleteDoc(ref: any): any { return __spies.deleteDoc(ref); }
export function updateDoc(ref: any, data: any): any { return __spies.updateDoc(ref, data); }
