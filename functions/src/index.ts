import * as admin from "firebase-admin";
import { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import * as functions from "firebase-functions";

// ─── INITIALIZE ADMIN SDK ────────────────────────────────────────────
admin.initializeApp();
const db = admin.firestore();

// ─── 1. ON USER CREATED (Auth Trigger) ──────────────────────────────
// Triggers AFTER every new Firebase Auth user creation.
// Creates the user document in Firestore with defaults.
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  const displayName = "Ghost_" + user.uid.slice(-5).toUpperCase();

  await db.doc(`users/${user.uid}`).set({
    uid: user.uid,
    maskIcon: "ghost",
    displayName,
    bio: "",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastSeen: admin.firestore.FieldValue.serverTimestamp(),
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
    isAnonymous: user.providerData.length === 0,
    settings: {
      defaultVisibility: "everyone",
      allowReplies: true,
    },
  });
});

// ─── 2. ON USER DELETED (Auth Trigger) ──────────────────────────────
// Triggers AFTER Auth user deletion.
// Soft-deletes all posts, purges user doc + notifications.
export const onUserDeleted = functions.auth.user().onDelete(async (user) => {
  const uid = user.uid;
  const batch = db.batch();

  // Soft-delete all user's posts (set isDeleted: true)
  const postsSnap = await db
    .collection("posts")
    .where("authorId", "==", uid)
    .get();

  postsSnap.docs.forEach((doc) => {
    batch.update(doc.ref, { isDeleted: true });
  });

  // Delete the user document
  batch.delete(db.doc(`users/${uid}`));

  await batch.commit();

  // Delete all their notifications (subcollection — must delete individually)
  const notifsSnap = await db
    .collection(`notifications/${uid}/items`)
    .get();

  const notifBatch = db.batch();
  notifsSnap.docs.forEach((doc) => {
    notifBatch.delete(doc.ref);
  });
  await notifBatch.commit();
});

// ─── 3. ON POST CREATED (Firestore Trigger) ─────────────────────────
// Increments the author's postCount.
// Generates and stores a tags array from the post content.
export const onPostCreated = onDocumentCreated("posts/{postId}", async (event) => {
  const snap = event.data;
  if (!snap) return;

  const data = snap.data();
  const authorId = data.authorId as string;
  const content = (data.content as string) || "";

  // Increment author's postCount
  await db.doc(`users/${authorId}`).update({
    postCount: admin.firestore.FieldValue.increment(1),
  });

  // Generate tags from content
  const tags = content
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((word: string) => word.length > 3)
    .slice(0, 20);

  const uniqueTags = [...new Set(tags)];

  // Only update if tags differ from what's already stored
  if (uniqueTags.length > 0) {
    await snap.ref.update({ tags: uniqueTags });
  }
});

// ─── 4. ON POST SOFT-DELETED (Firestore Trigger) ────────────────────
// Detects isDeleted changing from false → true.
// Decrements the author's postCount.
export const onPostSoftDeleted = onDocumentUpdated("posts/{postId}", async (event) => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();

  if (!before || !after) return;

  // Only fire when isDeleted transitions from false → true
  if (before.isDeleted === false && after.isDeleted === true) {
    const authorId = after.authorId as string;

    await db.doc(`users/${authorId}`).update({
      postCount: admin.firestore.FieldValue.increment(-1),
    });
  }
});

// ─── HELPER: Fetch actor profile for notification payloads ───────────
async function getActorInfo(uid: string) {
  const userSnap = await db.doc(`users/${uid}`).get();
  const data = userSnap.data();
  return {
    actorName: data?.displayName || "Ghost_" + uid.slice(-5).toUpperCase(),
    actorMask: data?.maskIcon || "ghost",
  };
}

// ─── 5. ON LIKE CREATED (Firestore Trigger) ─────────────────────────
// Creates a 'like' notification for the post author.
export const onLikeCreated = onDocumentCreated(
  "posts/{postId}/likes/{userId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const likerId = event.params.userId;
    const postId = event.params.postId;

    // Get the post to find the authorId
    const postSnap = await db.doc(`posts/${postId}`).get();
    if (!postSnap.exists) return;
    const postData = postSnap.data()!;
    const authorId = postData.authorId as string;

    // Don't notify yourself
    if (likerId === authorId) return;

    const { actorName, actorMask } = await getActorInfo(likerId);

    await db.collection(`notifications/${authorId}/items`).add({
      type: "like",
      actorId: likerId,
      actorName,
      actorMask,
      postId,
      commentId: null,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);

// ─── 6. ON COMMENT CREATED (Firestore Trigger) ──────────────────────
// Increments commentCount, notifies post author + parent comment author.
export const onCommentCreated = onDocumentCreated(
  "posts/{postId}/comments/{commentId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const commentData = snap.data();
    const postId = event.params.postId;
    const commentId = event.params.commentId;
    const commenterId = commentData.authorId as string;
    const parentCommentId = commentData.parentCommentId as string | null;

    const batch = db.batch();

    // Increment the post's commentCount
    const postRef = db.doc(`posts/${postId}`);
    batch.update(postRef, {
      commentCount: admin.firestore.FieldValue.increment(1),
    });

    // Get post author
    const postSnap = await postRef.get();
    if (!postSnap.exists) return;
    const postData = postSnap.data()!;
    const postAuthorId = postData.authorId as string;

    const { actorName, actorMask } = await getActorInfo(commenterId);

    // Notify post author (if commenter is not the author)
    if (commenterId !== postAuthorId) {
      const notifRef = db.collection(`notifications/${postAuthorId}/items`).doc();
      batch.set(notifRef, {
        type: "comment",
        actorId: commenterId,
        actorName,
        actorMask,
        postId,
        commentId,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // If this is a reply, also notify the parent comment author
    if (parentCommentId) {
      const parentSnap = await db
        .doc(`posts/${postId}/comments/${parentCommentId}`)
        .get();

      if (parentSnap.exists) {
        const parentAuthorId = parentSnap.data()!.authorId as string;

        // Don't double-notify or self-notify
        if (parentAuthorId !== commenterId && parentAuthorId !== postAuthorId) {
          const replyNotifRef = db
            .collection(`notifications/${parentAuthorId}/items`)
            .doc();
          batch.set(replyNotifRef, {
            type: "reply",
            actorId: commenterId,
            actorName,
            actorMask,
            postId,
            commentId,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    }

    await batch.commit();
  }
);

// ─── 7. ON FOLLOW CREATED (Firestore Trigger) ──────────────────────
// Increments follower/following counts and creates 'follow' notification.
export const onFollowCreated = onDocumentCreated(
  "follows/{followId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    const followerId = data.followerId as string;
    const followingId = data.followingId as string;

    const batch = db.batch();

    // Increment followingId's followerCount
    batch.update(db.doc(`users/${followingId}`), {
      followerCount: admin.firestore.FieldValue.increment(1),
    });

    // Increment followerId's followingCount
    batch.update(db.doc(`users/${followerId}`), {
      followingCount: admin.firestore.FieldValue.increment(1),
    });

    // Create 'follow' notification for the person being followed
    const { actorName, actorMask } = await getActorInfo(followerId);
    const notifRef = db.collection(`notifications/${followingId}/items`).doc();
    batch.set(notifRef, {
      type: "follow",
      actorId: followerId,
      actorName,
      actorMask,
      postId: null,
      commentId: null,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
  }
);

// ─── 8. ON FOLLOW DELETED (Firestore Trigger) ──────────────────────
// Decrements follower/following counts.
export const onFollowDeleted = onDocumentDeleted(
  "follows/{followId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    const followerId = data.followerId as string;
    const followingId = data.followingId as string;

    const batch = db.batch();

    batch.update(db.doc(`users/${followingId}`), {
      followerCount: admin.firestore.FieldValue.increment(-1),
    });

    batch.update(db.doc(`users/${followerId}`), {
      followingCount: admin.firestore.FieldValue.increment(-1),
    });

    await batch.commit();
  }
);

// ─── 9. ON ECHO CREATED (Firestore Trigger) ─────────────────────────
// Detects new echo posts, notifies original author, increments echoCount.
export const onEchoCreated = onDocumentCreated("posts/{echoPostId}", async (event) => {
  const snap = event.data;
  if (!snap) return;

  const data = snap.data();
  const isEcho = data.isEcho as boolean;
  const originalPostId = data.originalPostId as string | null;
  const echoAuthorId = data.authorId as string;

  // Only process echo posts
  if (!isEcho || !originalPostId) return;

  // Get the original post
  const originalSnap = await db.doc(`posts/${originalPostId}`).get();
  if (!originalSnap.exists) return;
  const originalData = originalSnap.data()!;
  const originalAuthorId = originalData.authorId as string;

  const batch = db.batch();

  // Increment original post's echoCount
  batch.update(db.doc(`posts/${originalPostId}`), {
    echoCount: admin.firestore.FieldValue.increment(1),
  });

  // Notify original author (if different from echo author)
  if (echoAuthorId !== originalAuthorId) {
    const { actorName, actorMask } = await getActorInfo(echoAuthorId);
    const notifRef = db.collection(`notifications/${originalAuthorId}/items`).doc();
    batch.set(notifRef, {
      type: "echo",
      actorId: echoAuthorId,
      actorName,
      actorMask,
      postId: originalPostId,
      commentId: null,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
});
