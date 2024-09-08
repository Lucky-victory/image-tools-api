import { Request, Response, NextFunction } from "express";
import { UAParser } from "ua-parser-js";
import fs from "fs/promises";
import path from "path";
import { createStream } from "rotating-file-stream";

interface AnalyticsData {
  ip: string;
  origin: string;
  referer: string;
  userAgent: {
    browser: string;
    os: string;
    device: string;
  };
  timestamp: string;
  path: string;
  method: string;
}

interface AnalyticsConfig {
  logDir: string;
  logFilePrefix: string;
  rotationInterval: string;
  maxLogFiles: number;
  logToConsole: boolean;
}

const defaultConfig: AnalyticsConfig = {
  logDir: path.join(process.cwd(), "logs"),
  logFilePrefix: "analytics",
  rotationInterval: "1d",
  maxLogFiles: 7,
  logToConsole: true,
};

let rotatingLogStream: any;

export function initializeAnalytics(config: Partial<AnalyticsConfig> = {}) {
  const fullConfig: AnalyticsConfig = { ...defaultConfig, ...config };

  // Ensure log directory exists
  fs.mkdir(fullConfig.logDir, { recursive: true }).catch(console.error);

  // Create a rotating write stream
  rotatingLogStream = createStream(
    (time, index) => {
      if (!time) return `${fullConfig.logFilePrefix}.log`;

      const year = (time as Date).getFullYear();
      const month = ((time as Date).getMonth() + 1).toString().padStart(2, "0");
      const day = (time as Date).getDate().toString().padStart(2, "0");
      return `${fullConfig.logFilePrefix}-${year}${month}${day}-${index}.log`;
    },
    {
      interval: fullConfig.rotationInterval,
      path: fullConfig.logDir,
      maxFiles: fullConfig.maxLogFiles,
    }
  );

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const uaParser = new UAParser(req.headers["user-agent"]);

      const analyticsData: AnalyticsData = {
        ip: req.ip || req.socket.remoteAddress || "",
        origin: req.get("origin") || "",
        referer: req.get("referer") || "",
        userAgent: {
          browser: uaParser.getBrowser().name || "",
          os: uaParser.getOS().name || "",
          device: uaParser.getDevice().model || "",
        },
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
      };

      // Log to file
      rotatingLogStream.write(JSON.stringify(analyticsData) + "\n");

      // Log to console if enabled
      if (fullConfig.logToConsole) {
        console.log("Analytics:", JSON.stringify(analyticsData, null, 2));
      }

      // Attach the analytics data to the request object for further use if needed
      req.analyticsData = analyticsData;

      next();
    } catch (error) {
      console.error("Error in analytics middleware:", error);
      next(); // Continue to the next middleware even if there's an error
    }
  };
}

// Extend the Express Request interface to include analyticsData
declare global {
  namespace Express {
    interface Request {
      analyticsData?: AnalyticsData;
    }
  }
}
