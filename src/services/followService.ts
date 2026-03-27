import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  increment,
  Timestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { getAuthStore } from "../store/authStore";

/**
 * Send a follow REQUEST (creates a 'follow_request' notification).
 * Does NOT create the follow doc yet — the target must accept first.
 */
export async function sendFollowRequest(targetUserId: string): Promise<void> {
  const { user, userProfile } = getAuthStore();
  if (!user) throw new Error("Not authenticated");

  const requestId = `${user.uid}_${targetUserId}`;

  // Write the request as a notification on the TARGET user
  await setDoc(
    doc(db, "notifications", targetUserId, "items", requestId),
    {
      type: "follow_request",
      actorId: user.uid,
      actorName: userProfile?.displayName || "Ghost_" + user.uid.slice(-5).toUpperCase(),
      actorMask: userProfile?.mask || userProfile?.maskIcon || "ghost",
      postId: null,
      commentId: null,
      read: false,
      createdAt: Timestamp.now(),
    }
  );
}

/**
 * Accept a follow request: creates the follows doc + counter updates + confirmation notification.
 */
export async function acceptFollowRequest(
  requesterId: string,
  notificationId: string
): Promise<void> {
  const { user, userProfile } = getAuthStore();
  if (!user) throw new Error("Not authenticated");

  const followId = `${requesterId}_${user.uid}`;

  // 1. Create the actual follow document
  await setDoc(doc(db, "follows", followId), {
    followerId: requesterId,
    followingId: user.uid,
    createdAt: Timestamp.now(),
  });

  // 2. Update follower/following counts
  await setDoc(doc(db, "users", user.uid), {
    followerCount: increment(1),
  }, { merge: true }).catch(console.error);
  await setDoc(doc(db, "users", requesterId), {
    followingCount: increment(1),
  }, { merge: true }).catch(console.error);

  // 3. Mark the request notification as read / remove it
  await deleteDoc(doc(db, "notifications", user.uid, "items", notificationId));

  // 4. Send a confirmation notification back to the requester
  await setDoc(
    doc(db, "notifications", requesterId, "items", `accepted_${user.uid}`),
    {
      type: "follow_accepted",
      actorId: user.uid,
      actorName: userProfile?.displayName || "Ghost_" + user.uid.slice(-5).toUpperCase(),
      actorMask: userProfile?.mask || userProfile?.maskIcon || "ghost",
      postId: null,
      commentId: null,
      read: false,
      createdAt: Timestamp.now(),
    }
  );
}

/**
 * Reject a follow request: just delete the notification.
 */
export async function rejectFollowRequest(
  notificationId: string
): Promise<void> {
  const { user } = getAuthStore();
  if (!user) throw new Error("Not authenticated");

  await deleteDoc(doc(db, "notifications", user.uid, "items", notificationId));
}

/**
 * Unfollow: delete the follow doc.
 */
export async function unfollowUser(targetUserId: string): Promise<void> {
  const { user } = getAuthStore();
  if (!user) throw new Error("Not authenticated");

  const followId = `${user.uid}_${targetUserId}`;
  await deleteDoc(doc(db, "follows", followId));

  // Decrement counters
  await setDoc(doc(db, "users", targetUserId), {
    followerCount: increment(-1),
  }, { merge: true }).catch(console.error);
  await setDoc(doc(db, "users", user.uid), {
    followingCount: increment(-1),
  }, { merge: true }).catch(console.error);
}

/**
 * Check if current user is following the target.
 */
export async function checkIsFollowing(targetUserId: string): Promise<boolean> {
  const { user } = getAuthStore();
  if (!user) return false;

  const followDoc = await getDoc(doc(db, "follows", `${user.uid}_${targetUserId}`));
  return followDoc.exists();
}

/**
 * Check if a pending follow request exists.
 */
export async function checkPendingRequest(targetUserId: string): Promise<boolean> {
  const { user } = getAuthStore();
  if (!user) return false;

  const requestDoc = await getDoc(
    doc(db, "notifications", targetUserId, "items", `${user.uid}_${targetUserId}`)
  );
  return requestDoc.exists() && requestDoc.data()?.type === "follow_request";
}
