import {
  collection,
  addDoc,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { uploadToCloudinary } from "../lib/cloudinary";

export interface CellMessage {
  id?: string;
  ghostId: string;
  text: string;
  imageUrl?: string | null;
  timestamp: Timestamp;
}

// ─── 1. SEND CELL MESSAGE ──────────────────────────────────────────
export async function sendCellMessage(
  roomId: string,
  ghostId: string,
  text: string,
  imageFile?: File | null,
  onUploadProgress?: (percent: number) => void
): Promise<string> {
  let imageUrl: string | null = null;
  
  if (imageFile) {
    imageUrl = await uploadToCloudinary(imageFile, onUploadProgress);
  }

  const msgData = {
    ghostId,
    text: text.trim(),
    imageUrl,
    timestamp: Timestamp.now(),
  };

  const docRef = await addDoc(collection(db, "rooms", roomId, "messages"), msgData);
  return docRef.id;
}

// ─── 2. SUBSCRIBE TO CELL MESSAGES ─────────────────────────────────
export function subscribeToCellMessages(
  roomId: string,
  callback: (messages: CellMessage[]) => void
): () => void {
  const q = query(
    collection(db, "rooms", roomId, "messages"),
    orderBy("timestamp", "asc"),
    limit(100) // Keep the last 100 messages to avoid large payloads
  );

  return onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    } as CellMessage));
    callback(msgs);
  });
}

// ─── 3. PRESENCE TRACKING ──────────────────────────────────────────
// Simple presence: heartbeat updates lastSeen in DB.
export async function updateCellPresence(
  roomId: string,
  ghostId: string
): Promise<void> {
  const presenceRef = doc(db, "rooms", roomId, "presence", ghostId);
  await setDoc(presenceRef, { lastSeen: Timestamp.now() }, { merge: true });
}

export async function removeCellPresence(
  roomId: string,
  ghostId: string
): Promise<void> {
  const presenceRef = doc(db, "rooms", roomId, "presence", ghostId);
  await deleteDoc(presenceRef);
}

export function subscribeToCellPresence(
  roomId: string,
  callback: (activeCount: number) => void
): () => void {
  // Assume "active" is someone who pinged in the last 5 minutes
  const fiveMinsAgo = Timestamp.fromMillis(Date.now() - 5 * 60 * 1000);
  
  const q = query(
    collection(db, "rooms", roomId, "presence"),
    where("lastSeen", ">=", fiveMinsAgo)
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.size);
  });
}
