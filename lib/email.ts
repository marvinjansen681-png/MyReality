// Set to true when Resend API key is configured and emails should send
const RESEND_ENABLED = false

export async function sendWorkspaceInvite(params: {
  toEmail: string
  toName: string
  fromName: string
  workspaceName: string
  inviteUrl: string
}): Promise<void> {
  if (!RESEND_ENABLED) {
    console.log('[Email disabled] Would have sent workspace invite to:', params.toEmail)
    return
  }
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: 'MyReality <noreply@myreality.app>',
    to: params.toEmail,
    subject: `${params.fromName} invited you to ${params.workspaceName}`,
    html: `<p>Hi ${params.toName},</p><p>${params.fromName} has invited you to join <strong>${params.workspaceName}</strong> on MyReality.</p><p><a href="${params.inviteUrl}">Accept invitation</a></p>`,
  })
}

export async function sendTaskAssignedEmail(params: {
  toEmail: string
  toName: string
  taskTitle: string
  projectName: string
  assignedBy: string
  taskUrl: string
}): Promise<void> {
  if (!RESEND_ENABLED) {
    console.log('[Email disabled] Would have sent task assigned email to:', params.toEmail)
    return
  }
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: 'MyReality <noreply@myreality.app>',
    to: params.toEmail,
    subject: `You were assigned: ${params.taskTitle}`,
    html: `<p>Hi ${params.toName},</p><p>${params.assignedBy} assigned you to <strong>${params.taskTitle}</strong> in ${params.projectName}.</p><p><a href="${params.taskUrl}">View task</a></p>`,
  })
}

export async function sendPasswordResetEmail(params: {
  toEmail: string
  resetUrl: string
}): Promise<void> {
  if (!RESEND_ENABLED) {
    console.log('[Email disabled] Would have sent password reset to:', params.toEmail)
    return
  }
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: 'MyReality <noreply@myreality.app>',
    to: params.toEmail,
    subject: 'Reset your MyReality password',
    html: `<p>Click the link below to reset your password:</p><p><a href="${params.resetUrl}">Reset password</a></p><p>This link expires in 1 hour.</p>`,
  })
}
