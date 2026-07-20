const nodemailer = require('nodemailer');

const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

let transporter = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
} else {
  console.warn('[mailer] SMTP not configured (see .env.example) — booking notification emails will be skipped.');
}

async function sendBookingNotification({ pro, booking, dashboardUrl }) {
  if (!transporter) return;

  const lines = [
    `${booking.client_name} sent a booking request through your Fieldsheet profile.`,
    '',
    `Email: ${booking.client_email}`,
    booking.client_phone ? `Phone: ${booking.client_phone}` : null,
    booking.preferred_date ? `Preferred date: ${booking.preferred_date}` : null,
    '',
    booking.job_description || '(No job description provided.)',
    '',
    `Manage this request: ${dashboardUrl}`,
  ].filter((line) => line !== null);

  try {
    await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: pro.email,
      replyTo: booking.client_email,
      subject: `New booking request from ${booking.client_name}`,
      text: lines.join('\n'),
    });
  } catch (err) {
    console.error('[mailer] Failed to send booking notification:', err.message);
  }
}

module.exports = { sendBookingNotification };
