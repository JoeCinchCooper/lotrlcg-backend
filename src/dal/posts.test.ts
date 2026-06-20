import { DynamoDBDocumentClient, GetCommand, QueryCommand, TransactWriteCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { createPost, getPostMeta, getPostBySlug, getPublishedFeed, listAuthorPosts, getPostWithComments, updatePost, deletePost } from "./posts";
import { encodeCursor } from "./keys";
import { Post } from "./types";

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
  process.env.TABLE_NAME = "BlogTable";
});

const basePost: Post = {
  id: "post-1",
  slug: "hello-world",
  title: "Hello World",
  body: "<p>Hello</p>",
  authorId: "user-1",
  status: "published",
  tags: ["news"],
  publishedAt: "2024-01-01T00:00:00.000Z",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  commentCount: 0,
};

describe("createPost", () => {
  it("writes post META and tag items via TransactWrite", async () => {
    ddbMock.on(TransactWriteCommand).resolves({});
    await expect(createPost(basePost)).resolves.toBeUndefined();
    const calls = ddbMock.commandCalls(TransactWriteCommand);
    expect(calls).toHaveLength(1);
    const items = calls[0].args[0].input.TransactItems ?? [];
    // post META + one tag
    expect(items).toHaveLength(2);
    expect(items[0].Put?.Item?.PK).toBe("POST#post-1");
    expect(items[0].Put?.Item?.SK).toBe("META");
    expect(items[1].Put?.Item?.PK).toBe("TAG#news");
  });

  it("sets GSI2 attributes only for published posts", async () => {
    ddbMock.on(TransactWriteCommand).resolves({});
    const draft: Post = { ...basePost, status: "draft", publishedAt: undefined };
    await createPost(draft);
    const items = ddbMock.commandCalls(TransactWriteCommand)[0].args[0].input.TransactItems ?? [];
    expect(items[0].Put?.Item?.GSI2PK).toBeUndefined();
  });
});

describe("getPostMeta", () => {
  it("returns undefined when item not found", async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });
    await expect(getPostMeta("missing")).resolves.toBeUndefined();
  });

  it("returns post stripping DynamoDB key attributes", async () => {
    ddbMock.on(GetCommand).resolves({
      Item: { PK: "POST#post-1", SK: "META", ...basePost },
    });
    const post = await getPostMeta("post-1");
    expect(post?.id).toBe("post-1");
    expect(post).not.toHaveProperty("PK");
    expect(post).not.toHaveProperty("SK");
  });
});

describe("getPostBySlug", () => {
  it("queries GSI3 with correct key", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [{ PK: "POST#post-1", SK: "META", ...basePost }] });
    const post = await getPostBySlug("hello-world");
    expect(post?.slug).toBe("hello-world");
    const call = ddbMock.commandCalls(QueryCommand)[0];
    expect(call.args[0].input.IndexName).toBe("GSI3");
    expect(call.args[0].input.ExpressionAttributeValues?.[":pk"]).toBe("SLUG#hello-world");
  });
});

describe("getPublishedFeed", () => {
  it("queries GSI2 descending", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });
    await getPublishedFeed();
    const call = ddbMock.commandCalls(QueryCommand)[0];
    expect(call.args[0].input.IndexName).toBe("GSI2");
    expect(call.args[0].input.ScanIndexForward).toBe(false);
    expect(call.args[0].input.ExpressionAttributeValues?.[":pk"]).toBe("STATUS#PUBLISHED");
  });

  it("encodes next cursor from LastEvaluatedKey", async () => {
    const lek = { PK: "POST#post-1", SK: "META", GSI2PK: "STATUS#PUBLISHED", GSI2SK: "2024-01-01T00:00:00.000Z" };
    ddbMock.on(QueryCommand).resolves({ Items: [], LastEvaluatedKey: lek });
    const page = await getPublishedFeed();
    expect(page.nextCursor).toBe(encodeCursor(lek));
  });

  it("passes decoded cursor as ExclusiveStartKey", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });
    const lek = { PK: "POST#post-1", SK: "META" };
    const cursor = encodeCursor(lek);
    await getPublishedFeed(cursor);
    const call = ddbMock.commandCalls(QueryCommand)[0];
    expect(call.args[0].input.ExclusiveStartKey).toEqual(lek);
  });
});

describe("listAuthorPosts", () => {
  it("queries GSI1 with correct author partition key", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });
    await listAuthorPosts("user-1");
    const call = ddbMock.commandCalls(QueryCommand)[0];
    expect(call.args[0].input.IndexName).toBe("GSI1");
    expect(call.args[0].input.ExpressionAttributeValues?.[":pk"]).toBe("USER#user-1");
  });
});

describe("getPostWithComments", () => {
  it("returns post and comments from single query", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { PK: "POST#post-1", SK: "META", ...basePost },
        { PK: "POST#post-1", SK: "COMMENT#2024-01-01T00:00:00.000Z#cid-1", id: "cid-1", body: "Nice!" },
      ],
    });
    const { post, comments } = await getPostWithComments("post-1");
    expect(post?.id).toBe("post-1");
    expect(comments).toHaveLength(1);
  });
});

describe("updatePost", () => {
  it("no-ops when updates is empty", async () => {
    await updatePost("post-1", {});
    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0);
  });

  it("adds GSI2 attributes when publishing", async () => {
    ddbMock.on(UpdateCommand).resolves({});
    await updatePost("post-1", { status: "published", publishedAt: "2024-02-01T00:00:00.000Z" });
    const call = ddbMock.commandCalls(UpdateCommand)[0];
    expect(call.args[0].input.ExpressionAttributeValues?.[":g2pk"]).toBe("STATUS#PUBLISHED");
  });
});

describe("deletePost", () => {
  it("sends DeleteCommand with correct key", async () => {
    ddbMock.on(DeleteCommand).resolves({});
    await deletePost("post-1");
    const call = ddbMock.commandCalls(DeleteCommand)[0];
    expect(call.args[0].input.Key).toEqual({ PK: "POST#post-1", SK: "META" });
  });
});
