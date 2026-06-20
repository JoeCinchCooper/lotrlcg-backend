import { APIGatewayProxyHandler, APIGatewayProxyEvent } from "aws-lambda";
import { itemSchema } from "../../../schema";
import { putItem } from "../../../services/dynamo";
import { Item } from "../../../types";

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
) => {
  try {
    if (!event.body)
      return { statusCode: 400, body: JSON.stringify("No body on request") };

    const rawBody = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const body = rawBody as Item;

    const validateResults = itemSchema.validate(body);
    if (validateResults.error) {
      return {
        statusCode: 400,
        body: JSON.stringify(validateResults.error.toString()),
      };
    }
    await putItem(validateResults.value);

    return { statusCode: 201, body: JSON.stringify("Item created") };
  } catch (error) {
    if (error instanceof Error) {
      return { statusCode: 500, body: JSON.stringify(error.message) };
    }
    return { statusCode: 500, body: "Internal server error" };
  }
};
