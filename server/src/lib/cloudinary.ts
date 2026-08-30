import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import multer from "multer";
import { envVars } from "../config/envVars";
import AppError from "../helpers/AppError";
import status from "http-status";

// Configure Cloudinary
cloudinary.config({
  cloud_name: envVars.CLOUDINARY.CLOUD_NAME,
  api_key: envVars.CLOUDINARY.API_KEY,
  api_secret: envVars.CLOUDINARY.API_SECRET,
  secure: true,
});

export interface ICloudinaryUploadResult {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
}

/**
 * Uploads an in-memory buffer to Cloudinary and organizes into folder.
 * @param buffer - File buffer from multer memoryStorage
 * @param originalName - Original file name for reference
 * @param folder - Cloudinary folder path (defaults to 'smart-library/books')
 */
export const uploadImageToCloudinary = (
  buffer: Buffer,
  originalName: string,
  folder: string = "smart-library/books"
): Promise<ICloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    // Sanitize filename for public_id prefix
    const cleanName = originalName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e4)}`;
    const publicId = `${cleanName}_${uniqueSuffix}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: "image",
      },
      (error, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          return reject(
            new AppError(
              status.INTERNAL_SERVER_ERROR,
              `Cloudinary upload failed: ${error?.message || "Unknown error"}`
            )
          );
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Deletes an image asset from Cloudinary by its public ID.
 * Crucial for rollback when book creation / database transaction fails.
 */
export const deleteFromCloudinary = async (publicId: string): Promise<boolean> => {
  if (!publicId) return false;
  try {
    const res = await cloudinary.uploader.destroy(publicId);
    return res.result === "ok";
  } catch (err) {
    console.error(`⚠️ Failed to delete Cloudinary asset "${publicId}":`, err);
    return false;
  }
};

/**
 * Helper to extract Cloudinary public_id from a secure URL
 */
export const extractPublicIdFromUrl = (url: string): string | null => {
  if (!url || !url.includes("cloudinary.com")) return null;
  try {
    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
    if (matches && matches[1]) {
      return matches[1];
    }
  } catch {
    // fallback
  }
  return null;
};

// ─── Multer In-Memory Storage & Upload Middleware ────────────────────────────

const storage = multer.memoryStorage();

const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/avif",
    "image/gif",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        status.BAD_REQUEST,
        `Invalid file type '${file.mimetype}'. Only JPG, PNG, WEBP, and AVIF images are allowed.`
      )
    );
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

export default cloudinary;
