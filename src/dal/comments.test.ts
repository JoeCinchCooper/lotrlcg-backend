import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { addComment, listComments } from "./comments";
import { encodeCursor } from "./keys";
import { Comment } from "./types";

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
  process.env.TABLE_NAME = "BlogTable";
});

const baseComment: Comment = {
  id: "cid-1",
  postId: "post-1",
  authorName: "Alice",
  body: "<p>Great post!</p>",
  createdAt: "2024-01-02T00:00:00.000Z",
};

describe("addComment", () => {
  it("writes comment with correct PK/SK", async () => {
    ddbMock.on(PutCommand).resolves({});
    await addComment(baseComment);
    const call = ddbMock.commandCalls(PutCommand)[0];
    expect(call.args[0].input.Item?.PK).toBe("POST#post-1");
    expect(call.args[0].input.Item?.SK).toBe("COMMENT#2024-01-02T00:00:00.000Z#cid-1");
  });
});

describe("listComments", () => {
  it("queries with begins_with on COMMENT# prefix", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });
    await listComments("post-1");
    const call = ddbMock.commandCalls(QueryCommand)[0];
    expect(call.args[0].input.ExpressionAttributeValues?.[":pk"]).toBe("POST#post-1");
    expect(call.args[0].input.ExpressionAttributeValues?.[":prefix"]).toBe("COMMENT#");
  });

  it("paginates using cursor round-trip", async () => {
    const lek = { PK: "POST#post-1", SK: "COMMENT#2024-01-02T00:00:00.000Z#cid-1" };
    ddbMock.on(QueryCommand).resolves({ Items: [], LastEvaluatedKey: lek });
    const page = await listComments("post-1");
    expect(page.nextCursor).toBe(encodeCursor(lek));

    ddbMock.reset();
    ddbMock.on(QueryCommand).resolves({ Items: [] });
    await listComments("post-1", page.nextCursor);
    const call = ddbMock.commandCalls(QueryCommand)[0];
    expect(call.args[0].input.ExclusiveStartKey).toEqual(lek);
  });
});
