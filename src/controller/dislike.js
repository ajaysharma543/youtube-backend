import mongoose, { isValidObjectId } from "mongoose";
import { Dislike } from "../models/dislike.model.js";
import { Like } from "../models/likes.model.js";
import { Video } from "../models/video.model.js";
import { asyncHandler } from "../../src/utils/asynchandler.js";
import { ApiError } from "../../src/utils/apierror.js";
import { ApiResponse } from "../../src/utils/apiresponse.js";
import { Comment } from "../models/comment.model.js";

const toggleVideodisLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");

  await Like.findOneAndDelete({ video: videoId, likedBy: userId });

  // Check if already disliked
  const existingDislike = await Dislike.findOne({
    video: videoId,
    dislikedBy: userId,
  });

  if (existingDislike) {
    await Dislike.findByIdAndDelete(existingDislike._id);
  } else {
    await Dislike.create({ video: videoId, dislikedBy: userId });
  }

  const likeCount = await Like.countDocuments({ video: videoId });
  const dislikeCount = await Dislike.countDocuments({ video: videoId });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        isDisliked: !existingDislike,
        dislikeCount,
        likeCount,
      },
      existingDislike ? "Dislike removed" : "Video disliked successfully"
    )
  );
});

const getVideoDislikeStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  // Count total dislikes and likes for the video
  const dislikeCount = await Dislike.countDocuments({ video: videoId });
  const likeCount = await Like.countDocuments({ video: videoId });

  // Check if the user has disliked the video
  const existingDislike = await Dislike.findOne({
    video: videoId,
    dislikedBy: userId,
  });

  res.status(200).json(
    new ApiResponse(200, {
      isDisliked: !!existingDislike,
      dislikeCount,
      likeCount,
    })
  );
});
const toggleCommentDislike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  if (!mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError(404, "Comment not found");

  // Remove like if exists
  await Like.findOneAndDelete({ comment: commentId, likedBy: userId });

  // Toggle dislike
  const existingDislike = await Dislike.findOne({
    comment: commentId,
    dislikedBy: userId,
  });

  let isDisliked;
  if (existingDislike) {
    await Dislike.findByIdAndDelete(existingDislike._id);
    isDisliked = false;
  } else {
    await Dislike.create({ comment: commentId, dislikedBy: userId });
    isDisliked = true;
  }

  const dislikeCount = await Dislike.countDocuments({ comment: commentId });
  const likeCount = await Like.countDocuments({ comment: commentId });

  res.status(200).json({
    status: 200,
    data: { isDisliked, dislikeCount, likeCount },
    message: isDisliked ? "Comment disliked successfully" : "Dislike removed",
  });
});

const getCommentDislikeStatus = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const dislikeCount = await Dislike.countDocuments({ comment: commentId });
  const likeCount = await Like.countDocuments({ comment: commentId });
  const existingDislike = await Dislike.findOne({
    comment: commentId,
    dislikedBy: userId,
  });

  res.status(200).json(
    new ApiResponse(200, {
      isDisliked: !!existingDislike,
      dislikeCount,
      likeCount,
    })
  );
});

const getdisLikedVideos = asyncHandler(async (req, res) => {
  const dislikedaggregate = await Dislike.aggregate([
    {
      $match: {
        dislikedBy: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videos",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    username: 1,
                    fullname: 1,
                    "avatar.url": 1,
                  },
                },
              ],
            },
          },
          { $unwind: "$owner" },
          {
            $project: {
              _id: 1,
              title: 1,
              description: 1,
              "videoFile.url": 1,
              "thumbnail.url": 1,
              views: 1,
              duration: 1,
              createdAt: 1,
              isPublished: 1,
              owner: "$owner",
            },
          },
        ],
      },
    },
    { $unwind: "$videos" },
    {
      $project: {
        _id: 0,
        videos: "$videos",
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        dislikedaggregate,
        "Disliked videos fetched successfully"
      )
    );
});

export {
  getdisLikedVideos,
  toggleCommentDislike,
  getCommentDislikeStatus,
  getVideoDislikeStatus,
  toggleVideodisLike,
};
