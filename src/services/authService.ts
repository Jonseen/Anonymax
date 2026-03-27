import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  type User,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { getAuthStore } from "../store/authStore";
import type { UserDoc } from "../lib/firestoreSchema";

// ─── 1. REGISTER USER ───────────────────────────────────────────────
export async function registerUser(
  email: string,
  password: string,
  maskIcon: string = "ghost"
): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const user = cred.user;

  const displayName = "Ghost_" + user.uid.slice(-5).toUpperCase();

  // The Cloud Function `onUserCreated` might create this doc automatically.
  // We write a fallback here in case the function is delayed or disabled.
  // Wait up to 3 seconds for the Cloud Function to create the doc first.
  const docExists = await waitForDoc(`users/${user.uid}`, 3000);

  if (!docExists) {
    // Cloud Function didn't fire in time — create the doc ourselves
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      maskIcon,
      displayName,
      bio: "",
      createdAt: Timestamp.now(),
      lastSeen: Timestamp.now(),
      followerCount: 0,
      followingCount: 0,
      postCount: 0,
      isAnonymous: false,
      settings: {
        defaultVisibility: "everyone",
        allowReplies: true,
      },
    });
  } else {
    // Doc exists from Cloud Function — just overwrite the mask choice
    await updateDoc(doc(db, "users", user.uid), { maskIcon });
  }

  return user;
}

// ─── 2. LOGIN USER ──────────────────────────────────────────────────
export async function loginUser(
  email: string,
  password: string
): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);

  // Update lastSeen timestamp
  await updateDoc(doc(db, "users", cred.user.uid), {
    lastSeen: serverTimestamp(),
  }).catch(() => {
    // Silently fail if user doc doesn't exist yet
  });

  return cred.user;
}

// ─── 3. LOGIN AS GHOST (Anonymous) ──────────────────────────────────
export async function loginAsGhost(): Promise<User> {
  const cred = await signInAnonymously(auth);
  const user = cred.user;

  const displayName = "Ghost_" + user.uid.slice(-5).toUpperCase();

  // Anonymous users always get a fresh doc
  await setDoc(
    doc(db, "users", user.uid),
    {
      uid: user.uid,
      maskIcon: "ghost",
      displayName,
      bio: "",
      createdAt: Timestamp.now(),
      lastSeen: Timestamp.now(),
      followerCount: 0,
      followingCount: 0,
      postCount: 0,
      isAnonymous: true,
      settings: {
        defaultVisibility: "everyone",
        allowReplies: true,
      },
    },
    { merge: true }
  );

  return user;
}

// ─── 4. LOGOUT USER ─────────────────────────────────────────────────
export async function logoutUser(): Promise<void> {
  const { user } = getAuthStore();

  // Stamp final lastSeen before disconnecting
  if (user) {
    await updateDoc(doc(db, "users", user.uid), {
      lastSeen: serverTimestamp(),
    }).catch(() => {});
  }

  await signOut(auth);
  getAuthStore().clearUser();
}

// ─── 5. UPDATE USER PROFILE ─────────────────────────────────────────
export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserDoc, "bio" | "maskIcon" | "settings">>
): Promise<void> {
  const allowedFields: Record<string, any> = {};

  if (updates.bio !== undefined) allowedFields.bio = updates.bio;
  if (updates.maskIcon !== undefined) allowedFields.maskIcon = updates.maskIcon;
  if (updates.settings !== undefined) allowedFields.settings = updates.settings;

  if (Object.keys(allowedFields).length === 0) return;

  await updateDoc(doc(db, "users", userId), allowedFields);
}

// ─── 6. DELETE ACCOUNT ──────────────────────────────────────────────
export async function deleteAccount(password: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("No authenticated user found.");

  // Reauthenticate before destructive operation
  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);

  // Delete Firebase Auth account
  // The Cloud Function `onUserDeleted` will handle Firestore cleanup
  await deleteUser(user);

  // Clear local state
  getAuthStore().clearUser();
}

// ─── 7. LISTEN TO AUTH STATE ────────────────────────────────────────
// Call this once in App.tsx on mount.
// Sets up onAuthStateChanged + realtime Firestore profile listener.
let profileUnsub: (() => void) | null = null;

export function listenToAuthState(): () => void {
  const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
    const store = getAuthStore();

    if (firebaseUser) {
      store.setUser(firebaseUser);

      // Tear down any previous profile listener
      if (profileUnsub) profileUnsub();

      // Attach realtime Firestore profile sync
      profileUnsub = onSnapshot(
        doc(db, "users", firebaseUser.uid),
        (snap) => {
          if (snap.exists()) {
            store.setUserProfile(snap.data() as UserDoc);
          }
        },
        (error) => {
          console.error("Profile sync error:", error);
        }
      );
    } else {
      // Signed out
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }
      store.clearUser();
    }
  });

  // Return a cleanup function that tears down everything
  return () => {
    unsubAuth();
    if (profileUnsub) {
      profileUnsub();
      profileUnsub = null;
    }
  };
}

// ─── UTILITY: Wait for a Firestore doc to appear ────────────────────
async function waitForDoc(
  path: string,
  timeoutMs: number
): Promise<boolean> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const snap = await getDoc(doc(db, path));
    if (snap.exists()) return true;
    await new Promise((r) => setTimeout(r, 500)); // Poll every 500ms
  }

  return false;
}
