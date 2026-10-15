import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';

/* ───────── Transporter SMTP ───────── */

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

/* ───────── Chargement du template ───────── */

const templatePath = path.join(__dirname, '..', 'templates', 'confirmation-email.html');

const loadTemplate = (replacements: Record<string, string>): string => {
  let html = fs.readFileSync(templatePath, 'utf-8');

  for (const [key, value] of Object.entries(replacements)) {
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }

  return html;
};

/* ───────── Envoi de l'email de confirmation ───────── */

interface ConfirmationEmailParams {
  to: string;
  firstName: string;
  confirmationCode: string;
}

export const sendConfirmationEmail = async ({
  to,
  firstName,
  confirmationCode,
}: ConfirmationEmailParams): Promise<void> => {
  const html = loadTemplate({
    FIRST_NAME: firstName,
    CONFIRMATION_CODE: confirmationCode,
  });

  const mailOptions = {
    from: `"CCarré" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Confirme ton compte CCarré',
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[OK] Confirmation email sent to ${to}`);
  } catch (error) {
    console.error(`[ERROR] Failed to send confirmation email to ${to}:`, error);
    throw new Error("Impossible d'envoyer l'email de confirmation");
  }
};

