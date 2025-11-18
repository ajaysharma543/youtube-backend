import { Router } from "express";
import { uplaod } from "../middlewares/multer.middleware.js";
import { veryfyJWT } from "../middlewares/auth.middleware.js";
import {
  deleteVideo,
  getAllVideos,
  getchanneldetails,
  getVideoById,
  publishAVideo,
  togglePublishStatus,
  updateVideo,
} from "../controller/video.controller.js";

const router = Router();

router.route("/upload").post(
  veryfyJWT,
  uplaod.fields([
    {
      name: "videoFile",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  publishAVideo
);

router
  .route("/v/:videoId")
  .get(veryfyJWT, getVideoById)
  .delete(veryfyJWT, deleteVideo)
  .patch(veryfyJWT, uplaod.single("thumbnail"), updateVideo);
router.route("/channeldetails").get(veryfyJWT, getchanneldetails);

router.route("/toggle-publish/:videoId").patch(veryfyJWT, togglePublishStatus);
router.route("/all-videos").get(getAllVideos);

export default router;
