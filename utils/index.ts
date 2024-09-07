import { Request } from "express";

const generateImageUrl = (
  req: Request,
  imagePath: string,
  port: number | string,
  protocol?: string
): string => {
  const reqProtocol = protocol || (req.secure ? "https" : "http");

  const host = req.headers.host || `localhost:${port}`;

  return `${reqProtocol}://${host}${imagePath}`;
};

export { generateImageUrl };
