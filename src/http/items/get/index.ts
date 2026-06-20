import {
  APIGatewayProxyHandler,
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from "aws-lambda";
import { getItem } from "../../../services/dynamo";

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.pathParameters)
      return { statusCode: 400, body: JSON.stringify("No path parameters on request") };
    if (!event.pathParameters.id)
      return { statusCode: 400, body: JSON.stringify("No id on request") };

    const id = event.pathParameters.id;
    const result = await getItem(id);

    if (!result)
      return { statusCode: 404, body: JSON.stringify(`No item found for id: ${id}`) };

    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (error) {
    if (error instanceof Error) {
      return { statusCode: 500, body: JSON.stringify(error.message) };
    }
    return { statusCode: 500, body: "Internal server error" };
  }
};
