import dotenv from "dotenv";
import path from "path";
import http from "http";
import https from "https";
import fs from "fs";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import app from "./app";
import connectMongo from "./mongo";

const port = Number(process.env.PORT || 3000);
const httpsPort = Number(process.env.HTTPS_PORT || 443);

async function start() {
  await connectMongo();
  if (process.env.NODE_ENV !== "production") {
    console.log("development mode");
    http.createServer(app).listen(port, "0.0.0.0", () => {
      console.log(`API listening on ${port} with HTTP`);
    });
  } else {
    console.log("production mode");
    const options = {
      key: fs.readFileSync(path.resolve(__dirname, "../certs/client-key.pem")),
      cert: fs.readFileSync(path.resolve(__dirname, "../certs/client-cert.pem")),
    };
    https.createServer(options, app).listen(httpsPort, "0.0.0.0", () => {
      console.log(`API listening on ${httpsPort} with HTTPS`);
    });
  }
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
