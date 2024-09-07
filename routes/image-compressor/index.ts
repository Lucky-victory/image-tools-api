import { Router } from "express";
import { ImageCompressorController } from "../../controller/image-compressor";

const router = Router();
router.post(
  "/image-compressor",
  ImageCompressorController.handleCompressorRoute
);
router.post(
  "/image-compressor/download-file",
  ImageCompressorController.handleDownloadImageRoute
);
router.post(
  "/image-compressor/download-zip",
  ImageCompressorController.handleDownloadZipRoute
);

export default router;
