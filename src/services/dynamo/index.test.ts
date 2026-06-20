import { mockClient } from "aws-sdk-client-mock";
import {
  DeleteCommand,
  DeleteCommandInput,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  UpdateCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { deleteItem, getItem, putItem, queryByType, updateItem } from "./";
import { Item } from "../../types";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";

const ddbMock = mockClient(DynamoDBDocumentClient);
const mockItem: Item = {
  id: "item-123",
  name: "Test Item",
  count: 42,
};

describe("dynamo", () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  describe("getItem", () => {
    beforeEach(() => {
      ddbMock.reset();
    });

    it("returns an item when one is present", async () => {
      ddbMock.on(GetCommand).resolves({ Item: mockItem });

      const result = await getItem("item-123");

      expect(result).toEqual(mockItem);
      expect(ddbMock.calls()).toHaveLength(1);
      expect(ddbMock.calls()[0].args[0].input).toEqual({
        TableName: expect.any(String),
        Key: { id: "item-123" },
      });
    });

    it("returns undefined when item does not exist", async () => {
      ddbMock.on(GetCommand).resolves({ Item: undefined });

      const result = await getItem("missing-item");

      expect(result).toBeUndefined();
    });
  });

  describe("putItem", () => {
    beforeEach(() => {
      ddbMock.reset();
    });

    it("successfully inserts a new item", async () => {
      ddbMock.on(PutCommand).resolves({});

      await expect(putItem(mockItem)).resolves.toBeUndefined();

      expect(ddbMock.calls()).toHaveLength(1);
      expect(ddbMock.calls()[0].args[0].input).toEqual({
        TableName: expect.any(String),
        Item: mockItem,
        ConditionExpression: "attribute_not_exists(id)",
      });
    });

    it("throws a friendly error when item already exists", async () => {
      ddbMock.on(PutCommand).rejects(
        new ConditionalCheckFailedException({
          message: "Conditional request failed",
          $metadata: {},
        })
      );

      await expect(putItem(mockItem)).rejects.toThrow(
        "Item already exists: item-123"
      );
    });

    it("rethrows unexpected DynamoDB errors", async () => {
      ddbMock.on(PutCommand).rejects(new Error("DynamoDB is down"));

      await expect(putItem(mockItem)).rejects.toThrow("DynamoDB is down");
    });
  });

  describe("updateItem", () => {
    beforeEach(() => {
      ddbMock.reset();
    });

    it("does nothing when updates object is empty", async () => {
      await expect(updateItem("item-123", {})).resolves.toBeUndefined();

      expect(ddbMock.calls()).toHaveLength(0);
    });

    it("builds correct UpdateCommand for provided fields", async () => {
      ddbMock.on(UpdateCommand).resolves({});

      await updateItem("item-123", { name: "Test Item", count: 42 });

      expect(ddbMock.calls()).toHaveLength(1);

      const input = ddbMock.calls()[0].args[0].input as UpdateCommandInput;

      expect(input).toEqual({
        TableName: expect.any(String),
        Key: { id: "item-123" },
        UpdateExpression: "SET #attr0 = :val0, #attr1 = :val1",
        ExpressionAttributeNames: {
          "#attr0": "name",
          "#attr1": "count",
        },
        ExpressionAttributeValues: {
          ":val0": "Test Item",
          ":val1": 42,
        },
      });
    });

    it("rethrows DynamoDB errors", async () => {
      ddbMock.on(UpdateCommand).rejects(new Error("Update failed"));

      await expect(
        updateItem("item-123", { name: "Test" })
      ).rejects.toThrow("Update failed");
    });
  });

  describe("deleteItem", () => {
    beforeEach(() => {
      ddbMock.reset();
    });

    it("successfully deletes an item", async () => {
      ddbMock.on(DeleteCommand).resolves({});

      await expect(deleteItem("item-123")).resolves.toBeUndefined();

      expect(ddbMock.calls()).toHaveLength(1);

      const input = ddbMock.calls()[0].args[0].input as DeleteCommandInput;

      expect(input).toEqual({
        TableName: expect.any(String),
        Key: { id: "item-123" },
      });
    });

    it("rethrows DynamoDB errors", async () => {
      ddbMock.on(DeleteCommand).rejects(new Error("Delete failed"));

      await expect(deleteItem("item-123")).rejects.toThrow("Delete failed");
    });
  });
});
