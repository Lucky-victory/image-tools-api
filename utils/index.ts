import { Request } from "express";
import { SnowflakeIdGenerator } from "@green-auth/snowflake-unique-id";
const IS_PROD = process.env.NODE_ENV === "production";
const generator = new SnowflakeIdGenerator({
  nodeId: 12,
  nodeBits: 16,
  sequenceBits: 16,
});
const generateImageUrl = (
  req: Request,
  imagePath: string,
  port: number | string,
  protocol?: string
): string => {
  const reqProtocol = protocol || (req.secure || IS_PROD ? "https" : "http");

  const host = req.headers.host || `localhost:${port}`;

  return `${reqProtocol}://${host}${imagePath}`;
};

const generateUniqueImageId = (len = 12): string => {
  return generator.urlSafeId().substring(-1, len);
};
export { generateImageUrl, generateUniqueImageId };
