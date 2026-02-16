export const passwordResetTemplate = (otp) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
    <h2 style="color: #2c3e50; text-align: center;">
      MDLRPR - Password Reset Request
    </h2>
    <p>Dear Member,</p>
    <p>Your One-Time Password (OTP) for updating your password is:</p>
    <p style="font-size: 20px; font-weight: bold; text-align: center; color: #d35400;">
      ${otp}
    </p>
    <p>This OTP is valid for <b>5 minutes</b>. Please do not share this OTP with anyone.</p>
    <hr style="margin: 20px 0;" />
    <p style="font-size: 13px; color: #555;">
      If you did not request a password reset, please ignore this email or contact MDLRPR support immediately.
    </p>
    <p style="font-size: 13px; color: #555;">
      This is a system-generated email. Please do not reply to this message.
    </p>
    <p style="margin-top: 20px; font-size: 13px; color: #777;">
      Regards,<br/>
      <strong>MDLRPR Support Team</strong><br/>
      Organization of MDLRPR
    </p>
  </div>
`;
