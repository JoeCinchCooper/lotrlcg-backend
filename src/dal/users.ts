import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client";
import { userKey } from "./keys";
import { Author } from "./types";

export async function getAuthor(id: string): Promise<Author | undefined> {
  const result = await ddb.send(
    new GetCommand({ TableName: TABLE_NAME, Key: userKey(id) })
  );
  if (!result.Item) return undefined;
  const { PK, SK, ...rest } = result.Item as Record<string, unknown>;
  void PK; void SK;
  return rest as unknown as Author;
}

export async function putAuthor(author: Author): Promise<void> {
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { ...userKey(author.id), ...author },
    })
  );
}
