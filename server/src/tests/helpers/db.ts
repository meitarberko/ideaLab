import mongoose from "mongoose";

export async function clearDatabase() {
  const collections = mongoose.connection.collections;
  const keys = Object.keys(collections);
  for (const key of keys) {
    await collections[key].deleteMany({});
  }
}
