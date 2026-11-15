import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load firebase applet config if present
const candidatePaths = [
  path.resolve(__dirname, "../firebase-applet-config.json"),
  path.resolve(__dirname, "../server/firebase-applet-config.json"),
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
const auth = getAuth(app);
const dbId = process.env.FIRESTORE_DATABASE_ID || (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)" ? firebaseConfig.firestoreDatabaseId : undefined);
const db = dbId
  ? initializeFirestore(app, { experimentalAutoDetectLongPolling: true }, dbId)
  : initializeFirestore(app, { experimentalAutoDetectLongPolling: true });

async function ensureAdminAuth(): Promise<void> {
  const adminEmail = process.env.FIREBASE_ADMIN_EMAIL;
  const adminPassword = process.env.FIREBASE_ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    try {
      console.log(`Authenticating script as administrator (${adminEmail})...`);
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      console.log("✔ Administrative authentication successful.\n");
      return;
    } catch (err: any) {
      console.warn("[Notice] Admin login failed:", err.message);
    }
  } else {
    console.log("[Info] No FIREBASE_ADMIN_EMAIL / FIREBASE_ADMIN_PASSWORD set in env. Attempting operation with active credentials.");
  }
}

interface OrderMigrationRecord {
  orderId: string;
  previousUserId: string | null;
  newUserId: string;
  matchedEmail: string;
}

interface RollbackJournal {
  timestamp: string;
  appliedRecords: OrderMigrationRecord[];
}

async function runMigration() {
  const args = process.argv.slice(2);
  const isApply = args.includes("--apply");
  const isDryRun = args.includes("--dry-run") || !isApply;
  const rollbackIndex = args.indexOf("--rollback");
  const rollbackFilePath = rollbackIndex !== -1 ? args[rollbackIndex + 1] : null;

  console.log("=================================================");
  console.log("   BTNX CANONICAL ORDER OWNERSHIP RECONCILER     ");
  console.log("=================================================");
  console.log(`Execution Mode: ${rollbackFilePath ? "ROLLBACK" : isApply ? "APPLY (WRITES TO FIRESTORE)" : "DRY-RUN (SIMULATION)"}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log("-------------------------------------------------");

  // Case 1: Rollback Mode
  if (rollbackFilePath) {
    const fullJournalPath = path.resolve(process.cwd(), rollbackFilePath);
    if (!fs.existsSync(fullJournalPath)) {
      console.error(`[Error] Rollback journal not found at: ${fullJournalPath}`);
      process.exit(1);
    }

    const journalContent = fs.readFileSync(fullJournalPath, "utf-8");
    const journal: RollbackJournal = JSON.parse(journalContent);
    console.log(`Rolling back ${journal.appliedRecords.length} records from journal: ${rollbackFilePath}`);

    for (const record of journal.appliedRecords) {
      console.log(`Reverting Order #${record.orderId} -> userId: ${record.previousUserId ?? "(null)"}`);
      await updateDoc(doc(db, "orders", record.orderId), {
        userId: record.previousUserId ?? null,
        ownershipReconciledAt: null,
      });
    }

    console.log("Rollback completed successfully.");
    process.exit(0);
  }

  // Case 2: Scan and Reconcile
  await ensureAdminAuth();
  console.log("Fetching orders from Firestore...");
  const ordersSnap = await getDocs(collection(db, "orders"));
  console.log(`Total orders found: ${ordersSnap.docs.length}`);

  console.log("Fetching users from Firestore for canonical UID lookup...");
  const usersSnap = await getDocs(collection(db, "users"));
  const emailToUidMap = new Map<string, string>();
  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    if (data.email) {
      emailToUidMap.set(String(data.email).toLowerCase().trim(), userDoc.id);
    }
  }
  console.log(`Indexed ${emailToUidMap.size} user profiles with canonical UIDs.\n`);

  const reconciliations: OrderMigrationRecord[] = [];
  let alreadyCanonicalCount = 0;
  let unmatchableCount = 0;

  for (const orderDoc of ordersSnap.docs) {
    const data = orderDoc.data();
    const orderId = orderDoc.id;
    const currentUserId = data.userId || null;
    const email = (data.customerEmail || data.userEmail || data.email || "").toLowerCase().trim();

    if (currentUserId && emailToUidMap.has(email) && emailToUidMap.get(email) === currentUserId) {
      alreadyCanonicalCount++;
      continue;
    }

    if (!currentUserId && email && emailToUidMap.has(email)) {
      const canonicalUid = emailToUidMap.get(email)!;
      reconciliations.push({
        orderId,
        previousUserId: currentUserId,
        newUserId: canonicalUid,
        matchedEmail: email,
      });
    } else if (!currentUserId) {
      console.warn(`[Unmatched] Order #${orderId} has email "${email || "N/A"}" which does not correspond to any registered user.`);
      unmatchableCount++;
    }
  }

  console.log("-------------------------------------------------");
  console.log(`Already Canonical: ${alreadyCanonicalCount}`);
  console.log(`Unmatched / Anonymous: ${unmatchableCount}`);
  console.log(`Orders to Reconcile: ${reconciliations.length}`);
  console.log("-------------------------------------------------");

  if (reconciliations.length === 0) {
    console.log("No orphaned or unreconciled orders found. Database is canonical!");
    process.exit(0);
  }

  console.log("\nReconciliation Candidate Plan:");
  for (const rec of reconciliations) {
    console.log(`👉 Order #${rec.orderId} (${rec.matchedEmail}) -> Set userId = "${rec.newUserId}"`);
  }

  if (isDryRun) {
    console.log("\n[DRY RUN COMPLETE] No records were modified in Firestore.");
    console.log("Run with --apply to commit these reconciliations to Firestore.");
    process.exit(0);
  }

  // APPLY MODE
  console.log("\nApplying reconciliations to Firestore...");
  const applied: OrderMigrationRecord[] = [];

  for (const rec of reconciliations) {
    try {
      await updateDoc(doc(db, "orders", rec.orderId), {
        userId: rec.newUserId,
        ownershipReconciledAt: new Date().toISOString(),
      });
      applied.push(rec);
      console.log(`✔ Reconciled Order #${rec.orderId}`);
    } catch (err: any) {
      console.error(`✖ Failed to update Order #${rec.orderId}:`, err.message);
    }
  }

  // Write rollback journal
  const journalFileName = `migration-rollback-${Date.now()}.json`;
  const journalPath = path.resolve(__dirname, journalFileName);
  const journal: RollbackJournal = {
    timestamp: new Date().toISOString(),
    appliedRecords: applied,
  };
  fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2), "utf-8");

  console.log(`\nReconciliation applied successfully!`);
  console.log(`Rollback journal written to: ${journalPath}`);
  console.log(`To rollback, run: npx tsx scripts/migrate-order-ownership.ts --rollback scripts/${journalFileName}`);
}

runMigration().catch((err) => {
  console.error("Migration fatal error:", err);
  process.exit(1);
});
