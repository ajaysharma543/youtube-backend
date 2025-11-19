import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN.split(','), // array of allowed origins
    credentials: true,                          // must be true for cookies
  })
);


app.use(express.json({ limit: "16kb" })); // lets incoming json data like post
app.use(express.urlencoded({ extended: true, limit: "16kb" })); //coming data from url
app.use(express.static("public"));
app.use(cookieParser());
import otprouter from "./routes/otp.routes.js";
app.use("/api/v1/otp", otprouter);

import router from "./routes/user.routes.js";
import videorouter from "./routes/video.routes.js";
import subscriptionrouter from "./routes/subsription.routes.js";
import commentsrouter from "./routes/comments.routes.js";
import likerouter from "./routes/like.routes.js";
import playlistrouter from "./routes/playlist.routes.js";
import dashboardrouter from "./routes/dashboard.routes.js";
import dislikedrouter from "./routes/dislike.routes.js";
import watchlater from "./routes/watchlater.routes.js";

app.use("/api/v1/users", router);
app.use("/api/v1/video", videorouter);
app.use("/api/v1/subscription", subscriptionrouter);
app.use("/api/v1/comments", commentsrouter);
app.use("/api/v1/like", likerouter);
app.use("/api/v1/playlist", playlistrouter);
app.use("/api/v1/dashboard", dashboardrouter);
app.use("/api/v1/dislike", dislikedrouter);
app.use("/api/v1/watchlater", watchlater);

export { app };
