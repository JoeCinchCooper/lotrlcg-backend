const mockGetItem = jest.fn();

jest.mock("../../../services/dynamo", () => ({
  getItem: (id: string) => mockGetItem(id),
}));
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { handler } from ".";
import { Context, Callback } from "aws-lambda";

const mockContext = {} as Context;
const mockCallback = jest.fn() as Callback;

describe("items/GET", () => {
  beforeEach(() => {
    mockGetItem.mockReset();
  });

  it("returns 400 when there are no path parameters", async () => {
    const event = { pathParameters: null } as APIGatewayProxyEvent;
    const result = (await handler(event, mockContext, mockCallback)) as APIGatewayProxyResult;
    expect(result.statusCode).toEqual(400);
    expect(result.body).toEqual('"No path parameters on request"');
  });

  it("returns 400 when id is missing from path parameters", async () => {
    const event = { pathParameters: { other: "test" } } as unknown as APIGatewayProxyEvent;
    const result = (await handler(event, mockContext, mockCallback)) as APIGatewayProxyResult;
    expect(result.statusCode).toEqual(400);
    expect(result.body).toEqual('"No id on request"');
  });

  it("returns 404 when item is not found", async () => {
    const event = { pathParameters: { id: "item-123" } } as unknown as APIGatewayProxyEvent;
    mockGetItem.mockResolvedValue(undefined);
    const result = (await handler(event, mockContext, mockCallback)) as APIGatewayProxyResult;
    expect(result.statusCode).toEqual(404);
  });

  it("returns 200 with item when found", async () => {
    const event = { pathParameters: { id: "item-123" } } as unknown as APIGatewayProxyEvent;
    mockGetItem.mockResolvedValue({ id: "item-123", name: "Test" });
    const result = (await handler(event, mockContext, mockCallback)) as APIGatewayProxyResult;
    expect(result.statusCode).toEqual(200);
    expect(JSON.parse(result.body)).toEqual({ id: "item-123", name: "Test" });
  });
});
