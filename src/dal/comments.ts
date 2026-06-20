import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client";
import { commentKey, encodeCursor, decodeCursor } from "./keys";
import { Comment, Page } from "./types";

const PAGE_SIZE = 50;

export async function addComment(comment: Comment): Promise<void> {
  const { postId, id, createdAt } = comment;
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...commentKey(postId, createdAt, id),
        ...comment,
      },
    })
  );
}

export async function listComments(
  postId: string,
  cursor?: string
): Promise<Page<Comment>> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `POST#${postId}`,
        ":prefix": "COMMENT#",
      },
      ScanIndexForward: true,
      Limit: PAGE_SIZE,
      ExclusiveStartKey: cursor ? decodeCursor(cursor) : undefined,
    })
  );

  const items = (result.Items ?? []).map((item) => {
    const { PK, SK, ...rest } = item as Record<string, unknown>;
    void PK; void SK;
    return rest as unknown as Comment;
  });

  return {
    items,
    nextCursor: result.LastEvaluatedKey
      ? encodeCursor(result.LastEvaluatedKey)
      : undefined,
  };
}
