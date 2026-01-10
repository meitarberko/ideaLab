import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongod: MongoMemoryServer | null = null;

export async function startTestMongo() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

export async function stopTestMongo() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}
