import { Router } from "express";
import { ImageCompressorController } from "../../controller/image-compressor";
const router = Router();

// router.use(asyncHandler(logAnalytics));
router.post("/", ImageCompressorController.handleCompressorRoute);
router.get(
  "/download-file",
  ImageCompressorController.handleDownloadImageRoute
);
router.get("/download-zip", ImageCompressorController.handleDownloadZipRoute);

export default router;
