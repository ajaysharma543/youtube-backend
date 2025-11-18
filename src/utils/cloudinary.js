import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { ApiError } from "./apierror.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log(cloudinary.config());

const uploadcloudinary = async function (localFilePath) {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    console.log("file is uploaded on cloudinary ", response);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    return null;
  }
};

const deleteOnCloudinary = async function (public_id, resource_type = "image") {
  try {
    if (!public_id) return null;

    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type,
    });

    console.log(`Deleted from Cloudinary (${resource_type}):`, result);

    return result; // optional, but good for debugging
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    throw new ApiError(400, "Error while deleting the file", error);
  }
};

export { uploadcloudinary, deleteOnCloudinary };
