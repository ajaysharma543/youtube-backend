import { Router } from "express";
import { veryfyJWT } from "../middlewares/auth.middleware.js";
import {
  getSubscribedChannels,
  getUserChannelSubscribers,
  toggleSubscription,
} from "../controller/subscription.controller.js";

const router = Router();

router.route("/subscribe/:channelId").post(veryfyJWT, toggleSubscription);
router.route("/channel/:channelId").get(veryfyJWT, getUserChannelSubscribers);
router.route("/subscriber/:subscriberId").get(veryfyJWT, getSubscribedChannels);

export default router;
