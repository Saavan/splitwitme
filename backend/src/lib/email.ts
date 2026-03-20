import { Resend } from 'resend'
import { config } from '../config'

export async function sendInviteEmail(
  to: string,
  invitedName: string,
  inviterName: string,
  groupName: string,
  inviteUrl: string
): Promise<void> {
  const resend = new Resend(config.resendApiKey)
  await resend.emails.send({
    from: 'SplitWitMe <noreply@splitwitme.app>',
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
