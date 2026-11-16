import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Look for config in local directory or parent workspace
const candidatePaths = [
  path.resolve(__dirname, "../firebase-applet-config.json"),
  path.resolve(__dirname, "../../firebase-applet-config.json"),
  path.resolve(process.cwd(), "firebase-applet-config.json"),
];

let fileConfig: any = {};
for (const p of candidatePaths) {
  try {
    if (fs.existsSync(p)) {
      fileConfig = JSON.parse(fs.readFileSync(p, "utf-8"));
      break;
    }
  } catch {}
}

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || fileConfig.projectId || "expenses-ai-vfx7o",
  appId: process.env.FIREBASE_APP_ID || fileConfig.appId || "1:768021477341:web:c578b15abce461d0fae834",
  apiKey: process.env.FIREBASE_API_KEY || fileConfig.apiKey || "AIzaSyCsBOx0WB6WuBVphhPu_tZJx4RQihBqw-o",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || fileConfig.authDomain || "expenses-ai-vfx7o.firebaseapp.com",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || fileConfig.storageBucket || "expenses-ai-vfx7o.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || fileConfig.messagingSenderId || "768021477341",
  firestoreDatabaseId: process.env.FIRESTORE_DATABASE_ID || fileConfig.firestoreDatabaseId || "ai-studio-klamby-efc211be-fa31-444f-8359-2e516e0d2638",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

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
export const auth = getAuth(app);
export default app;
