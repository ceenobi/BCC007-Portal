import { v2 as cloudinary, type UploadApiOptions } from "cloudinary";
import { env } from "../config/keys";
import logger from "../config/logger";

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
});

export const getSignedUrl = async (folder: string) => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const uploadPreset = env.cloudinary.uploadPreset!;
    const eager =
      "w_1200,h_1200,c_fill,q_auto:best,f_webp|w_400,h_400,c_fill,q_auto:good,f_webp|w_100,h_100,c_fill,q_auto:low,f_webp";
    const responsive_breakpoints = JSON.stringify([
      {
        create_derived: true,
        bytes_step: 20000,
        min_width: 200,
        max_width: 1000,
        max_images: 4,
      },
    ]);
    const paramsToSign = {
      folder: `bcc007portal/${folder}`,
      timestamp: String(timestamp),
      upload_preset: uploadPreset,
      eager,
      responsive_breakpoints,
    };
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      env.cloudinary.apiSecret!,
    );
    return {
      timestamp,
      signature,
      uploadPreset,
      folder: `bcc007portal/${folder}`,
      eager,
      responsive_breakpoints,
    };
  } catch (error) {
    logger.error(error);
    throw new Error("Failed to get signed URL");
  }
};

export const uploadToCloudinary = async (
  file: string,
  options: Partial<UploadApiOptions> = {},
) => {
  try {
    const defaultOptions: UploadApiOptions = {
      resource_type: "auto",
      // Image optimization settings
      quality: "auto",
      fetch_format: "auto",
      // Delivery optimization
      eager: [
        { width: 800, height: 600, crop: "limit" },
        { width: 400, height: 300, crop: "limit" },
      ],
      // Performance optimization
      responsive_breakpoints: {
        create_derived: true,
        transformation: {
          quality: "auto:good",
          fetch_format: "auto",
        },
      },
      secure: true,
      optimize: true,
      ...options,
    };
    const result = await cloudinary.uploader.upload(file, defaultOptions);
    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    logger.error(error);
    throw new Error("Cloudinary upload failed");
  }
};

export const deleteFromCloudinary = async (publicIds: string[]) => {
  try {
    const result = await cloudinary.api.delete_resources(publicIds);
    return result;
  } catch (error) {
    logger.error(error);
    throw new Error("Cloudinary deletion failed");
  }
};
