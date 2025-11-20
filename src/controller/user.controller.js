import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../../src/utils/asynchandler.js";
import { ApiError } from "../../src/utils/apierror.js";
import { ApiResponse } from "../../src/utils/apiresponse.js";
import { deleteOnCloudinary, uploadcloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import { generateAccessAndRefereshTokens } from "../middlewares/generatetokes.middleware.js";

const registeruser = asyncHandler(async (req, res) => {
  const { fullname, email, username, password } = req.body;
  console.log(fullname, email, username, password);

  const Existeduser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (Existeduser) {
    throw new ApiError(409, "User with same email or username already exists");
  }

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  let coverImageLocalPath = null;
  let coverImage = null;

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file not found");
  }

  const avatar = await uploadcloudinary(avatarLocalPath);

  if (coverImageLocalPath) {
    coverImage = await uploadcloudinary(coverImageLocalPath);
  }

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    fullname,
    email,
    password,
    username: username.toLowerCase(),
    avatar: {
      public_id: avatar.public_id,
      url: avatar.secure_url,
    },
    coverImage: {
      public_id: coverImage?.public_id || "",
      url: coverImage?.secure_url || "",
    },
  });
  const { accesstoken, refreshtoken } = await generateAccessAndRefereshTokens(
    user._id
  );

  const createdUser = await User.findById(user?._id).select(
    "-password -refreshtoken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

const isProduction = process.env.NODE_ENV === "production";

const options = {
  httpOnly: true,
  secure: isProduction,            // HTTPS only
  sameSite: isProduction ? "none" : "lax",  // allow cross-origin in prod
  maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days
};


  res
    .status(200)
    .cookie("accesstoken", accesstoken, options)
    .cookie("refreshtoken", refreshtoken, options)
    .json(
      new ApiResponse(
        200,
        { user: accesstoken, refreshtoken }, createdUser,
        "User registered successfully"
      )
    );
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if (!(email || username)) {
    throw new ApiError(400, "email or username is required");
  }

  const Existeduser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!Existeduser) {
    throw new ApiError(404, "user not found");
  }

  const isPasswordCorrect = await Existeduser.isPasswordcorrect(password);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "password not found");
  }

  const { accesstoken, refreshtoken } = await generateAccessAndRefereshTokens(
    Existeduser._id
  );

  const loggedInUser = await User.findById(Existeduser?._id).select(
    "-password -refreshtoken"
  );

const isProduction = process.env.NODE_ENV === "production";

const options = {
  httpOnly: true,
  secure: isProduction,            // HTTPS only
  sameSite: isProduction ? "none" : "lax",  // allow cross-origin in prod
  maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days
};

  res
    .status(200)
    .cookie("accesstoken", accesstoken, options)
    .cookie("refreshtoken", refreshtoken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accesstoken,
          refreshtoken,
        },
        "user logged in successfully"
      )
    );
});


const logoutuser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $unset: {
        refreshtoken: 1,
      },
    },
    {
      new: true,
    }
  );
const options = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
};


  return res
    .status(200)
    .clearCookie("accesstoken", options)
    .clearCookie("refreshtoken", options)
    .json(new ApiResponse(200, {}, "user logout successfully"));
});
const refreshAccesstoken = asyncHandler(async (req, res) => {
  const incomingRefreshtoken =
    req.cookies?.refreshtoken || req.body.refreshtoken;

  if (!incomingRefreshtoken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshtoken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshtoken !== user?.refreshtoken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const { accesstoken, refreshtoken: newRefreshtoken } =
      await generateAccessAndRefereshTokens(user._id);

    const options = {
      httpOnly: true,
      secure: true, // use false for local testing if not using HTTPS
    };

    res
      .status(200)
      .cookie("accesstoken", accesstoken, options)
      .cookie("refreshtoken", newRefreshtoken, options)
      .json(
        new ApiResponse(
          200,
          { accesstoken, refreshtoken: newRefreshtoken },
          "Refresh token updated successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findOne(req.user._id);

  const isPasswordCorrect = await user.isPasswordcorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    throw new ApiError(400, "Email and new password are required");
  }

  // Find user by email
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Set new password
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset successfully"));
});
const checkEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, "Email is required");

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  return res.status(200).json(new ApiResponse(200, {}, "Email exists"));
});

const changeaccountdetails = asyncHandler(async (req, res) => {
  const { fullname, email, username } = req.body;
  if (!(fullname || email || username)) {
    throw new ApiError(400, "all fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email,
        username,
      },
    },
    {
      new: true,
    }
  ).select("-password, -refreshtoken");

  if (!user) {
    throw new ApiError(400, "user not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const description = asyncHandler(async (req, res) => {
  const { description } = req.body;

  if (description === undefined) {
    throw new ApiError(400, "Description field is required");
  }

  const user = await User.findOneAndUpdate(
    { _id: req.user._id }, // FIXED
    { $set: { description } },
    { new: true }
  ).select("-password -refreshtoken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Description updated successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

const changeuseravatar = asyncHandler(async (req, res) => {
  const newavatar = req.file.path;
  if (!newavatar) {
    throw new ApiError(404, "avatar file not found");
  }
  const avatar = await uploadcloudinary(newavatar);

  if (!avatar?.url) {
    throw new ApiError(400, "Error while uploading avatar");
  }
  const user = await User.findById(req.user?._id).select("avatar");

  const avatarToDelete = user.avatar.public_id;

  const updatedavatar = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: {
          public_id: avatar.public_id,
          url: avatar.url,
        },
      },
    },
    {
      new: true,
    }
  ).select("-password");

  if (avatarToDelete) {
    await deleteOnCloudinary(avatarToDelete);
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedavatar, "Avatar image updated successfully")
    );
});

const changeusercoverimage = asyncHandler(async (req, res) => {
  const newcoveravatar = req.file.path;
  if (!newcoveravatar) {
    throw new ApiError(404, "coverImage file not found");
  }
  const coverImage = await uploadcloudinary(newcoveravatar);

  if (!coverImage?.url) {
    throw new ApiError(400, "Error while uploading avatar");
  }
  const user = await User.findById(req.user?._id).select("coverImage");

  const coverImageToDelete = user.coverImage.public_id;

  const updatedcoverImage = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: {
          public_id: coverImage.public_id,
          url: coverImage.url,
        },
      },
    },
    {
      new: true,
    }
  ).select("-password");

  if (coverImageToDelete) {
    await deleteOnCloudinary(coverImageToDelete);
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedcoverImage, "coverImage updated successfully")
    );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username) {
    throw new ApiError(400, "username is missing");
  }

  const Channel = await User.aggregate([
    {
      $match: {
        $or: [
          { username: { $regex: username, $options: "i" } },
          { fullname: { $regex: username, $options: "i" } },
        ],
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscriber",
      },
    },

    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "subscribedTo.channel",
        foreignField: "_id",
        as: "mysubscribedchannels",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "channelSubscribers",
            },
          },

          {
            $addFields: {
              totalsubscriber: { $size: "$channelSubscribers" },
              issubscribed: {
                $in: [req.user?._id, "$channelSubscribers.subscriber"],
              },
            },
          },

          {
            $project: {
              _id: 1,
              username: 1,
              fullname: 1,
              "avatar.url": 1,
              "coverImage.url": 1,
              totalsubscriber: 1,
              description: 1,
              issubscribed: 1,
            },
          },
        ],
      },
    },

    {
      $addFields: {
        totalsubscriber: { $size: "$subscriber" },
        totalchannelsubscriber: { $size: "$subscribedTo" },
        issubscribed: {
          $in: [req.user?._id, "$subscriber.subscriber"],
        },
      },
    },

    {
      $project: {
        fullname: 1,
        username: 1,
        avatar: 1,
        coverImage: 1,
        totalsubscriber: 1,
        description: 1,
        totalchannelsubscriber: 1,
        issubscribed: 1,
        mysubscribedchannels: 1,
      },
    },
  ]);

  if (!Channel?.length) {
    throw new ApiError(404, "channel does not exist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, Channel[0], "channel details fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchhistory",
        foreignField: "_id",
        as: "videohistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "videoowner",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    avatar: 1,
                    fullname: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$videoowner",
              },
            },
          },
        ],
      },
    },
    {
      $project: {
        videohistory: 1,
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].videohistory,
        "Watch history fetched successfully"
      )
    );
});

const deleteWatchHistory = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "video not found");
  }

  const updateduser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $pull: { watchhistory: videoId },
    },
    { new: true }
  );
  if (!updateduser) {
    throw new ApiError(404, "User not found");
  }
  return res.status(200).json(new ApiResponse(200, updateduser, "deleted"));
});

const deleteallWatchHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "userId not found");
  }

  const updateduser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { watchhistory: [] },
    },
    { new: true }
  );
  if (!updateduser) {
    throw new ApiError(404, "User not found");
  }
  return res.status(200).json(new ApiResponse(200, updateduser, "deleted"));
});
export {
  registeruser,
  loginUser,
  deleteallWatchHistory,
  logoutuser,
  deleteWatchHistory,
  refreshAccesstoken,
  changeCurrentPassword,
  changeaccountdetails,
  getCurrentUser,
  changeusercoverimage,
  changeuseravatar,
  getUserChannelProfile,
  getWatchHistory,
  resetPassword,
  description,
  checkEmail
};
