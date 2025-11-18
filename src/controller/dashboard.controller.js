import mongoose, { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { Video } from "../models/video.model.js";
import { asyncHandler } from "../../src/utils/asynchandler.js";
import { ApiResponse } from "../../src/utils/apiresponse.js";
const getChannelStats = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  const totalSubscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $group: {
        _id: null,
        subscribercount: {
          $sum: 1,
        },
      },
    },
  ]);

  const Videos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "totallikes",
      },
    },
    {
      $project: {
        totallikes: {
          $size: "$totallikes",
        },
        totalviews: "$views",
        totalVideos: 1,
      },
    },
    {
      $group: {
        _id: null,
        totalVideos: {
          $sum: 1,
        },
        totallikes: {
          $sum: "$totallikes",
        },
        totalviews: {
          $sum: "$totalviews",
        },
      },
    },
    {
      $addFields: {
        likePercentage: {
          $cond: [
            { $eq: ["$totalviews", 0] },
            0,
            { $multiply: [{ $divide: ["$totallikes", "$totalviews"] }, 100] },
          ],
        },
      },
    },
  ]);

  const channelStats = {
    totalSubscribers: totalSubscribers[0]?.subscribercount || 0,
    totallikes: Videos[0]?.totallikes || 0,
    totalviews: Videos[0]?.totalviews || 0,
    totalVideos: Videos[0]?.totalVideos || 0,
    likePercentage: Videos[0].likePercentage,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, channelStats, "channel stats fetched successfully")
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const video = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "video",
        as: "comments",
      },
    },

    {
      $addFields: {
        likecount: {
          $size: "$likes",
        },
        commentcount: { $size: "$comments" },
        likePercentage: {
          $cond: [
            { $eq: ["$views", 0] },
            0,
            { $multiply: [{ $divide: [{ $size: "$likes" }, "$views"] }, 100] },
          ],
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        _id: 1,
        "videoFile.url": 1,
        "thumbnail.url": 1,
        title: 1,
        description: 1,
        createdAt: 1,
        isPublished: 1,
        views: 1,
        likecount: 1,
        commentcount: 1,
        likePercentage: 1,
      },
    },
  ]);
  return res
    .status(200)
    .json(new ApiResponse(200, video, "channel stats fetched successfully"));
});

export { getChannelStats, getChannelVideos };
