import nodemailer from "nodemailer";

export async function sendMail(to: string, subject: string, text: string) {
  const host = process.env.SMTP_HOST;
  if (!host) {
    // Mode lokal: tanpa SMTP, isi email dicetak ke log server.
    console.log(`[mail:dev] Kepada: ${to}\nSubjek: ${subject}\n${text}`);
    return;
  }
  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  await transport.sendMail({ from: process.env.SMTP_FROM, to, subject, text });
}
