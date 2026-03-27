import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  runTransaction,
  Timestamp,
  type DocumentSnapshot,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { uploadToCloudinary } from "../lib/cloudinary";
import type { PostDoc } from "../lib/firestoreSchema";

// ─── HELPERS ─────────────────────────────────────────────────────────
function generateTags(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3);
  return [...new Set(words)].slice(0, 20);
}

export interface FeedResult {
  posts: (PostDoc & { id: string })[];
  lastDoc: DocumentSnapshot | null;
}

// ─── 1. CREATE POST ─────────────────────────────────────────────────
export async function createPost(
  authorId: string,
  content: string,
  imageFile?: File | null,
  visibility: "everyone" | "ghosts" = "everyone",
  authorMask: string = "ghost",
  onUploadProgress?: (percent: number) => void,
  quotedPostId: string | null = null
): Promise<string> {
  let imageUrl: string | null = null;

  // Upload image to Cloudinary if provided
  if (imageFile) {
    imageUrl = await uploadToCloudinary(imageFile, onUploadProgress);
  }

  const postData = {
    authorId,
    authorMask,
    authorName: "Ghost_" + authorId.slice(-5).toUpperCase(),
    content: content.trim(),
    imageUrl,
    visibility,
    createdAt: Timestamp.now(),
    likeCount: 0,
    echoCount: 0,
    commentCount: 0,
    isEcho: false,
    originalPostId: quotedPostId,
    tags: generateTags(content.trim()),
    isDeleted: false,
  };

  const docRef = await addDoc(collection(db, "posts"), postData);
  return docRef.id;
}

// ─── 2. GET FEED POSTS (Paginated) ──────────────────────────────────
export async function getFeedPosts(
  lastDocSnap?: DocumentSnapshot | null
): Promise<FeedResult> {
  let q = query(
    collection(db, "posts"),
    where("isDeleted", "==", false),
    orderBy("createdAt", "desc"),
    limit(10)
  );

  if (lastDocSnap) {
    q = query(
      collection(db, "posts"),
      where("isDeleted", "==", false),
      orderBy("createdAt", "desc"),
      startAfter(lastDocSnap),
      limit(10)
    );
  }

  const snapshot = await getDocs(q);
  const posts = snapshot.docs.map(
    (d) => ({ id: d.id, ...d.data() } as PostDoc & { id: string })
  );
  const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

  return { posts, lastDoc };
}

// ─── 3. SUBSCRIBE TO FEED (Real-time) ───────────────────────────────
export function subscribeToFeed(
  callback: (posts: (PostDoc & { id: string })[]) => void
): () => void {
  const q = query(
    collection(db, "posts"),
    where("isDeleted", "==", false),
    orderBy("createdAt", "desc"),
    limit(10)
  );

  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() } as PostDoc & { id: string })
    );
    callback(posts);
  });
}

// ─── 4. DELETE POST (Soft delete) ───────────────────────────────────
export async function deletePost(
  postId: string,
  authorId: string
): Promise<void> {
  const postRef = doc(db, "posts", postId);
  const postSnap = await getDoc(postRef);

  if (!postSnap.exists()) throw new Error("Post not found.");
  if (postSnap.data().authorId !== authorId)
    throw new Error("Unauthorized: not your post.");

  await updateDoc(postRef, { isDeleted: true });
}

// ─── 5. TOGGLE LIKE ─────────────────────────────────────────────────
export async function toggleLike(
  postId: string,
  userId: string
): Promise<boolean> {
  const likeRef = doc(db, "posts", postId, "likes", userId);
  const postRef = doc(db, "posts", postId);

  const liked = await runTransaction(db, async (tx) => {
    const likeSnap = await tx.get(likeRef);
    const postSnap = await tx.get(postRef);

    if (!postSnap.exists()) throw new Error("Post not found.");

    if (likeSnap.exists()) {
      // Unlike
      tx.delete(likeRef);
      tx.update(postRef, {
        likeCount: (postSnap.data().likeCount || 1) - 1,
      });
      return false;
    } else {
      // Like
      tx.set(likeRef, {
        userId,
        createdAt: Timestamp.now(),
      });
      tx.update(postRef, {
        likeCount: (postSnap.data().likeCount || 0) + 1,
      });
      return true;
    }
  });

  return liked;
}

// ─── 6. CREATE ECHO ─────────────────────────────────────────────────
export async function createEcho(
  originalPostId: string,
  userId: string,
  userMask: string = "ghost"
): Promise<string> {
  const originalRef = doc(db, "posts", originalPostId);
  const originalSnap = await getDoc(originalRef);

  if (!originalSnap.exists()) throw new Error("Original post not found.");
  const originalData = originalSnap.data();

  // Create echo post
  const echoData = {
    authorId: userId,
    authorMask: userMask,
    authorName: "Ghost_" + userId.slice(-5).toUpperCase(),
    content: originalData.content,
    imageUrl: originalData.imageUrl || null,
    visibility: "everyone",
    createdAt: Timestamp.now(),
    likeCount: 0,
    echoCount: 0,
    commentCount: 0,
    isEcho: true,
    originalPostId,
    tags: originalData.tags || [],
    isDeleted: false,
  };

  const echoRef = await addDoc(collection(db, "posts"), echoData);

  // Increment original post echoCount
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(originalRef);
    if (snap.exists()) {
      tx.update(originalRef, {
        echoCount: (snap.data().echoCount || 0) + 1,
      });
    }
  });

  return echoRef.id;
}

// ─── 7. SAVE / UNSAVE POST ──────────────────────────────────────────
export async function savePost(
  postId: string,
  userId: string
): Promise<void> {
  await setDoc(doc(db, "saves", userId, "items", postId), {
    postId,
    savedAt: Timestamp.now(),
  });
}

export async function unsavePost(
  postId: string,
  userId: string
): Promise<void> {
  await deleteDoc(doc(db, "saves", userId, "items", postId));
}

export async function isPostSaved(
  postId: string,
  userId: string
): Promise<boolean> {
  const snap = await getDoc(doc(db, "saves", userId, "items", postId));
  return snap.exists();
}

// ─── 8. REPORT POST ─────────────────────────────────────────────────
export async function reportPost(
  postId: string,
  reporterId: string,
  reason: string
): Promise<void> {
  await addDoc(collection(db, "reports"), {
    reporterId,
    targetId: postId,
    targetType: "post",
    reason,
    createdAt: Timestamp.now(),
    resolved: false,
  });
}

// ─── 9. SEARCH POSTS ────────────────────────────────────────────────
export async function searchPosts(
  keyword: string
): Promise<(PostDoc & { id: string })[]> {
  const q = query(
    collection(db, "posts"),
    where("isDeleted", "==", false),
    where("tags", "array-contains", keyword.toLowerCase().trim()),
    orderBy("createdAt", "desc"),
    limit(20)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (d) => ({ id: d.id, ...d.data() } as PostDoc & { id: string })
  );
}
