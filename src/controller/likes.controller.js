import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/likes.model.js";
import { Video } from "../models/video.model.js";
import { Dislike } from "../models/dislike.model.js";
import { asyncHandler } from "../../src/utils/asynchandler.js";
import { ApiError } from "../../src/utils/apierror.js";
import { ApiResponse } from "../../src/utils/apiresponse.js";
import { Comment } from "../models/comment.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");

  await Dislike.findOneAndDelete({ video: videoId, dislikedBy: userId });

  const existingLike = await Like.findOne({ video: videoId, likedBy: userId });

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
  } else {
    await Like.create({ video: videoId, likedBy: userId });
  }

  const likeCount = await Like.countDocuments({ video: videoId });
  const dislikeCount = await Dislike.countDocuments({ video: videoId });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        isLiked: !existingLike,
        likeCount,
        dislikeCount,
      },
      existingLike ? "Like removed" : "Video liked successfully"
    )
  );
});
const getVideoLikeStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const likeCount = await Like.countDocuments({ video: videoId });
  const dislikeCount = await Dislike.countDocuments({ video: videoId });
  const existingLike = await Like.findOne({ video: videoId, likedBy: userId });

  res.status(200).json(
    new ApiResponse(200, {
      isLiked: !!existingLike,
      likeCount,
      dislikeCount,
    })
  );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError(404, "Comment not found");

  await Dislike.findOneAndDelete({ comment: commentId, dislikedBy: userId });

  const existingLike = await Like.findOne({
    comment: commentId,
    likedBy: userId,
  });
  let isLiked;

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    isLiked = false;
  } else {
    await Like.create({ comment: commentId, likedBy: userId });
    isLiked = true;
  }

  // Get updated counts
  const likeCount = await Like.countDocuments({ comment: commentId });
  const dislikeCount = await Dislike.countDocuments({ comment: commentId });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isLiked, likeCount, dislikeCount },
        isLiked ? "Comment liked successfully" : "Like removed"
      )
    );
});

const getCommentLikeStatus = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const likeCount = await Like.countDocuments({ comment: commentId });
  const dislikeCount = await Dislike.countDocuments({ comment: commentId });
  const existingLike = await Like.findOne({
    comment: commentId,
    likedBy: userId,
  });

  res.status(200).json(
    new ApiResponse(200, {
      isLiked: !!existingLike,
      likeCount,
      dislikeCount,
    })
  );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweetId");
  }

  const likedAlready = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user?._id,
  });

  if (likedAlready) {
    await Like.findByIdAndDelete(likedAlready?._id);

    return res
      .status(200)
      .json(new ApiResponse(200, { tweetId, isLiked: false }));
  }

  await Like.create({
    tweet: tweetId,
    likedBy: req.user?._id,
  });

  return res.status(200).json(new ApiResponse(200, { isLiked: true }));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const likedVideosAggegate = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "likedVideo",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "ownerDetails",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1,
                  },
                },
              ],
            },
          },
          {
            $unwind: "$ownerDetails",
          },
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
              owner: "$ownerDetails",
            },
          },
        ],
      },
    },
    {
      $unwind: "$likedVideo",
    },
    {
      $project: {
        _id: 0,
        likedvideo: "$likedVideo",
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        likedVideosAggegate,
        "liked video fetched successfully"
      )
    );
});

export {
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
  getLikedVideos,
  getVideoLikeStatus,
  getCommentLikeStatus,
};
