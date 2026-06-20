import { Item } from "../../types";

export const handler = async (event: Item): Promise<Item> => {
  return { ...event, processedAt: new Date().toISOString() };
};
