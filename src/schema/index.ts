import Joi from "joi";

export const itemSchema = Joi.object({
  id: Joi.string().required(),
  type: Joi.string().optional(),
}).unknown(true);
