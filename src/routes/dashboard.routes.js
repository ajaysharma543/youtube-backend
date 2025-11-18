import { Router } from "express";
import {
  getChannelStats,
  getChannelVideos,
} from "../controller/dashboard.controller.js";
import { veryfyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(veryfyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/stats").get(getChannelStats);
router.route("/videos").get(getChannelVideos);

export default router;
