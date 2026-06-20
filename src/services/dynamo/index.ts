import { ConditionalCheckFailedException, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { Item } from "../../types";

const client = new DynamoDBClient({});

const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME ?? "";

export const putItem = async (item: Item): Promise<void> => {
  try {
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
        ConditionExpression: "attribute_not_exists(id)",
      })
    );
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      throw new Error(`Item already exists: ${item.id}`);
    }
    throw err;
  }
};

export const getItem = async (id: string): Promise<Item | undefined> => {
  const result = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { id },
    })
  );
  if (!result.Item) return undefined;
  return result.Item as Item;
};

export const updateItem = async (
  id: string,
  updates: Partial<Omit<Item, "id">>
): Promise<void> => {
  if (Object.keys(updates).length === 0) return;

  const updateExpressions: string[] = [];
  const expressionAttributeValues: Record<string, unknown> = {};
  const expressionAttributeNames: Record<string, string> = {};

  Object.entries(updates).forEach(([key, value], index) => {
    const attrName = `#attr${index}`;
    const attrValue = `:val${index}`;
    updateExpressions.push(`${attrName} = ${attrValue}`);
    expressionAttributeNames[attrName] = key;
    expressionAttributeValues[attrValue] = value;
  });

  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    })
  );
};

export const deleteItem = async (id: string): Promise<void> => {
  await ddb.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { id },
    })
  );
};

export const queryByType = async (type: string): Promise<Item[]> => {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "TypeIndex",
      KeyConditionExpression: "#type = :type",
      ExpressionAttributeNames: { "#type": "type" },
      ExpressionAttributeValues: { ":type": type },
    })
  );
  return (result.Items ?? []) as Item[];
};
