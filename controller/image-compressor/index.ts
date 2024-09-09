import mime from "mime-types"; // Import mime-types
import express, { Request, Response, NextFunction } from "express";
import formidable, { File as FormidableFile, Fields, Files } from "formidable";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import { generateImageUrl, generateUniqueImageId } from "../../utils"; // Adjust the import path
import { PORT } from "../../index";
import { ProcessedImage } from "../../types";
import { createReadStream } from "fs";
import JSZip from "jszip";
async function processImage(
  file: FormidableFile,
  format: string,
  quality: number,
  width: number | undefined,
  height: number | undefined,
  outputDir: string,
  id: string,
  req: Request
): Promise<ProcessedImage> {
  const imageBuffer = await fs.readFile(file.filepath);
  const originalSize = imageBuffer.length;
  let sharpImage = sharp(imageBuffer);

  if (width || height) {
    sharpImage = sharpImage.resize(width, height);
  }

  switch (format.toLowerCase()) {
    case "jpeg":
    case "jpg":
      sharpImage = sharpImage.jpeg({ quality });
      break;
    case "png":
      sharpImage = sharpImage.png({ quality });
      break;
    case "webp":
      sharpImage = sharpImage.webp({ quality });
      break;
    default:
      throw new Error("Unsupported format");
  }

  const outputFilename = `${generateUniqueImageId()}-${file.originalFilename?.replace(
    /\.[^/.]+$/,
    ""
  )}.${format}`;
  const outputPath = path.join(outputDir, outputFilename);
  await sharpImage.toFile(outputPath);

  const newSize = (await fs.stat(outputPath)).size;

  // Generate the full URL for the processed image
  const url = generateImageUrl(req, `/${id}/${outputFilename}`, PORT);

  return {
    filename: outputFilename,
    originalFilename: file.originalFilename as string,
    format,
    originalSize,
    newSize,
    url,
  };
}
export class ImageCompressorController {
  static async resizeImage() {}
  static async handleDownloadImageRoute(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { filename, processId } = req.query;

      // Validate query parameters
      if (typeof filename !== "string" || typeof processId !== "string") {
        return res
          .status(400)
          .json({ error: "Missing filename or processId query parameters" });
      }

      const filePath = path.join(process.cwd(), "public", processId, filename);

      const fileStat = await getFileStats(filePath);

      // Determine the content type from the file extension
      const contentType =
        mime.contentType(path.extname(filename)) || "application/octet-stream";

      // Set headers and pipe the file stream
      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Length", fileStat.size);

      const fileStream = createReadStream(filePath);
      fileStream.pipe(res);

      fileStream.on("error", (error: any) => {
        console.error("Error serving file:", error);
        res.status(500).json({ error: "Failed to serve file" });
      });
    } catch (error: any) {
      console.error("Error serving file:", error);
      res.status(500).json({ error: "Failed to serve file" });
    }
  }
  static async downloadZip() {}
  static async handleDownloadZipRoute(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const zip = new JSZip();
    const { id } = req.query;

    // Validate query parameter
    if (typeof id !== "string") {
      return res.status(400).json({ error: "Missing or invalid id parameter" });
    }

    const folderPath = path.join("public", id);

    try {
      const files = await getFilesInFolder(folderPath);

      // Add each file to the ZIP archive
      for (const file of files) {
        const fileContent = await fs.readFile(file.path);
        zip.file(file.name, fileContent);
      }

      // Generate ZIP and send as response
      const content = await zip.generateAsync({ type: "nodebuffer" });
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${id}.zip"`);
      res.setHeader("Content-Length", content.length);
      res.status(200).send(content);
    } catch (error: any) {
      console.error("Failed to create ZIP file:", error);
      res
        .status(500)
        .json({ error: "Failed to create ZIP file", details: error.message });
    }
  }

  static async handleCompressorRoute(req: Request, res: Response) {
    const form = formidable({
      multiples: true,
      maxFileSize: 50 * 1024 * 1024,
    });

    form.parse(req, async (err: Error, fields: Fields, files: Files) => {
      if (err) {
        console.error("Error parsing form:", err);
        return res.status(500).json({ error: "Error parsing form" });
      }

      try {
        const { q, w, h, f } = req.query as {
          q?: string;
          w?: string;
          h?: string;
          f?: string;
        };

        const imageFiles = Array.isArray(files.image)
          ? files.image
          : [files.image];
        const validImageFiles = imageFiles.filter((file) => file !== undefined);
        if (!validImageFiles.length) {
          return res.status(400).json({ error: "No image files provided" });
        }

        const format = f || "jpeg";
        const quality = Math.min(Math.max(parseInt(q || "70"), 1), 100);
        const width = w ? parseInt(w) : undefined;
        const height = h ? parseInt(h) : undefined;

        const id = uuid();
        const processedDir = path.join(process.cwd(), "public");
        const outputDir = path.join(processedDir, id);

        await fs.mkdir(outputDir, { recursive: true });
        const _this = this;
        const processedImages = await Promise.all(
          validImageFiles.map((file: FormidableFile) =>
            processImage(
              file,
              format,
              quality,
              width,
              height,
              outputDir,
              id,
              req
            )
          )
        );

        res.status(200).json({
          message: "Images processed successfully",
          id: id,
          images: processedImages,
        });
      } catch (error) {
        console.error("Error processing images:", error);
        res.status(500).json({ error: "Error processing images" });
      }
    });
  }
}

const getFileStats = async (filePath: string) => {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    throw new Error("File not found");
  }
};
const getFilesInFolder = async (folderPath: string) => {
  const fullPath = path.join(process.cwd(), folderPath);
  const files = await fs.readdir(fullPath);
  return files.map((fileName) => ({
    name: fileName,
    path: path.join(fullPath, fileName),
  }));
};
