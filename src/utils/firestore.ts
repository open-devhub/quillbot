import { db } from "../config/firebase.js";

export function createDocument(
  collection: string,
  documentId: string,
  data: any,
) {
  return db.collection(collection).doc(documentId).set(data);
}

export function deleteDocument(collection: string, documentId: string) {
  return db.collection(collection).doc(documentId).delete();
}

export async function getDocument(collection: string, documentId: string) {
  const docSnap = await db.collection(collection).doc(documentId).get();

  if (!docSnap.exists) return null;

  return docSnap.data();
}

export function updateDocument(
  collection: string,
  documentId: string,
  data: any,
) {
  return db.collection(collection).doc(documentId).update(data);
}
