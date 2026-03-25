import { Resend } from 'resend'
import { config } from '../config'

export async function sendAddedToGroupEmail(
  to: string,
  memberName: string,
  adderName: string,
  groupName: string,
  groupUrl: string
): Promise<void> {
  const resend = new Resend(config.resendApiKey)
  await resend.emails.send({
    from: 'SplitWitMe <splitwitme@patel.space>',
    to,
    subject: `${adderName} added you to ${groupName} on SplitWitMe`,
    html: `
      <p>Hi ${memberName},</p>
      <p><strong>${adderName}</strong> has added you to the group <strong>${groupName}</strong> on SplitWitMe.</p>
      <p>You can view transactions and balances for this group here:</p>
      <p><a href="${groupUrl}">${groupName} on SplitWitMe</a></p>
    `,
  })
}

type ReminderLevel = 'friendly' | 'medium' | 'angry'

const REMINDER_COPY: Record<ReminderLevel, {
  subject: string
  image: string
  imageAlt: string
  body: string
  footer: string
}> = {
  friendly: {
    subject: `Psst! A gentle nudge about some money 🐥`,
    image: 'https://splitwitme-frontend.vercel.app/duck_friendly.png',
    imageAlt: 'A friendly duck',
    body: `<p style="font-size: 16px; line-height: 1.5;">
          <strong>CREDITOR_NAME</strong> just wanted to give you a friendly little reminder that
          you owe them <strong style="font-size: 18px;">AMOUNT</strong> in <strong>GROUP_NAME</strong>.
        </p>
        <p style="font-size: 16px; line-height: 1.5;">
          No big deal! Totally fine! The duck is fine. Everyone is fine. 🙂
        </p>
        <p style="font-size: 16px; line-height: 1.5;">
          Whenever you get a chance — seriously, no rush — maybe settle up?
        </p>`,
    footer: 'The duck sends its warmest regards.',
  },
  medium: {
    subject: `⚠️ PAY UP: you owe CREDITOR_NAME AMOUNT`,
    image: 'https://splitwitme-frontend.vercel.app/duck_medium.png',
    imageAlt: 'Pay me my money',
    body: `<p style="font-size: 16px; line-height: 1.5;">
          <strong>CREDITOR_NAME</strong> has noticed that you still owe them
          <strong style="font-size: 18px;">AMOUNT</strong> in <strong>GROUP_NAME</strong>.
        </p>
        <p style="font-size: 16px; line-height: 1.5;">
          They're being <em>very</em> patient. The duck, however, is not.
        </p>
        <p style="font-size: 16px; line-height: 1.5;">
          Please settle up before things get awkward. Or worse.
        </p>`,
    footer: 'This has been a message from SplitWitMe and one very determined duck.',
  },
  angry: {
    subject: `🦆🔪 FINAL WARNING: pay CREDITOR_NAME AMOUNT NOW`,
    image: 'https://splitwitme-frontend.vercel.app/duck_angry.png',
    imageAlt: 'A very angry duck',
    body: `<p style="font-size: 16px; line-height: 1.5;">
          <strong>CREDITOR_NAME</strong> is DONE waiting.
          You owe <strong style="font-size: 18px;">AMOUNT</strong> in <strong>GROUP_NAME</strong>
          and the duck has been informed.
        </p>
        <p style="font-size: 16px; line-height: 1.5;">
          The duck knows where you live. The duck does not forget. The duck does not forgive.
        </p>
        <p style="font-size: 16px; line-height: 1.5;">
          Pay. Now. Before the situation escalates beyond what we can control.
        </p>`,
    footer: '🦆 The duck is watching. Always watching.',
  },
}

export async function sendBalanceReminderEmail(
  to: string,
  debtorName: string,
  creditorName: string,
  amount: string,
  groupName: string,
  groupUrl: string,
  level: ReminderLevel = 'medium'
): Promise<void> {
  const copy = REMINDER_COPY[level]
  const filledBody = copy.body
    .replace(/CREDITOR_NAME/g, creditorName)
    .replace(/AMOUNT/g, amount)
    .replace(/GROUP_NAME/g, groupName)
  const filledSubject = copy.subject
    .replace(/CREDITOR_NAME/g, creditorName)
    .replace(/AMOUNT/g, amount)

  const resend = new Resend(config.resendApiKey)
  await resend.emails.send({
    from: 'SplitWitMe <splitwitme@patel.space>',
    to,
    subject: filledSubject,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <img
          src="${copy.image}"
          alt="${copy.imageAlt}"
          style="width: 100%; border-radius: 12px; margin-bottom: 24px;"
        />
        <h2 style="margin: 0 0 12px;">Hey ${debtorName},</h2>
        ${filledBody}
        <a
          href="${groupUrl}"
          style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #16a34a; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;"
        >
          View my balance →
        </a>
        <p style="margin-top: 24px; font-size: 12px; color: #888;">
          ${copy.footer}
        </p>
      </div>
    `,
  })
}

export async function sendInviteEmail(
  to: string,
  invitedName: string,
  inviterName: string,
  groupName: string,
  inviteUrl: string
): Promise<void> {
  const resend = new Resend(config.resendApiKey)
  await resend.emails.send({
    from: 'SplitWitMe <splitwitme@patel.space>',
    to,
    subject: `${inviterName} invited you to join ${groupName} on SplitWitMe`,
    html: `
      <p>Hi ${invitedName},</p>
      <p><strong>${inviterName}</strong> has invited you to join the group <strong>${groupName}</strong> on SplitWitMe.</p>
      <p><a href="${inviteUrl}">Accept Invitation</a></p>
      <p>This link expires in 7 days.</p>
    `,
  })
}
