import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import app from "./app";
import connectMongo from "./mongo";

const port = Number(process.env.PORT || 3001);

async function start() {
  await connectMongo();
  app.listen(port, () => {
    console.log(`API listening on ${port}`);
  });
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
