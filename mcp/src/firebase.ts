import { initializeApp } from "firebase/app";
import { initializeFirestore, getFirestore } from "firebase/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

function getSafeDirname(): string {
  try {
    const metaUrl = (import.meta as any)?.url;
    if (metaUrl) {
      return path.dirname(fileURLToPath(metaUrl));
    }
  } catch {}
  try {
    if (typeof __dirname !== "undefined") {
      return __dirname;
    }
  } catch {}
  return process.cwd();
}
const safeDir = getSafeDirname();

const rootConfigPath = path.resolve(safeDir, "../../firebase-applet-config.json");
let firebaseConfig: any = {};

try {
  if (fs.existsSync(rootConfigPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(rootConfigPath, "utf-8"));
  }
} catch {
  // fallback
}

const app = initializeApp(firebaseConfig);

function createFirestore() {
  const dbId = process.env.FIRESTORE_DATABASE_ID || (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)" ? firebaseConfig.firestoreDatabaseId : undefined);
  try {
    return dbId
      ? initializeFirestore(app, { experimentalAutoDetectLongPolling: true }, dbId)
      : initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  } catch {
    return dbId
      ? getFirestore(app, dbId)
      : getFirestore(app);
  }
}

export const db = createFirestore();
export default app;
