import { Router } from "express";
import {
  addVideoToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylistById,
  getUserPlaylists,
  removeVideoFromPlaylist,
  updatePlaylist,
} from "../controller/playlist.controller.js";
import { veryfyJWT } from "../middlewares/auth.middleware.js";
import { uplaod } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/create").post(veryfyJWT, uplaod.none(), createPlaylist);
router
  .route("/:playlistId")
  .patch(veryfyJWT, uplaod.none(), updatePlaylist)
  .delete(veryfyJWT, uplaod.none(), deletePlaylist)
  .get(veryfyJWT, uplaod.none(), getPlaylistById);
router
  .route("/:playlistId/addvideo/:videoId")
  .patch(veryfyJWT, uplaod.none(), addVideoToPlaylist);
router
  .route("/:playlistId/removevideo/:videoId")
  .patch(veryfyJWT, uplaod.none(), removeVideoFromPlaylist);
router.route("/users/:userId").get(veryfyJWT, uplaod.none(), getUserPlaylists);

export default router;
