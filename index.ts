import express, { Request, Response, NextFunction } from "express";
import path from "path";
import cors from "cors";
import morgan from "morgan";
import imageCompressorRoute from "./routes/image-compressor";
import dropFolderRoute from "./routes/drop-folder";
import { initializeAnalytics } from "./middleware/analytics"; // Import the analytics middleware

const app = express();
export const PORT = process.env.PORT || 4400;

// Middleware to disable bodyParser for multipart form data
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.headers["content-type"]?.startsWith("multipart/form-data")) {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Logging with Morgan
app.use(morgan("dev"));

app.use(cors({ preflightContinue: true }));
const analyticsMiddleware = initializeAnalytics({
  logFilePrefix: "api-analytics",
  rotationInterval: "1h",
  maxLogFiles: 24,
  logToConsole: true,
});

app.use(analyticsMiddleware);

// Serving static files from the 'public' directory
app.use("/processed", express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "public")));

// Hide the X-Powered-By header
app.disable("x-powered-by");

// Routes for image compression and file handling
app.use("/api/image-compressor", imageCompressorRoute);
app.use("/api/drop-folder", dropFolderRoute);

// Root endpoint for the API
app.get("/", (req: Request, res: Response) => {
  res.status(200).send("Image Tools API");
});

// Global error handler for uncaught errors
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err); // Log the error
  res.status(500).json({ error: "Internal Server Error" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
