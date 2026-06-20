const mockPutItem = jest.fn();

jest.mock("../../../services/dynamo", () => ({
  putItem: (item: unknown) => mockPutItem(item),
}));
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { handler } from ".";
import { Context, Callback } from "aws-lambda";

const mockContext = {} as Context;
const mockCallback = jest.fn() as Callback;

describe("items/POST", () => {
  beforeEach(() => {
    mockPutItem.mockReset();
  });

  it("returns 400 when there is no body", async () => {
    const event = { pathParameters: { id: "id-123" } } as unknown as APIGatewayProxyEvent;
    const result = (await handler(event, mockContext, mockCallback)) as APIGatewayProxyResult;
    expect(result.statusCode).toEqual(400);
    expect(result.body).toEqual('"No body on request"');
  });

  it("returns 400 when body fails schema validation", async () => {
    const event = {
      pathParameters: { id: "id-123" },
      body: { test: "test1" },
    } as unknown as APIGatewayProxyEvent;
    const result = (await handler(event, mockContext, mockCallback)) as APIGatewayProxyResult;
    expect(result.statusCode).toEqual(400);
    expect(result.body).toEqual('"ValidationError: \\"id\\" is required"');
  });

  it("returns 201 when item is created successfully", async () => {
    const event = {
      pathParameters: { id: "id-123" },
      body: { id: "id-123" },
    } as unknown as APIGatewayProxyEvent;
    mockPutItem.mockResolvedValue({});
    const result = (await handler(event, mockContext, mockCallback)) as APIGatewayProxyResult;
    expect(result.statusCode).toEqual(201);
    expect(result.body).toEqual('"Item created"');
  });
});
