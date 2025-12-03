import { Router } from "express";
import {
  changeaccountdetails,
  changeCurrentPassword,
  changeuseravatar,
  changeusercoverimage,
  checkEmail,
  deleteallWatchHistory,
  deleteWatchHistory,
  description,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
  loginUser,
  logoutuser,
  refreshAccesstoken,
  registeruser,
  resetPassword,
} from "../controller/user.controller.js";
import { uplaod } from "../middlewares/multer.middleware.js";
import { veryfyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  uplaod.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registeruser
);
router.route("/login").post(loginUser);
router.route("/logout").post(veryfyJWT, logoutuser);
router.route("/refresh-token").post(refreshAccesstoken);
router.route("/getcurrent-user").get(veryfyJWT, getCurrentUser);
router
  .route("/change-password")
  .patch(uplaod.none(), veryfyJWT, changeCurrentPassword);
router.route("/email").post(uplaod.none(), checkEmail);
router.route("/change-accountdetails").patch(veryfyJWT, changeaccountdetails);
router.route("/description").patch(veryfyJWT, description);
router
  .route("/change-avatar")
  .patch(veryfyJWT, uplaod.single("avatar"), changeuseravatar);
router
  .route("/change-coverimage")
  .patch(veryfyJWT, uplaod.single("coverImage"), changeusercoverimage);
router.route("/c/:username").get(veryfyJWT, getUserChannelProfile);
router.route("/watch-history").get(veryfyJWT, getWatchHistory);
router.route("/delete-history/:videoId").delete(veryfyJWT, deleteWatchHistory);
router.route("/delete-history").delete(veryfyJWT, deleteallWatchHistory);
router.post("/reset-password", resetPassword);

export default router;
