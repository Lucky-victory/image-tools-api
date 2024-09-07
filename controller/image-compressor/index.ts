import express, { Request, Response, NextFunction } from "express";
import formidable, { File as FormidableFile, Fields, Files } from "formidable";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import { generateImageUrl } from "../../utils"; // Adjust the import path
import { PORT } from "../..";
import { ProcessedImage } from "../../types";

export class ImageCompressorController {
  static processImage = async (
    file: FormidableFile,
    format: string,
    quality: number,
    width: number | undefined,
    height: number | undefined,
    outputDir: string,
    id: string,
    req: Request
  ): Promise<ProcessedImage> => {
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

    const outputFilename = `compressed-${file.originalFilename?.replace(
      /\.[^/.]+$/,
      ""
    )}.${format}`;
    const outputPath = path.join(outputDir, outputFilename);
    await sharpImage.toFile(outputPath);

    const newSize = (await fs.stat(outputPath)).size;

    // Generate the full URL for the processed image
    const url = generateImageUrl(
      req,
      `/processed/${id}/${outputFilename}`,
      PORT
    );

    return {
      filename: outputFilename,
      originalFilename: file.originalFilename as string,
      format,
      originalSize,
      newSize,
      url,
    };
  };

  static async resizeImage() {}
  static async handleDownloadImageRoute() {}
  static async downloadZip() {}
  static async handleDownloadZipRoute() {}

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
        const { q, w, h, f } = fields as {
          q?: string;
          w?: string;
          h?: string;
          f?: string;
        };

        const imageFiles = Array.isArray(files.image)
          ? files.image
          : [files.image];
        const validImageFiles = imageFiles.filter(
          (file): file is FormidableFile => file !== undefined
        );
        if (!validImageFiles.length) {
          return res.status(400).json({ error: "No image files provided" });
        }

        const format = f || "jpeg";
        const quality = Math.min(Math.max(parseInt(q || "70"), 1), 100);
        const width = w ? parseInt(w) : undefined;
        const height = h ? parseInt(h) : undefined;

        const id = uuid();
        const processedDir = path.join(process.cwd(), "processed");
        const outputDir = path.join(processedDir, id);

        await fs.mkdir(outputDir, { recursive: true });

        const processedImages = await Promise.all(
          validImageFiles.map((file: FormidableFile) =>
            this.processImage(
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
