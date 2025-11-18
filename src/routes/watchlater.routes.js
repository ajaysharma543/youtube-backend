import { Router } from "express";
import { veryfyJWT } from "../middlewares/auth.middleware.js";
import {
  addToWatchLater,
  getwatchlater,
  removeFromWatchLater,
} from "../controller/watchlater.controller.js";

const router = Router();

router.post("/add/:videoId", veryfyJWT, addToWatchLater);
router.delete("/remove/:videoId", veryfyJWT, removeFromWatchLater);
router.get("/", veryfyJWT, getwatchlater);

export default router;
