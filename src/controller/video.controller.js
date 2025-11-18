import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/apierror.js";
import { ApiResponse } from "../utils/apiresponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { deleteOnCloudinary, uploadcloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import { Like } from "../models/likes.model.js";
import { Comment } from "../models/comment.model.js";
import { Subscription } from "../models/subscription.model.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  const pipeline = [];

  if (query) {
    pipeline.push({
      $search: {
        index: "search-videos",
        compound: {
          should: [
            {
              autocomplete: {
                query: query,
                path: "title",
              },
            },
            {
              autocomplete: {
                query: query,
                path: "description",
              },
            },
          ],
        },
      },
    });
  }

  const matchFilter = { isPublished: true };

  if (userId) {
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid userId");
    }
    matchFilter.owner = new mongoose.Types.ObjectId(userId);
  }
  pipeline.push({ $match: matchFilter });

  if (sortType && sortBy) {
    pipeline.push({
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    });
  } else {
    pipeline.push({ $sort: { createdAt: -1 } });
  }

  pipeline.push(
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $unwind: "$owner",
    },
    {
      $project: {
        title: 1,
        description: 1,
        thumbnail: 1,
        videoFile: 1,
        views: 1,
        isPublished: 1,
        duration: 1,
        createdAt: 1,
        owner: {
          _id: 1,
          username: 1,
          fullname: 1,
          "avatar.url": 1,
        },
      },
    }
  );

  const videoAggregate = Video.aggregate(pipeline);
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };
  const video = await Video.aggregatePaginate(videoAggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if ([title, description].some((fields) => fields?.trim() === "")) {
    throw new ApiError(400, "all fields are required");
  }

  const videoFileLocalPath = req.files?.videoFile[0].path;
  const thumbnailLocalPath = req.files?.thumbnail[0].path;

  if (!videoFileLocalPath) {
    throw new ApiError(400, "videoFileLocalPath is required");
  }

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "thumbnailLocalPath is required");
  }

  const uplaodvideofile = await uploadcloudinary(videoFileLocalPath);
  const uplaodvideothumbnail = await uploadcloudinary(thumbnailLocalPath);

  if (!uplaodvideofile) {
    throw new ApiError(400, "Video file not found");
  }

  if (!uplaodvideothumbnail) {
    throw new ApiError(400, "Thumbnail not found");
  }

  const video = await Video.create({
    title,
    description,
    videoFile: {
      url: uplaodvideofile.url,
      public_id: uplaodvideofile.public_id,
    },
    thumbnail: {
      url: uplaodvideothumbnail.url,
      public_id: uplaodvideothumbnail.public_id,
    },
    owner: req.user._id,
    duration: uplaodvideofile.duration,
    isPublished: false,
  });

  const videoUploaded = await Video.findById(video._id);

  if (!videoUploaded) {
    throw new ApiError(500, "videoUpload failed please try again !!!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "video uploaded successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "video notu found");
  }

  if (!isValidObjectId(req.user?._id)) {
    throw new ApiError(400, "Invalid userId");
  }

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
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
        from: "dislikes",
        localField: "_id",
        foreignField: "video",
        as: "dislikes",
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
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscriberscount: {
                $size: "$subscribers",
              },

              issubscribed: {
                $cond: {
                  if: {
                    $in: [req.user?._id, "$subscribers.subscriber"],
                  },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              subscriberscount: 1,
              issubscribed: 1,
              username: 1,
              "avatar.url": 1,
              fullname: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        dislikesCount: {
          $size: "$dislikes",
        },
        commentsCount: {
          $size: "$comments",
        },
        owner: {
          $first: "$owner",
        },
        isLiked: {
          $cond: {
            if: {
              $in: [req.user?._id, "$likes.likedBy"],
            },
            then: true,
            else: false,
          },
        },
        isdisLiked: {
          $cond: {
            if: {
              $in: [req.user?._id, "$dislikes.dislikedBy"],
            },
            then: true,
            else: false,
          },
        },
        iscomment: {
          $cond: {
            if: { $in: [req.user?._id, "$comments.owner"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        "videoFile.url": 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        owner: 1,
        likesCount: 1,
        dislikesCount: 1,
        isLiked: 1,
        isdisLiked: 1,
        commentsCount: 1,
        iscomment: 1,
      },
    },
  ]);

  if (!video.length) {
    throw new ApiError(404, "Video not found");
  }

  const currentVideo = video[0];

  if (!(currentVideo.owner?._id?.toString() === req.user._id.toString())) {
    const user = await User.findById(req.user._id);
    const alreadyWatched = user.watchhistory.some(
      (id) => id.toString() === videoId
    );

    if (!alreadyWatched) {
      await Video.findByIdAndUpdate(
        videoId,
        { $inc: { views: 1 } },
        { new: true }
      );
    }

    await User.findByIdAndUpdate(
      req.user?._id,
      {
        $addToSet: {
          watchhistory: videoId,
        },
      },
      { new: true }
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "video details fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "video not found");
  }

  if (!title || !description) {
    throw new ApiError(400, "title and description are required");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "No video found");
  }

  if (req.user?._id.toString() !== video?.owner.toString()) {
    throw new ApiError(
      400,
      "You can't edit this video as you are not the owner"
    );
  }

  const oldthumbnail = video.thumbnail.public_id;
  const thumbnailLocalPath = req.file?.path;
  let newThumbnail = video.thumbnail;

  if (thumbnailLocalPath) {
    const uploaded = await uploadcloudinary(thumbnailLocalPath);
    if (!uploaded) {
      throw new ApiError(400, "thumbnail upload failed");
    }
    newThumbnail = {
      url: uploaded.url,
      public_id: uploaded.public_id,
    };
  }

  const updatedvideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: newThumbnail,
      },
    },
    { new: true }
  );

  if (!updatedvideo) {
    throw new ApiError(400, "unable to update the video.. please try again");
  }

  if (thumbnailLocalPath && oldthumbnail) {
    await deleteOnCloudinary(oldthumbnail);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedvideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "video not found");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(400, "user not found");
  }
  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      400,
      "You can't delete this video as you are not the owner"
    );
  }

  const deletevideo = await Video.findByIdAndDelete(videoId);

  if (!deletevideo) {
    throw new ApiError(400, "Failed to delete the video please try again");
  }

  await deleteOnCloudinary(video.thumbnail?.public_id, "image");
  await deleteOnCloudinary(video.videoFile?.public_id, "video");

  await Like.deleteMany({
    video: videoId,
  });

  await Comment.deleteMany({
    video: videoId,
  });
  await User.updateMany(
    { watchhistory: videoId },
    { $pull: { watchhistory: videoId } },
    { new: true }
  );
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "invalid video");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(400, "video not found");
  }
  if (video.owner?.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      400,
      "You can't toogle publish status as you are not the owner"
    );
  }

  const toggledVideoPublish = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !video.isPublished,
      },
    },
    {
      new: true,
    }
  );

  if (!toggledVideoPublish) {
    throw new ApiError(500, "Failed to toogle video publish status");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isPublished: toggledVideoPublish.isPublished },
        "Video publish toggled successfully"
      )
    );
});

const getchanneldetails = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }
  const videos = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "channel",
        foreignField: "owner",
        as: "videos",
      },
    },

    { $unwind: "$videos" },

    {
      $match: {
        "videos.isPublished": true,
      },
    },

    {
      $sort: { "videos.createdAt": -1 },
    },

    {
      $lookup: {
        from: "users",
        localField: "videos.owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    { $unwind: "$owner" },

    {
      $project: {
        _id: "$videos._id",
        title: "$videos.title",
        description: "$videos.description",
        thumbnail: "$videos.thumbnail",
        duration: "$videos.duration",
        videoFile: "$videos.videoFile",
        views: "$videos.views",
        createdAt: "$videos.createdAt",
        owner: {
          _id: "$owner._id",
          username: "$owner.username",
          fullname: "$owner.fullname",
          "avatar.url": "$owner.avatar.url",
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Subscribed videos fetched"));
});

export {
  publishAVideo,
  getchanneldetails,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  getAllVideos,
};
