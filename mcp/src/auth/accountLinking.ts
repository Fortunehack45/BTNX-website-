import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import {
  hashToken,
  generateNumericCode,
} from "./tokens.js";
import {
  WhatsAppIdentityRecord,
  LinkingChallengeRecord,
} from "./types.js";

/**
 * Normalizes any phone number format to standard E.164 (e.g., +2348123456789).
 */
export function normalizePhoneNumber(rawPhone: string): string {
  if (!rawPhone || typeof rawPhone !== "string") return "";
  let digits = rawPhone.replace(/[^\d+]/g, "").trim();

  // If starts with 0 and is Nigerian local number (11 digits e.g. 08123456789)
  if (digits.startsWith("0") && digits.length === 11) {
    digits = "+234" + digits.slice(1);
  } else if (!digits.startsWith("+")) {
    digits = "+" + digits;
  }
  return digits;
}

/**
 * Generates an unpredictable 6-digit challenge code expiring in 10 minutes.
 * Returns the raw 6-digit code to display on the user's secure web dashboard.
 */
export async function createWhatsAppLinkingChallenge(
  db: Firestore,
  uid: string
): Promise<{ code: string; expiresAt: string }> {
  const code = generateNumericCode();
  const codeHash = hashToken(code);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

  const record: LinkingChallengeRecord = {
    challengeId: `chal_${uid}`,
    uid,
    codeHash,
    createdAt: now.toISOString(),
    expiresAt,
    attempts: 0,
  };

  await setDoc(doc(db, "auth_challenges", `chal_${uid}`), record);

  return { code, expiresAt };
}

/**
 * Verifies a 6-digit linking code sent by a WhatsApp user and binds the phone to the user's UID.
 */
export async function verifyAndLinkWhatsApp(
  db: Firestore,
  rawPhone: string,
  inputCode: string
): Promise<{ success: boolean; uid?: string; message: string }> {
  const normalizedPhone = normalizePhoneNumber(rawPhone);
  if (!normalizedPhone || !inputCode) {
    return { success: false, message: "Invalid phone number or challenge code." };
  }

  const cleanCode = inputCode.trim();
  const targetHash = hashToken(cleanCode);

  try {
    // Find active challenge with matching codeHash
    const q = query(
      collection(db, "auth_challenges"),
      where("codeHash", "==", targetHash)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      return {
        success: false,
        message: "Invalid or expired linking code. Please generate a new code on the BTNX website.",
      };
    }

    const chalDoc = snap.docs[0];
    const chalData = chalDoc.data() as LinkingChallengeRecord;

    // Check expiration
    if (new Date(chalData.expiresAt).getTime() < Date.now()) {
      await deleteDoc(chalDoc.ref);
      return {
        success: false,
        message: "This linking code has expired. Please generate a fresh code on the website.",
      };
    }

    // Check rate limit attempts
    if (chalData.attempts >= 3) {
      await deleteDoc(chalDoc.ref);
      return {
        success: false,
        message: "Too many failed attempts. Code invalidated for security. Please generate a new code.",
      };
    }

    // Single-use: delete challenge immediately
    await deleteDoc(chalDoc.ref);

    // Save identity mapping in whatsapp_identities collection
    const nowIso = new Date().toISOString();
    const identity: WhatsAppIdentityRecord = {
      phoneNumber: normalizedPhone,
      uid: chalData.uid,
      linkedAt: nowIso,
      verifiedAt: nowIso,
      status: "active",
    };

    // Store by normalized phone number document ID
    const phoneDocId = normalizedPhone.replace("+", "");
    await setDoc(doc(db, "whatsapp_identities", phoneDocId), identity);

    return {
      success: true,
      uid: chalData.uid,
      message: "WhatsApp account successfully linked to your canonical BTNX customer profile!",
    };
  } catch (err: any) {
    console.error("[WhatsApp Link Error]", err?.message);
    return { success: false, message: "Server error during account verification." };
  }
}

/**
 * Resolves verified WhatsApp sender phone number to canonical Firebase UID.
 */
export async function resolveWhatsAppSender(
  db: Firestore,
  rawPhone: string
): Promise<string | null> {
  const normalized = normalizePhoneNumber(rawPhone);
  if (!normalized) return null;

  try {
    const phoneDocId = normalized.replace("+", "");
    const snap = await getDoc(doc(db, "whatsapp_identities", phoneDocId));

    if (snap.exists()) {
      const data = snap.data() as WhatsAppIdentityRecord;
      if (data.status === "active") {
        return data.uid;
      }
    }
  } catch (err: any) {
    console.error("[WhatsApp Identity Resolve Error]", err?.message);
  }

  return null;
}

/**
 * Unlinks a WhatsApp phone number from an account.
 */
export async function unlinkWhatsApp(
  db: Firestore,
  uid: string,
  rawPhone?: string
): Promise<boolean> {
  try {
    if (rawPhone) {
      const phoneDocId = normalizePhoneNumber(rawPhone).replace("+", "");
      const snap = await getDoc(doc(db, "whatsapp_identities", phoneDocId));
      if (snap.exists() && snap.data().uid === uid) {
        await updateDoc(doc(db, "whatsapp_identities", phoneDocId), { status: "revoked" });
        return true;
      }
    } else {
      // Find all numbers linked to this UID
      const q = query(
        collection(db, "whatsapp_identities"),
        where("uid", "==", uid),
        where("status", "==", "active")
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await updateDoc(d.ref, { status: "revoked" });
      }
      return true;
    }
  } catch {}
  return false;
}
