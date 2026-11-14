import { initializeApp } from "firebase/app";
import { initializeFirestore, getFirestore } from "firebase/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read firebase-applet-config.json from root
const rootConfigPath = path.resolve(__dirname, "../../firebase-applet-config.json");
let firebaseConfig: any = {};

try {
  if (fs.existsSync(rootConfigPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(rootConfigPath, "utf-8"));
  }
} catch (e) {
  console.warn("Could not read firebase-applet-config.json: ", e);
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
