"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = exports.extractPublicIdFromUrl = exports.deleteFromCloudinary = exports.uploadImageToCloudinary = void 0;
const cloudinary_1 = require("cloudinary");
const multer_1 = __importDefault(require("multer"));
const envVars_1 = require("../config/envVars");
const AppError_1 = __importDefault(require("../helpers/AppError"));
const http_status_1 = __importDefault(require("http-status"));
// Configure Cloudinary
cloudinary_1.v2.config({
    cloud_name: envVars_1.envVars.CLOUDINARY.CLOUD_NAME,
    api_key: envVars_1.envVars.CLOUDINARY.API_KEY,
    api_secret: envVars_1.envVars.CLOUDINARY.API_SECRET,
    secure: true,
});
/**
 * Uploads an in-memory buffer to Cloudinary and organizes into folder.
 * @param buffer - File buffer from multer memoryStorage
 * @param originalName - Original file name for reference
 * @param folder - Cloudinary folder path (defaults to 'smart-library/books')
 */
const uploadImageToCloudinary = (buffer, originalName, folder = "smart-library/books") => {
    return new Promise((resolve, reject) => {
        // Sanitize filename for public_id prefix
        const cleanName = originalName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
        const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e4)}`;
        const publicId = `${cleanName}_${uniqueSuffix}`;
        const uploadStream = cloudinary_1.v2.uploader.upload_stream({
            folder,
            public_id: publicId,
            resource_type: "image",
        }, (error, result) => {
            if (error || !result) {
                return reject(new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, `Cloudinary upload failed: ${error?.message || "Unknown error"}`));
            }
            resolve({
                url: result.secure_url,
                publicId: result.public_id,
                format: result.format,
                bytes: result.bytes,
            });
        });
        uploadStream.end(buffer);
    });
};
exports.uploadImageToCloudinary = uploadImageToCloudinary;
/**
 * Deletes an image asset from Cloudinary by its public ID.
 * Crucial for rollback when book creation / database transaction fails.
 */
const deleteFromCloudinary = async (publicId) => {
    if (!publicId)
        return false;
    try {
        const res = await cloudinary_1.v2.uploader.destroy(publicId);
        return res.result === "ok";
    }
    catch (err) {
        console.error(`⚠️ Failed to delete Cloudinary asset "${publicId}":`, err);
        return false;
    }
};
exports.deleteFromCloudinary = deleteFromCloudinary;
/**
 * Helper to extract Cloudinary public_id from a secure URL
 */
const extractPublicIdFromUrl = (url) => {
    if (!url || !url.includes("cloudinary.com"))
        return null;
    try {
        const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
        if (matches && matches[1]) {
            return matches[1];
        }
    }
    catch {
        // fallback
    }
    return null;
};
exports.extractPublicIdFromUrl = extractPublicIdFromUrl;
// ─── Multer In-Memory Storage & Upload Middleware ────────────────────────────
const storage = multer_1.default.memoryStorage();
const fileFilter = (req, file, cb) => {
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
    }
    else {
        cb(new AppError_1.default(http_status_1.default.BAD_REQUEST, `Invalid file type '${file.mimetype}'. Only JPG, PNG, WEBP, and AVIF images are allowed.`));
    }
};
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB limit
    },
});
exports.default = cloudinary_1.v2;
