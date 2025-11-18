import mongoose from "mongoose";

const tempOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    otp: {
      type: String,
      required: true,
    },
    otpExpiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Automatically delete OTP after expiry
tempOtpSchema.index({ otpExpiresAt: 1 }, { expireAfterSeconds: 0 });

export const TempOtp = mongoose.model("TempOtp", tempOtpSchema);
