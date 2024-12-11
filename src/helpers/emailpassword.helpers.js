import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail', // Puedes usar otros servicios de email, como Outlook, Yahoo, etc.
  auth: {
    user: "1001.25293425.ucla@gmail.com", // Tu correo electrónico
    pass: "aylr zcmr baul bxpy" // Tu contraseña
  }
});

export default transporter;
