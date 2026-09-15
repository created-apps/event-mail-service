import { config } from '../config.js';

/* Shared shell ------------------------------------------------------- */

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

function shell(bodyHtml) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f6f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f4;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:10px;padding:32px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1f2328;">
        ${bodyHtml}
        <p style="margin:28px 0 0;color:#6b7280;font-size:13px;">
          CreatED &middot; <a href="mailto:labs@create-ed.in" style="color:#6b7280;">labs@create-ed.in</a>
        </p>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/* Branded shell — used for the acceptance and enrollment emails only. The
   acknowledgement and rejection keep the plain shell above. */

function brandShell(bodyHtml) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f6f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f4;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <tr><td style="background:#111111;padding:32px;">
          <span style="font-size:34px;font-weight:700;letter-spacing:-0.5px;color:#ffffff;">Creat<span style="color:#ffd400;">ED</span></span>
        </td></tr>
        <!-- Outlook ignores linear-gradient and falls back to the solid yellow. -->
        <tr><td style="height:6px;line-height:6px;font-size:0;background:#ffd400;background-image:linear-gradient(90deg,#ffd400 0%,#9ccb3b 45%,#2d7ff9 100%);">&nbsp;</td></tr>
        <tr><td style="padding:32px;font-size:16px;line-height:1.7;color:#1f2328;">
          ${bodyHtml}
          <p style="margin:28px 0 0;color:#6b7280;font-size:13px;">
            CreatED &middot; <a href="mailto:labs@create-ed.in" style="color:#6b7280;">labs@create-ed.in</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Small blue all-caps heading that introduces a block. */
const SECTION = (t) =>
  `<div style="color:#2d7ff9;font-size:13px;font-weight:700;letter-spacing:1.5px;margin:24px 0 12px;">${esc(
    String(t).toUpperCase()
  )}</div>`;

/** Dark "transfer information" card. rows: [[label, value], ...] */
function transferCard(rows) {
  const cells = rows
    .map(([label, value], i) => {
      const divider = i ? 'border-top:1px solid rgba(255,255,255,0.14);' : '';
      const pad = i ? 'padding:13px 0;' : 'padding:0 0 13px;';
      return `
        <tr>
          <td style="${pad}${divider}color:#9a9a9a;font-size:14px;">${esc(label)}</td>
          <td align="right" style="${pad}${divider}color:#ffffff;font-size:15px;font-weight:700;">${esc(value)}</td>
        </tr>`;
    })
    .join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111111;border-radius:12px;margin:0 0 18px;">
    <tr><td style="padding:24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cells}
      </table>
    </td></tr>
  </table>`;
}

const P = (t) => `<p style="margin:0 0 14px;">${t}</p>`;
const LI = (t) => `<li style="margin:0 0 8px;">${t}</li>`;
const UL = (items) =>
  `<ul style="margin:0 0 14px;padding-left:20px;">${items.join('')}</ul>`;
const link = (href, label) =>
  `<a href="${esc(href)}" style="color:#1a56db;">${esc(label ?? href)}</a>`;

/* 1 — Application received ------------------------------------------ */

export function applicationReceived({ name }) {
  const subject =
    'Thank you for submitting your Application for CreatED Labs 2026 | CreatED';

  const html = shell(
    P(`Dear ${esc(name)},`) +
      P('Thank you for applying to CreatED Labs.') +
      P(
        'We’ve received your application successfully. Our team will review your application and you will hear from us within 3 weeks regarding whether you have been selected for the 2026 cohort.'
      ) +
      P('<strong>Please note: Additional Program Costs</strong>') +
      P(
        'In addition to the program fee, the following costs may apply and are billed separately:'
      ) +
      UL([
        LI(
          '<strong>Materials for your lab work:</strong> ₹40,000–₹80,000, depending on your project requirements'
        ),
        LI(
          '<strong>Publication fees:</strong> If you choose to submit your research paper for publication after completing the program, additional costs may apply if a journal levies an external publication or processing charge. This fee will be directly paid to the journal.'
        ),
        LI(
          '<strong>Travel costs:</strong> For your round-trip one or two day weekend visit to Jaipur.'
        ),
      ]) +
      P(
        'Our team will be in touch with the next steps once the selection process is complete.'
      ) +
      P(
        `Have any questions? Please email us your queries on ${link('mailto:labs@create-ed.in', 'labs@create-ed.in')}`
      ) +
      P('Best,<br>Team CreatED')
  );

  const text = `Dear ${name},

Thank you for applying to CreatED Labs.

We've received your application successfully. Our team will review your application and you will hear from us within 3 weeks regarding whether you have been selected for the 2026 cohort.

Please note: Additional Program Costs
In addition to the program fee, the following costs may apply and are billed separately:
  * Materials for your lab work: Rs 40,000-80,000, depending on your project requirements
  * Publication fees: If you choose to submit your research paper for publication after completing the program, additional costs may apply if a journal levies an external publication or processing charge. This fee will be directly paid to the journal.
  * Travel costs: For your round-trip one or two day weekend visit to Jaipur.

Our team will be in touch with the next steps once the selection process is complete.

Have any questions? Please email us your queries on labs@create-ed.in

Best,
Team CreatED`;

  return { subject, html, text };
}

/* 2A — Selected ------------------------------------------------------ */

export function selected({ name }) {
  const subject = 'Congratulations! You’ve been selected for the CreatED Labs 2026!';
  const form = config.links.parentForm;

  const html = brandShell(
    P(`Dear ${esc(name)},`) +
      P('Congratulations! 🎉') +
      P(
        'We’re excited to let you know that you have been selected for CreatED Labs 2026 and offered a place in our upcoming cohort.'
      ) +
      P(
        'Over the course of the program, you’ll work with expert mentors to develop a research-driven biochemistry project, your initial area of interest to a defined research question, experimentation, and a final project outcome.'
      ) +
      P('<strong>Confirm Your Seat</strong>') +
      P('To confirm your place in the cohort, please complete your program fee payment:') +
      UL([
        LI('<strong>Individual:</strong> ₹5,00,000 + GST = ₹5,90,000'),
        LI('<strong>Team of 2:</strong> ₹3,00,000 + GST = ₹3,54,000 (per student)'),
      ]) +
      SECTION('Bank Details') +
      transferCard([
        ['Account Name', 'CREATED'],
        ['Account no.', '020902000003805'],
        ['IFSC', 'IOBA0000209'],
      ]) +
      P(
        'Once we receive and verify your payment, we will confirm your enrollment and send you the next steps for getting started.'
      ) +
      P(
        `In the meanwhile, please complete the parent details form using the link below:<br>${link(form)}`
      ) +
      P(
        'We’re excited about the possibility of having you join us and look forward to seeing what you build and research through the program.'
      ) +
      P('Best,<br>Team CreatED')
  );

  const text = `Dear ${name},

Congratulations!

We're excited to let you know that you have been selected for CreatED Labs 2026 and offered a place in our upcoming cohort.

Over the course of the program, you'll work with expert mentors to develop a research-driven biochemistry project, your initial area of interest to a defined research question, experimentation, and a final project outcome.

Confirm Your Seat
To confirm your place in the cohort, please complete your program fee payment:
  * Individual: Rs 5,00,000 + GST = Rs 5,90,000
  * Team of 2: Rs 3,00,000 + GST = Rs 3,54,000 (per student)

Bank Details:
Account Name: CREATED
Account no. 020902000003805
IFSC: IOBA0000209

Once we receive and verify your payment, we will confirm your enrollment and send you the next steps for getting started.

In the meanwhile, please complete the parent details form using the link below:
${form}

We're excited about the possibility of having you join us and look forward to seeing what you build and research through the program.

Best,
Team CreatED`;

  return { subject, html, text };
}

/* 2B — Payment received + enrolled ----------------------------------- */

export function enrolled({ name, whatsappGroupLink }) {
  const subject = 'Welcome to CreateED Labs! You’re officially enrolled!';
  const form = config.links.parentForm;
  const booking = config.links.booking;

  const html = brandShell(
    P(`Dear ${esc(name)},`) +
      P('Welcome to the CreatED Labs Cohort of 2026! 🎉') +
      P('We’ve received your payment and are pleased to confirm your enrollment in the upcoming cohort.') +
      P(`Please join your WhatsApp group: ${link(whatsappGroupLink)}`) +
      P(
        'This WhatsApp group will be used to share important announcements, daily schedules, mentor updates, and key resources throughout the program.'
      ) +
      P(
        `If you haven’t already filled out the parent details form shared in your acceptance email, kindly complete it now: ${link(form)}`
      ) +
      P('<strong>Your First Step: Book Your Ideation Call</strong>') +
      P(
        'Your first conversation with us will be an Ideation Call, where we’ll deep dive into your interests, the areas of science you’re curious about, and the kinds of projects you might want to build.'
      ) +
      P(
        'By the end of the call, you will have a clearer direction for the research and prototype you’ll develop during CreatED Labs.'
      ) +
      P(link(booking, 'Book your Ideation Call')) +
      P(
        '<strong>Important to Note:</strong> Your project topic needs to be finalised by November 1, 2026. This will allow our team sufficient time to identify, order, and prepare the required materials before the program begins.'
      ) +
      P(
        'We’ll also be sharing your mentor details, session schedules and your first few weeks’ plan shortly.'
      ) +
      P('Welcome once again! We’re excited to have you as a part of this year’s cohort!') +
      P(
        `If you have any queries, feel free to email us at ${link('mailto:labs@create-ed.in', 'labs@create-ed.in')}.`
      ) +
      P('Best,<br>Team CreatED')
  );

  const text = `Dear ${name},

Welcome to the CreatED Labs Cohort of 2026!

We've received your payment and are pleased to confirm your enrollment in the upcoming cohort.

Please join your WhatsApp group: ${whatsappGroupLink}

This WhatsApp group will be used to share important announcements, daily schedules, mentor updates, and key resources throughout the program.

If you haven't already filled out the parent details form shared in your acceptance email, kindly complete it now: ${form}

Your First Step: Book Your Ideation Call
Your first conversation with us will be an Ideation Call, where we'll deep dive into your interests, the areas of science you're curious about, and the kinds of projects you might want to build.

By the end of the call, you will have a clearer direction for the research and prototype you'll develop during CreatED Labs.

${booking}

Important to Note: Your project topic needs to be finalised by November 1, 2026. This will allow our team sufficient time to identify, order, and prepare the required materials before the program begins.

We'll also be sharing your mentor details, session schedules and your first few weeks' plan shortly.

Welcome once again! We're excited to have you as a part of this year's cohort!

If you have any queries, feel free to email us at labs@create-ed.in.

Best,
Team CreatED`;

  return { subject, html, text };
}

/* 3 — Not selected ---------------------------------------------------- */

export function notSelected({ name }) {
  const subject = 'An Update on your CreatED Labs application';
  const consult = config.links.consultation;

  const html = shell(
    P(`Dear ${esc(name)},`) +
      P(
        'Thank you for taking the time to apply to the CreatED Labs and for sharing your interests and aspirations with us.'
      ) +
      P(
        'After carefully reviewing the applications, we’re sorry to let you know that we’re unable to offer you a place in this year’s cohort.'
      ) +
      P(
        'This decision does not mean that you cannot pursue meaningful work in biochemistry, research, or innovation. There are several ways to develop a strong research or passion project based on your interests and experience.'
      ) +
      P(
        'If you would still like to explore what you could work on, we’d be happy to speak with you and understand your interests better.'
      ) +
      P(`Book a consultation with our team:<br>${link(consult, 'Book a consultation')}`) +
      P(
        'We can explore whether a CreatED Passion Project or Research &amp; Build Program could be a better fit for your goals.'
      ) +
      P(
        'Thank you again for your interest in CreatED, and we wish you the very best with your future projects and academic journey.'
      ) +
      P('Best,<br>Team CreatED')
  );

  const text = `Dear ${name},

Thank you for taking the time to apply to the CreatED Labs and for sharing your interests and aspirations with us.

After carefully reviewing the applications, we're sorry to let you know that we're unable to offer you a place in this year's cohort.

This decision does not mean that you cannot pursue meaningful work in biochemistry, research, or innovation. There are several ways to develop a strong research or passion project based on your interests and experience.

If you would still like to explore what you could work on, we'd be happy to speak with you and understand your interests better.

Book a consultation with our team:
${consult}

We can explore whether a CreatED Passion Project or Research & Build Program could be a better fit for your goals.

Thank you again for your interest in CreatED, and we wish you the very best with your future projects and academic journey.

Best,
Team CreatED`;

  return { subject, html, text };
}
