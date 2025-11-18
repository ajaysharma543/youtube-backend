import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../../src/utils/asynchandler.js";
import { ApiError } from "../../src/utils/apierror.js";
import { ApiResponse } from "../../src/utils/apiresponse.js";
import { Subscription } from "../models/subscription.model.js";
const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "invalid channelId");
  }

  if (!req.user?._id) throw new ApiError(400, "unauthorized user");

  const subscribe = await Subscription.findOne({
    subscriber: req.user._id,
    channel: channelId,
  });

  if (subscribe) {
    await Subscription.findByIdAndDelete(subscribe._id);
    return res
      .status(200)
      .json(
        new ApiResponse(200, { subscribe: false }, "unsubscribed successfully")
      );
  }

  await Subscription.create({
    subscriber: req.user._id,
    channel: channelId,
  });
  return res
    .status(200)
    .json(new ApiResponse(200, { subscribe: true }, "subscribed successfully"));
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  let { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channelId");
  }

  channelId = new mongoose.Types.ObjectId(channelId);

  const subscription = await Subscription.aggregate([
    {
      $match: {
        channel: channelId,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribedtosubscriber",
            },
          },
          {
            $addFields: {
              subscribedtosubscriber: {
                $cond: {
                  if: {
                    $in: [channelId, "$subscribedtosubscriber.subscriber"],
                  },
                  then: true,
                  else: false,
                },
              },
              subscribercount: {
                $size: "$subscribedtosubscriber",
              },
            },
          },
        ],
      },
    },
    {
      $unwind: "$subscriber",
    },
    {
      $project: {
        _id: 0,
        subscriber: {
          _id: 1,
          username: 1,
          fullname: 1,
          "avatar.url": 1,
          subscribedtosubscriber: 1,
          subscribercount: 1,
        },
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(200, subscription, "subscribers fetched successfully")
    );
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "invalid ID");
  }

  const subscriberchannel = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "subscribedtochannel",
        pipeline: [
          {
            $lookup: {
              from: "videos",
              localField: "_id",
              foreignField: "owner",
              as: "videolist",
            },
          },
          {
            $addFields: {
              videolist: {
                $last: "$videolist",
              },
            },
          },
        ],
      },
    },
    {
      $unwind: "$subscribedtochannel",
    },
    {
      $project: {
        _id: 0,
        subscribedtochannel: {
          _id: 1,
          username: 1,
          "avatar.url": 1,
          videolist: {
            _id: 1,
            "videoFile.url": 1,
            "thumbnail.url": 1,
            owner: 1,
            title: 1,
            description: 1,
            duration: 1,
            createdAt: 1,
            views: 1,
          },
        },
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscriberchannel,
        "subscribed channels fetched successfully"
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
