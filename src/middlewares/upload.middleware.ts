import multer from 'multer';
import ApiError from '../utils/ApiError';

const storage = multer.memoryStorage();

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    cb(new ApiError(400, 'Format image invalide (jpeg, jpg, png, webp uniquement)'));
    return;
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 6,
  },
  fileFilter,
});

export default upload;
