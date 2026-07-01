import { cacheDB } from "../../firestore/cacheDB.ts";

export default async () => {
  await cacheDB();
};
