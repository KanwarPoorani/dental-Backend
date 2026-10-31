const nodemailer = require('nodemailer');
const { makeToken } = require('./token');
const tx = process.env.SMTP_HOST && nodemailer.createTransport({
  host: process.env.SMTP_HOST, port: +process.env.SMTP_PORT || 587, secure: process.env.SMTP_PORT == 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});
const when = (a) => `${a.date} at ${a.time}`;
const MSG = {
  received:    [(a) => `We received your request`, (a) => `Hello ${a.name}, we received your request for ${a.service} at our ${a.branch} clinic on ${when(a)}. We will confirm shortly.`],
  confirmed:   [(a) => `Appointment confirmed`, (a) => `Hello ${a.name}, your ${a.service} visit at our ${a.branch} clinic is confirmed for ${when(a)}.`],
  reminder:    [(a) => `Reminder: your dental visit`, (a) => `Reminder: ${a.name}, you have an appointment at our ${a.branch} clinic on ${when(a)}.`],
  rescheduled: [(a) => `Appointment time changed`, (a) => `Hello ${a.name}, your request is now ${when(a)} at ${a.branch}. We will confirm it again shortly.`],
  cancelled:   [(a) => `Appointment cancelled`, (a) => `Hello ${a.name}, your appointment on ${when(a)} at ${a.branch} is cancelled.`],
};
// Pakistani numbers -> E.164 for SMS
const e164 = (p) => { const d = p.replace(/[^\d+]/g, ''); return d.startsWith('+') ? d : d.startsWith('0') ? `+92${d.slice(1)}` : `+${d}`; };

async function sendTwilioSms(to, from, text) {
  const { TWILIO_SID: sid, TWILIO_TOKEN: tok } = process.env;
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${tok}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: from, Body: text }),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(`Twilio SMS returned HTTP ${response.status}${result.code ? ` (code ${result.code})` : ''}`);
  }
}

async function sendSms(a, text) {
  const { TWILIO_SID: sid, TWILIO_TOKEN: tok, TWILIO_FROM: from } = process.env;
  if (!sid || !tok || !from) {
    console.warn('SMS notification skipped: configure TWILIO_SID, TWILIO_TOKEN, and TWILIO_FROM');
    return;
  }
  await sendTwilioSms(e164(a.phone), from, text);
}

async function sendWhatsApp(a, kind, link) {
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
  const apiVersion = process.env.META_WHATSAPP_API_VERSION;
  const templateName = process.env[`META_WHATSAPP_TEMPLATE_${kind.toUpperCase()}`];
  const language = process.env.META_WHATSAPP_TEMPLATE_LANGUAGE || 'en_US';
  if (!phoneNumberId || !accessToken || !apiVersion || !templateName) {
    const required = [
      !phoneNumberId && 'META_WHATSAPP_PHONE_NUMBER_ID',
      !accessToken && 'META_WHATSAPP_ACCESS_TOKEN',
      !apiVersion && 'META_WHATSAPP_API_VERSION',
      !templateName && `META_WHATSAPP_TEMPLATE_${kind.toUpperCase()}`,
    ].filter(Boolean);
    console.warn(`WhatsApp ${kind} notification skipped: configure ${required.join(', ')}`);
    return;
  }
  if (!/^v\d+\.\d+$/.test(apiVersion)) {
    console.warn(`WhatsApp ${kind} notification skipped: META_WHATSAPP_API_VERSION must look like vXX.0`);
    return;
  }

  const values = {
    received: [a.name, a.service, a.branch, when(a), link],
    confirmed: [a.name, a.service, a.branch, when(a), link],
    reminder: [a.name, a.branch, when(a), link],
    rescheduled: [a.name, when(a), a.branch, link],
    cancelled: [a.name, when(a), a.branch],
  };
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: e164(a.phone).replace(/^\+/, ''),
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        components: [{
          type: 'body',
          parameters: values[kind].map((value) => ({ type: 'text', text: String(value) })),
        }],
      },
    }),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    const error = result.error;
    throw new Error(`Meta WhatsApp returned HTTP ${response.status}${error?.code ? ` (code ${error.code})` : ''}${error?.message ? `: ${error.message}` : ''}`);
  }
}

async function sendSafely(channel, send) {
  try {
    await send();
  } catch (error) {
    console.error(`${channel} notification failed:`, error.message);
  }
}

// Notification channel failures must not fail a booking or block another channel.
exports.notify = async (a, kind) => {
  const [subject, text0] = MSG[kind];
  const link = kind === 'cancelled' ? '' : `${process.env.CLIENT_URL}/manage/${makeToken(a._id)}`;
  const text = `${text0(a)}${link ? `\n\nReschedule or cancel: ${link}` : ''}`;
  const tasks = [];
  if (a.email && tx) tasks.push(sendSafely('Email', () => tx.sendMail({ from: process.env.MAIL_FROM, to: a.email, subject: subject(a), text: `${text}\n\nDr. Munesh Kumar & Associates Dental Care Center` })));
  if (a.email && !tx) console.warn('Email notification skipped: SMTP_HOST is not configured');
  if (a.phone) {
    tasks.push(sendSafely('SMS', () => sendSms(a, text)));
    tasks.push(sendSafely('WhatsApp', () => sendWhatsApp(a, kind, link)));
  }
  await Promise.all(tasks);
};
