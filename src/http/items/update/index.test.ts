const mockUpdateItem = jest.fn();

jest.mock("../../../services/dynamo", () => ({
  updateItem: (id: string, updates: unknown) => mockUpdateItem(id, updates),
}));
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { handler } from ".";
import { Context, Callback } from "aws-lambda";

const mockContext = {} as Context;
const mockCallback = jest.fn() as Callback;

describe("items/UPDATE", () => {
  beforeEach(() => {
    mockUpdateItem.mockReset();
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

  it("returns 400 when there is no body", async () => {
    const event = { pathParameters: { id: "id-123" } } as unknown as APIGatewayProxyEvent;
    const result = (await handler(event, mockContext, mockCallback)) as APIGatewayProxyResult;
    expect(result.statusCode).toEqual(400);
    expect(result.body).toEqual('"No body on request"');
  });

  it("returns 200 when item is updated successfully", async () => {
    const event = {
      pathParameters: { id: "id-123" },
      body: { name: "Updated Name" },
    } as unknown as APIGatewayProxyEvent;
    mockUpdateItem.mockResolvedValue({});
    const result = (await handler(event, mockContext, mockCallback)) as APIGatewayProxyResult;
    expect(result.statusCode).toEqual(200);
    expect(result.body).toEqual('"Item updated"');
  });
});
