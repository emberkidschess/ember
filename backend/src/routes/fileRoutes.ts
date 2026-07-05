import { Router } from 'express';
import upload, { uploadToCloudinary, deleteFromCloudinary } from '../utils/fileUpload';
import { strictLimiter } from '../middleware/rateLimiter';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/upload', strictLimiter, authenticate, requireAdmin, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const result = await uploadToCloudinary(req.file, 'chess-academy');

    res.json({
      success: true,
      data: result,
      message: 'File uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload file',
    });
  }
});

router.delete('/:publicId(*)', strictLimiter, authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { publicId } = req.params;
    if (!publicId.startsWith('chess-academy/')) {
      return res.status(400).json({
        success: false,
        error: 'Only files in the application upload folder can be deleted',
      });
    }
    await deleteFromCloudinary(publicId);

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete file',
    });
  }
});

export default router;
