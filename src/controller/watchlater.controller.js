import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../../src/utils/asynchandler.js";
import { ApiError } from "../../src/utils/apierror.js";
import { ApiResponse } from "../../src/utils/apiresponse.js";
import { Watchlater } from "../models/watchlater.model.js";

// Add to Watch Later
const addToWatchLater = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  // Find the user's Watch Later list
  const existingList = await Watchlater.findOne({ user: userId });

  // If no list exists, create one and add the video
  if (!existingList) {
    const newList = await Watchlater.findOneAndUpdate(
      { user: userId },
      {
        $setOnInsert: { user: userId },
        $addToSet: { videos: videoId },
      },
      { new: true, upsert: true }
    );

    return res
      .status(200)
      .json(new ApiResponse(200, newList, "Video added to Watch Later"));
  }

  if (existingList.videos.includes(videoId)) {
    return res
      .status(400)
      .json(new ApiResponse(400, existingList, "Video already in Watch Later"));
  }

  const updatedList = await Watchlater.findOneAndUpdate(
    { user: userId },
    { $addToSet: { videos: videoId } },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedList, "Video added to Watch Later"));
});

// Remove from Watch Later
const removeFromWatchLater = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const updatedList = await Watchlater.findOneAndUpdate(
    { user: userId },
    { $pull: { videos: videoId } },
    { new: true }
  );

  if (!updatedList) {
    throw new ApiError(404, "Watch Later list not found for user");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedList, "Video removed from Watch Later"));
});
const getwatchlater = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const watchlater = await Watchlater.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videoDetails",
      },
    },
    {
      $project: {
        _id: 0,
        videoDetails: {
          _id: 1,
          title: 1,
          description: 1,
          "thumbnail.url": 1,
          "videoFile.url": 1,
          duration: 1,
          views: 1,
          createdAt: 1,
        },
      },
    },
  ]);

  const videos = watchlater.length ? watchlater[0].videoDetails : [];

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Fetched Watch Later videos"));
});

export { addToWatchLater, removeFromWatchLater, getwatchlater };
