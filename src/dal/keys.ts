export const postKey = (id: string) => ({ PK: `POST#${id}`, SK: "META" });

export const userKey = (id: string) => ({ PK: `USER#${id}`, SK: "PROFILE" });

export const commentKey = (postId: string, ts: string, cid: string) => ({
  PK: `POST#${postId}`,
  SK: `COMMENT#${ts}#${cid}`,
});

export const tagKey = (tag: string, publishedAt: string, id: string) => ({
  PK: `TAG#${tag}`,
  SK: `POST#${publishedAt}#${id}`,
});

// GSI3 key for slug lookups (written onto the post META item)
export const slugGsiKey = (slug: string) => ({
  GSI3PK: `SLUG#${slug}`,
  GSI3SK: "META",
});

export const encodeCursor = (key: Record<string, unknown>): string =>
  Buffer.from(JSON.stringify(key)).toString("base64");

export const decodeCursor = (cursor: string): Record<string, unknown> =>
  JSON.parse(Buffer.from(cursor, "base64").toString("utf8")) as Record<string, unknown>;
