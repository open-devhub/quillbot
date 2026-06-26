import { type DocumentData, WriteResult } from "firebase-admin/firestore";
import { db } from "../config/firebase.js";

export function createDocument(
  collection: string,
  documentId: string,
  data: DocumentData,
): Promise<WriteResult> {
  return db.collection(collection).doc(documentId).set(data);
}

export function deleteDocument(
  collection: string,
  documentId: string,
): Promise<WriteResult> {
  return db.collection(collection).doc(documentId).delete();
}

export async function getDocument(
  collection: string,
  documentId: string,
): Promise<DocumentData | null> {
  const docSnap = await db.collection(collection).doc(documentId).get();

  if (!docSnap.exists) return null;

  return docSnap.data() || null;
}

export async function getAllDocuments(
  collection: string,
): Promise<Record<string, DocumentData>> {
  const snapshot = await db.collection(collection).get();
  const documents: Record<string, DocumentData> = {};

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data) {
      documents[doc.id] = data;
    }
  });

  return documents;
}

export function updateDocument(
  collection: string,
  documentId: string,
  data: Partial<DocumentData>,
): Promise<WriteResult> {
  return db.collection(collection).doc(documentId).update(data);
}
