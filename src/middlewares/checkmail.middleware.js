import { Resend } from 'resend';
import { asyncHandler } from "../../src/utils/asynchandler.js";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = asyncHandler(async (to, subject, text) => {
  try {
    const data = await resend.emails.send({
      from: 'Your App Name <onboarding@resend.dev>',
      to,
      subject,
      text,
    });

    console.log("Email sent:", data);
  } catch (error) {
    console.error("Error sending email:", error.message);
    throw error;
  }
});
