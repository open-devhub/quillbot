import { cacheDB } from "../../utils/cacheDB.js";

export default async (client) => {
  await cacheDB();
};
