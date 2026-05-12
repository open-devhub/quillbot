import { db } from "../config/firebase.js";

export function createDocument(collection, documentId, data) {
  return db.collection(collection).doc(documentId).set(data);
}

export function deleteDocument(collection, documentId) {
  return db.collection(collection).doc(documentId).delete();
}

export async function getDocument(collection, documentId) {
  const docSnap = await db.collection(collection).doc(documentId).get();

  if (!docSnap.exists) return null;

  return docSnap.data();
}

export function updateDocument(collection, documentId, data) {
  return db.collection(collection).doc(documentId).update(data);
}
