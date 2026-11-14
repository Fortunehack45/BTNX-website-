import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  setLogLevel,
} from "firebase/firestore";
import config from "../../firebase-applet-config.json";

try {
  setLogLevel("silent");
} catch {
  // ignore
}

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
};

export const app = initializeApp(firebaseConfig);

function createFirestoreInstance() {
  try {
    return config.firestoreDatabaseId
      ? initializeFirestore(
          app,
          { experimentalAutoDetectLongPolling: true },
          config.firestoreDatabaseId
        )
      : initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  } catch {
    return config.firestoreDatabaseId
      ? getFirestore(app, config.firestoreDatabaseId)
      : getFirestore(app);
  }
}

export const db = createFirestoreInstance();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
