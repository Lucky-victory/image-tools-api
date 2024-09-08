import { Router } from "express";
import fs from "fs/promises";
import path from "path";
const router = Router();

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  const folderPath = path.join(process.cwd(), "processed", id as string);

  try {
    // Check if the folder exists
    const folderExists = await fs
      .stat(folderPath)
      .then(() => true)
      .catch(() => false);

    if (!folderExists) {
      return res.status(404).json({ error: `Folder with ID ${id} not found.` });
    }

    // Delete the folder and all its contents (recursive: true is needed for non-empty folders)
    await fs.rm(folderPath, { recursive: true, force: true });

    res
      .status(200)
      .json({ message: `Folder with ID '${id}' deleted successfully.` });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: `Failed to delete folder: ${error.message}` });
  }
});

export default router;
