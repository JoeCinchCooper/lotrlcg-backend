export interface Post {
  id: string;
  slug: string;
  title: string;
  body: string;
  authorId: string;
  status: "draft" | "published";
  tags: string[];
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  commentCount: number;
}

export interface Comment {
  id: string;
  postId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface Author {
  id: string;
  name: string;
  bio?: string;
  createdAt: string;
}

export type Cursor = string; // base64-encoded LastEvaluatedKey

export interface Page<T> {
  items: T[];
  nextCursor?: Cursor;
}
