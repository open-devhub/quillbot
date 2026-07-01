import type { SupportDoc } from "../types/support.ts";
import { createDocument, deleteDocument, getDocument } from "./firestore.ts";

export function getEntry(id: string) {
  return getDocument("support", id);
}

export function createEntry(entry: SupportDoc) {
  // store all entries in the "support" collection
  return createDocument("support", entry.id, entry);
}

export function removeEntry(id: string) {
  return deleteDocument("support", id);
}
