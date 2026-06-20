import { itemSchema } from "../../schema";
import { Item } from "../../types";

export const handler = async (event: Item): Promise<Item> => {
  const { error, value } = itemSchema.validate(event);
  if (error) throw new Error(`Validation failed: ${error.message}`);
  return value;
};
