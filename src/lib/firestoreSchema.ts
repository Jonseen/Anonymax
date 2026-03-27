import { Timestamp } from "firebase/firestore";

/**
 * ANONYMAX MASTER FIREBASE SCHEMA
 * Complete TypeScript interfaces mirroring the exact Firestore NoSQL structure.
 */

export interface UserSettings {
  defaultVisibility: 'everyone' | 'ghosts';
  allowReplies: boolean;
}

export interface UserDoc {
  uid: string;
  mask?: string;              // field used in existing app code
  maskIcon: string;           // canonical field name from schema spec
  displayName: string;
  bio: string;
  createdAt: Timestamp;
  lastSeen: Timestamp;
  followerCount: number;
  followingCount: number;
  postCount: number;
  isAnonymous: boolean;
  settings: UserSettings;
}

export interface PostDoc {
  authorId: string;
  authorMask: string;
  authorName: string;
  content: string;
  imageUrl: string | null;
  visibility: 'everyone' | 'ghosts';
  createdAt: Timestamp;
  likeCount: number;
  echoCount: number;
  commentCount: number;
  isEcho: boolean;
  originalPostId: string | null;
  tags: string[];            // array of lowercase string keywords for fuzzy searching
  isDeleted: boolean;        // soft-delete toggle for data retention
}

export interface PostLikeDoc {
  userId: string;
  createdAt: Timestamp;
}

export interface CommentDoc {
  authorId: string;
  authorMask: string;
  authorName: string;
  content: string;
  createdAt: Timestamp;
  likeCount: number;
  parentCommentId: string | null; // null if top-level, contains ID if nested reply
}

export interface FollowDoc {
  followerId: string;
  followingId: string;
  createdAt: Timestamp;
}

export interface NotificationDoc {
  type: 'like' | 'echo' | 'comment' | 'follow' | 'reply'; // Defines notification style/action
  actorId: string;
  actorName: string;
  actorMask: string;
  postId: string | null;
  commentId: string | null;
  read: boolean;
  createdAt: Timestamp;
}

export interface SavedSignalDoc {
  postId: string;
  savedAt: Timestamp;
}

export interface ReportDoc {
  reporterId: string;
  targetId: string;          // Maps to a postId or a userId
  targetType: 'post' | 'user'; 
  reason: string;
  createdAt: Timestamp;
  resolved: boolean;
}
