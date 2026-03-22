// TEMPORARY — delete after debugging
export async function GET() {
  return Response.json({
    AUTH_SECRET: { set: !!process.env.AUTH_SECRET, length: process.env.AUTH_SECRET?.length ?? 0 },
    AUTH_GOOGLE_ID: {
      set: !!process.env.AUTH_GOOGLE_ID,
      length: process.env.AUTH_GOOGLE_ID?.length ?? 0,
      prefix: process.env.AUTH_GOOGLE_ID?.slice(0, 8) ?? null,
    },
    AUTH_GOOGLE_SECRET: {
      set: !!process.env.AUTH_GOOGLE_SECRET,
      length: process.env.AUTH_GOOGLE_SECRET?.length ?? 0,
      prefix: process.env.AUTH_GOOGLE_SECRET?.slice(0, 8) ?? null,
    },
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST,
    AUTH_URL: process.env.AUTH_URL,
  })
}
