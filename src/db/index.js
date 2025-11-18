import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const ConnectDb = async () => {
  try {
    const connection = await mongoose.connect(
      `${process.env.MONGODB_URL}/${DB_NAME}`
    );
    console.log(`\nMongoDB connected: ${connection.connection.host}`);
  } catch (error) {
    console.log("Error connecting MongoDB:", error);
    process.exit(1);
  }
};

export default ConnectDb;
