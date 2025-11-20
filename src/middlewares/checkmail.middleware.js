import nodemailer from "nodemailer";
import { asyncHandler } from "../../src/utils/asynchandler.js";

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_SMTP_KEY,
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 60000,
  greetingTimeout: 60000,
  socketTimeout: 60000,
  // IMPORTANT: force IPv4 for Render
  family: 4
});
export const sendEmail = asyncHandler(async (to, subject, text) => {
   try{
     const info = await transporter.sendMail({
      from: process.env.BREVO_USER,  
      to,
      subject,
      text,
    });

    console.log("Email sent:", info.messageId);
   }
   catch (error) {
    console.error("Email error:", error);
  }
}
)