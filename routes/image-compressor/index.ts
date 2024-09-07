import { Router } from "express";
import express, { Request, Response, NextFunction } from "express";
import formidable, { File as FormidableFile, Fields, Files } from "formidable";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import { generateImageUrl } from "../../utils"; // Adjust the import path
import cors from "cors";
import { ImageCompressorController } from "../../controller/image-compressor";
const app = express();
const PORT = process.env.PORT || 4300;

const router = Router();
router.post(
  "/image-compressor",
  ImageCompressorController.handleCompressorRoute
);

export default router;
