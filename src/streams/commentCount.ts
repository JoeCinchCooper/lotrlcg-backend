import { DynamoDBStreamEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME ?? "";

export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {
  for (const record of event.Records) {
    const sk = record.dynamodb?.Keys?.["SK"]?.S;
    if (!sk?.startsWith("COMMENT#")) continue;

    const pk = record.dynamodb?.Keys?.["PK"]?.S;
    if (!pk?.startsWith("POST#")) continue;

    const postId = pk.slice("POST#".length);

    if (record.eventName === "INSERT") {
      await incrementCommentCount(postId, 1);
    } else if (record.eventName === "REMOVE") {
      await incrementCommentCount(postId, -1);
    }
  }
};

async function incrementCommentCount(postId: string, delta: number): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `POST#${postId}`, SK: "META" },
      UpdateExpression: "ADD commentCount :delta",
      ExpressionAttributeValues: { ":delta": delta },
    })
  );
}
