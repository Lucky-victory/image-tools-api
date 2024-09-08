import express, { Request, Response, NextFunction } from "express";
import path from "path";
import cors from "cors";
const app = express();
export const PORT = process.env.PORT || 4300;
import imageCompressorRoute from "./routes/image-compressor";
import dropFolderRoute from "./routes/drop-folder";
import morgan from "morgan";

// Middleware to disable bodyParser for multipart form data
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.headers["content-type"]?.startsWith("multipart/form-data")) {
    next();
  } else {
    express.json()(req, res, next);
  }
});
app.use(morgan("dev"));
app.use("/processed", express.static(path.join(__dirname, "processed")));

app.use(cors());
app.use("/api/image-compressor", imageCompressorRoute);
app.use("/api/drop-folder", dropFolderRoute);
app.get("/", (req, res) => {
  res.status(200).send("Image Tools API");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
