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

export async function sendBalanceReminderEmail(
  to: string,
  debtorName: string,
  creditorName: string,
  amount: string,
  groupName: string,
  groupUrl: string
): Promise<void> {
  const resend = new Resend(config.resendApiKey)
  await resend.emails.send({
    from: 'SplitWitMe <splitwitme@patel.space>',
    to,
    subject: `⚠️ PAY UP: you owe ${creditorName} ${amount}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <img
          src="https://splitwitme-frontend.vercel.app/duck_knife.png"
          alt="Pay me my money"
          style="width: 100%; border-radius: 12px; margin-bottom: 24px;"
        />
        <h2 style="margin: 0 0 12px;">Hey ${debtorName},</h2>
        <p style="font-size: 16px; line-height: 1.5;">
          <strong>${creditorName}</strong> has noticed that you still owe them
          <strong style="font-size: 18px;">${amount}</strong> in <strong>${groupName}</strong>.
        </p>
        <p style="font-size: 16px; line-height: 1.5;">
          They're being <em>very</em> patient. The duck, however, is not.
        </p>
        <p style="font-size: 16px; line-height: 1.5;">
          Please settle up before things get awkward. Or worse.
        </p>
        <a
          href="${groupUrl}"
          style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #16a34a; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;"
        >
          View my balance →
        </a>
        <p style="margin-top: 24px; font-size: 12px; color: #888;">
          This has been a message from SplitWitMe and one very determined duck.
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
