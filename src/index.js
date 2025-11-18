import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";
import ConnectDb from "./db/index.js";

import dotenv from "dotenv";
import { app } from "./app.js";

dotenv.config({
  path: "./.env",
});

ConnectDb()
  .then(() => {
    // console.log('✅ MongoDB connected successfully.');
    app.on("error", (error) => {
      console.log("ERRR: ", error);
      throw error;
    });
  })
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(
        `⚙️ Server is running at port : http://localhost:${process.env.PORT}`
      );
    });
  })
  .catch((error) => {
    console.log(`mongodb connection failed!!! ${error}`);
  });

// ;(
//     async () => {
//         try {
//             await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
//             app.on("error", (error) => {
//                 console.log(error);
//                 throw error;
//             })
//             app.listen(process.env.PORT, () => {
//                 console.log(`app is running on port ${process.env.PORT}`);

//             })
//         } catch (error) {
//             console.log("error aaya ha db connect mai", error);
//             throw error
//         }
//     }
// )()
