import multer from "multer";
import path from "path";
import fs from "fs";

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function makeUploader(subFolder: "avatars" | "ideas") {
  const base = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
  const dir = path.join(base, subFolder);
  ensureDir(dir);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safe = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`;
      cb(null, safe);
    }
  });

  return multer({ storage });
}

export function buildPublicUploadUrl(subFolder: "avatars" | "ideas", filename: string) {
  const publicBase = process.env.PUBLIC_BASE_URL || "";
  return `${publicBase}/uploads/${subFolder}/${filename}`;
}
