import { APIGatewayProxyHandler, APIGatewayProxyEvent } from "aws-lambda";
import { itemSchema } from "../../../schema";
import { updateItem } from "../../../services/dynamo";
import { Item } from "../../../types";

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
) => {
  try {
    if (!event.pathParameters)
      return { statusCode: 400, body: JSON.stringify("No path parameters on request") };
    if (!event.pathParameters.id)
      return { statusCode: 400, body: JSON.stringify("No id on request") };

    if (!event.body)
      return { statusCode: 400, body: JSON.stringify("No body on request") };

    const id = event.pathParameters.id;
    const rawBody = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const body = rawBody as Partial<Omit<Item, "id">>;

    const validateResults = itemSchema.validate({ id, ...body });
    if (validateResults.error) {
      return {
        statusCode: 400,
        body: JSON.stringify(validateResults.error.toString()),
      };
    }
    await updateItem(id, body);

    return { statusCode: 200, body: JSON.stringify("Item updated") };
  } catch (error) {
    if (error instanceof Error) {
      return { statusCode: 500, body: JSON.stringify(error.message) };
    }
    return { statusCode: 500, body: "Internal server error" };
  }
};
