import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// Configure Multer-Storage-Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "uploads", // The folder in Cloudinary to store files
    allowed_formats: ["jpg", "png", "jpeg", "gif"], // Allowed file formats
    transformation: [
      { width: 1920, height: 1080, crop: "limit", quality: "auto:best" }, // Transformation de l'image
    ],
  },
});

const upload = multer({ storage });

export { cloudinary, upload };
