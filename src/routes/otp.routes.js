import express, { Router } from "express";
import {
  getotp,
  getResetOtp,
  sendChangeEmailOtp,
  verifyotp,
} from "../controller/otp.controller.js";
import { veryfyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/send-otp").post(getotp);
router.route("/verify-otp").post(verifyotp);

router.post("/reset/send", getResetOtp);
router.post("/reset/verify", verifyotp);
router.post("/reset/emailsend", veryfyJWT, sendChangeEmailOtp);
export default router;
