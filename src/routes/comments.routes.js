import { Router } from "express";
import { veryfyJWT } from "../middlewares/auth.middleware.js";
import { uplaod } from "../middlewares/multer.middleware.js";
import {
  addComment,
  deleteComment,
  getVideoComments,
  updateComment,
} from "../controller/comment.controller.js";

const router = Router();

router.route("/:videoId").get(veryfyJWT, getVideoComments);
router.route("/:videoId").post(veryfyJWT, uplaod.none(), addComment);
router.route("/:commentId").patch(veryfyJWT, uplaod.none(), updateComment);
router.route("/:commentId").delete(veryfyJWT, uplaod.none(), deleteComment);

export default router;
