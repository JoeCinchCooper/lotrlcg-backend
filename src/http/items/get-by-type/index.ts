import {
  APIGatewayProxyHandler,
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from "aws-lambda";
import { queryByType } from "../../../services/dynamo";

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.pathParameters)
      return { statusCode: 400, body: JSON.stringify("No path parameters on request") };
    if (!event.pathParameters.type)
      return { statusCode: 400, body: JSON.stringify("No type on request") };

    const type = event.pathParameters.type;
    const result = await queryByType(type);

    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (error) {
    if (error instanceof Error) {
      return { statusCode: 500, body: JSON.stringify(error.message) };
    }
    return { statusCode: 500, body: "Internal server error" };
  }
};
