import express, { Request, Response, NextFunction } from "express";
import formidable, { File as FormidableFile, Fields, Files } from "formidable";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import { generateImageUrl } from "./utils"; // Adjust the import path
import cors from "cors";
const app = express();
export const PORT = process.env.PORT || 4300;
import imageCompressorRoute from "./routes/image-compressor";
// Middleware to disable bodyParser for multipart form data
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.headers["content-type"]?.startsWith("multipart/form-data")) {
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.use("/processed", express.static(path.join(__dirname, "processed")));

app.use(cors());
app.use("/", imageCompressorRoute);
app.get("/", (req, res) => {
  res.status(200).send("Image Tools API");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
