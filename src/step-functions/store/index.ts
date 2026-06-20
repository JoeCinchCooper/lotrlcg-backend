import { Item } from "../../types";
import { putItem } from "../../services/dynamo";

export const handler = async (event: Item): Promise<{ id: string }> => {
  await putItem(event);
  return { id: event.id };
};
