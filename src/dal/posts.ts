import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  TransactWriteCommandInput,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client";
import { postKey, tagKey, slugGsiKey, encodeCursor, decodeCursor } from "./keys";
import { Post, Page } from "./types";

const PAGE_SIZE = 20;

type PostItem = Post & {
  PK: string;
  SK: string;
  GSI1PK?: string;
  GSI1SK?: string;
  GSI2PK?: string;
  GSI2SK?: string;
  GSI3PK?: string;
  GSI3SK?: string;
};

function toItem(post: Post): PostItem {
  const base: PostItem = {
    ...post,
    ...postKey(post.id),
    // GSI1: author's posts
    GSI1PK: `USER#${post.authorId}`,
    GSI1SK: post.publishedAt ?? post.createdAt,
    // GSI3: by slug
    ...slugGsiKey(post.slug),
  };
  // GSI2 is sparse — only written on published posts
  if (post.status === "published" && post.publishedAt) {
    base.GSI2PK = "STATUS#PUBLISHED";
    base.GSI2SK = post.publishedAt;
  }
  return base;
}

function fromItem(item: Record<string, unknown>): Post {
  const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, ...rest } = item;
  void PK; void SK; void GSI1PK; void GSI1SK; void GSI2PK; void GSI2SK; void GSI3PK; void GSI3SK;
  return rest as unknown as Post;
}

export async function createPost(post: Post): Promise<void> {
  const item = toItem(post);
  const transactItems: TransactWriteCommandInput["TransactItems"] = [
    {
      Put: {
        TableName: TABLE_NAME,
        Item: item,
        ConditionExpression: "attribute_not_exists(PK)",
      },
    },
    ...post.tags.map((tag) => ({
      Put: {
        TableName: TABLE_NAME,
        Item: {
          ...tagKey(tag, post.publishedAt ?? post.createdAt, post.id),
          postId: post.id,
          title: post.title,
          slug: post.slug,
        },
      },
    })),
  ];

  await ddb.send(new TransactWriteCommand({ TransactItems: transactItems }));
}

export async function getPostMeta(id: string): Promise<Post | undefined> {
  const result = await ddb.send(
    new GetCommand({ TableName: TABLE_NAME, Key: postKey(id) })
  );
  return result.Item ? fromItem(result.Item) : undefined;
}

export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI3",
      KeyConditionExpression: "GSI3PK = :pk AND GSI3SK = :sk",
      ExpressionAttributeValues: { ":pk": `SLUG#${slug}`, ":sk": "META" },
      Limit: 1,
    })
  );
  const item = result.Items?.[0];
  return item ? fromItem(item) : undefined;
}

export async function updatePost(
  id: string,
  updates: Partial<Omit<Post, "id">>
): Promise<void> {
  if (Object.keys(updates).length === 0) return;

  const expressions: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  Object.entries(updates).forEach(([key, value], i) => {
    const n = `#a${i}`;
    const v = `:v${i}`;
    expressions.push(`${n} = ${v}`);
    names[n] = key;
    values[v] = value;
  });

  // Maintain GSI2 sparse index
  if (updates.status === "published" && updates.publishedAt) {
    expressions.push("#g2pk = :g2pk", "#g2sk = :g2sk");
    names["#g2pk"] = "GSI2PK";
    names["#g2sk"] = "GSI2SK";
    values[":g2pk"] = "STATUS#PUBLISHED";
    values[":g2sk"] = updates.publishedAt;
  }

  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: postKey(id),
      UpdateExpression: `SET ${expressions.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    })
  );
}

export async function deletePost(id: string): Promise<void> {
  await ddb.send(new DeleteCommand({ TableName: TABLE_NAME, Key: postKey(id) }));
}

export async function getPostWithComments(
  id: string
): Promise<{ post: Post | undefined; comments: unknown[] }> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": `POST#${id}` },
    })
  );

  const items = result.Items ?? [];
  const metaItem = items.find((i) => (i as { SK: string }).SK === "META");
  const commentItems = items.filter((i) =>
    (i as { SK: string }).SK.startsWith("COMMENT#")
  );

  return {
    post: metaItem ? fromItem(metaItem) : undefined,
    comments: commentItems.map((i) => {
      const { PK, SK, ...rest } = i as Record<string, unknown>;
      void PK; void SK;
      return rest;
    }),
  };
}

export async function listAuthorPosts(
  authorId: string,
  cursor?: string
): Promise<Page<Post>> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": `USER#${authorId}` },
      ScanIndexForward: false,
      Limit: PAGE_SIZE,
      ExclusiveStartKey: cursor ? decodeCursor(cursor) : undefined,
    })
  );

  return {
    items: (result.Items ?? []).map(fromItem),
    nextCursor: result.LastEvaluatedKey
      ? encodeCursor(result.LastEvaluatedKey)
      : undefined,
  };
}

export async function getPublishedFeed(cursor?: string): Promise<Page<Post>> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk",
      ExpressionAttributeValues: { ":pk": "STATUS#PUBLISHED" },
      ScanIndexForward: false,
      Limit: PAGE_SIZE,
      ExclusiveStartKey: cursor ? decodeCursor(cursor) : undefined,
    })
  );

  return {
    items: (result.Items ?? []).map(fromItem),
    nextCursor: result.LastEvaluatedKey
      ? encodeCursor(result.LastEvaluatedKey)
      : undefined,
  };
}

export async function listPostsByTag(
  tag: string,
  cursor?: string
): Promise<Page<Post>> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": `TAG#${tag}` },
      ScanIndexForward: false,
      Limit: PAGE_SIZE,
      ExclusiveStartKey: cursor ? decodeCursor(cursor) : undefined,
    })
  );

  return {
    items: (result.Items ?? []).map(fromItem),
    nextCursor: result.LastEvaluatedKey
      ? encodeCursor(result.LastEvaluatedKey)
      : undefined,
  };
}

export async function putPost(post: Post): Promise<void> {
  await ddb.send(
    new PutCommand({ TableName: TABLE_NAME, Item: toItem(post) })
  );
}
