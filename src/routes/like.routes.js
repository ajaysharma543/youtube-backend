import { Router } from "express";
import { veryfyJWT } from "../middlewares/auth.middleware.js";
import {
  getCommentLikeStatus,
  getLikedVideos,
  getVideoLikeStatus,
  toggleCommentLike,
  toggleVideoLike,
} from "../controller/likes.controller.js";

const router = Router();

router.route("/toggle-video/:videoId").post(veryfyJWT, toggleVideoLike);
router.route("/toggle-video/:videoId").get(veryfyJWT, getVideoLikeStatus);
router.route("/videos").get(veryfyJWT, getLikedVideos);
router.route("/toggle-comment/:commentId").post(veryfyJWT, toggleCommentLike);
router.route("/toggle-comment/:commentId").get(veryfyJWT, getCommentLikeStatus);

export default router;
