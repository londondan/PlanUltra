const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? 'danrjames@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())

export function isAdmin(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase())
}
