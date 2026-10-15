import { v2 as cloudinary } from 'cloudinary';
import ApiError from '../utils/ApiError';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.warn('[WARN] Cloudinary env vars are missing: upload will fail until configured');
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

export const uploadImageToCloudinary = async (fileBuffer: Buffer): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'ccarre/annonces',
        resource_type: 'image',
      },
      (error, result) => {
        if (error || !result) {
          console.error('[CLOUDINARY ERROR]', {
            error: error?.message || 'Unknown error',
            errorCode: error?.code,
            errorStatus: error?.status,
            fullError: error,
          });
          return reject(new ApiError(500, "Échec de l'upload image vers Cloudinary"));
        }
        resolve(result.secure_url);
      },
    );

    uploadStream.end(fileBuffer);
  });
};

export default cloudinary;
