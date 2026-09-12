import sgMail from '@sendgrid/mail';
import { config } from './config.js';

sgMail.setApiKey(config.sendgrid.apiKey);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validEmail(v) {
  return EMAIL_RE.test(String(v ?? '').trim());
}

/**
 * @param {{to:string, cc?:string[], subject:string, html:string, text:string, tag:string}} msg
 */
export async function send({ to, cc = [], subject, html, text, tag }) {
  const recipients = [...new Set(cc.filter(validEmail).map((e) => e.trim().toLowerCase()))]
    .filter((e) => e !== to.trim().toLowerCase());

  if (config.dryRun) {
    console.log(
      `[dry-run] ${tag} -> ${to}${recipients.length ? ` (cc ${recipients.join(', ')})` : ''} | ${subject}`
    );
    return { dryRun: true };
  }

  const [res] = await sgMail.send({
    to,
    ...(recipients.length ? { cc: recipients } : {}),
    from: { email: config.sendgrid.fromEmail, name: config.sendgrid.fromName },
    replyTo: config.sendgrid.replyTo,
    subject,
    text,
    html,
    categories: ['created-labs-2026', tag],
    trackingSettings: { clickTracking: { enable: false, enableText: false } },
  });

  return { statusCode: res.statusCode, messageId: res.headers['x-message-id'] };
}
