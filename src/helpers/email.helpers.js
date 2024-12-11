import nodemailer from 'nodemailer';

const emailHelper = async (to, subject, text) => {
  // Create a transporter
let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {

        user: "1001.25293425.ucla@gmail.com",
        pass: "aylr zcmr baul bxpy",
        // user: process.env.NODEMAILER_USER,
        // pass: process.env.NODEMAILER_PASS,
    },
});

  // Set up email options
let mailOptions = {
    from: "1001.25293425.ucla@gmail.com",
    to: to,
    subject: subject,
    text: text,
};

  // Send the email
try {
    let info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
    return info;
} catch (error) {
    console.error("Error sending email:", error);
    throw error;
}
};

export default  emailHelper;