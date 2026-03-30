import Link from 'next/link'
import { signIn } from '@/lib/auth'
import { GuestEntryLink } from '@/components/GuestEntryLink'

export default function SignInPage() {
  return (
    <div style={{ position: "relative", minHeight: "100vh", background: "#02071E", overflow: "hidden", fontFamily: "var(--font-geist-sans, system-ui)" }}>

      {/* Mountain SVG background */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        viewBox="0 0 1440 680"
        preserveAspectRatio="xMidYMax slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#071428" />
            <stop offset="100%" stopColor="#02071E" />
          </linearGradient>
          <linearGradient id="rg5" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b8e0f8" stopOpacity="0.58" />
            <stop offset="100%" stopColor="#82C7F6" stopOpacity="0.38" />
          </linearGradient>
          <linearGradient id="rg4" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a8fd4" stopOpacity="0.82" />
            <stop offset="100%" stopColor="#1D7CBE" stopOpacity="0.92" />
          </linearGradient>
          <linearGradient id="rg3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#165f9a" />
            <stop offset="100%" stopColor="#0f4070" />
          </linearGradient>
          <linearGradient id="rg2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#082d4a" />
            <stop offset="100%" stopColor="#040e1c" />
          </linearGradient>
          <linearGradient id="rg1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#051220" />
            <stop offset="100%" stopColor="#02071E" />
          </linearGradient>
          <radialGradient id="atmoGlow" cx="50%" cy="0%" r="65%" fx="50%" fy="0%">
            <stop offset="0%" stopColor="#82C7F6" stopOpacity="0.20" />
            <stop offset="50%" stopColor="#1D7CBE" stopOpacity="0.08" />
            <stop offset="100%" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="1440" height="680" fill="url(#skyGrad)" />
        <rect width="1440" height="680" fill="url(#atmoGlow)" />

        {/* Layer 5 */}
        <path d="M0,430 C35,405 65,375 90,340 C110,312 118,290 130,265 C142,240 155,228 170,220 C185,212 200,212 215,220 C230,228 242,245 255,272 C268,300 278,330 300,358 C320,382 345,400 375,412 C400,422 425,418 452,405 C475,393 490,372 508,345 C524,320 534,298 548,275 C562,252 576,240 592,234 C608,228 624,228 638,236 C652,244 664,260 677,285 C690,310 700,340 718,368 C735,393 755,410 782,420 C808,430 835,428 862,415 C886,403 902,382 920,355 C937,330 947,306 962,282 C977,258 992,244 1010,238 C1028,232 1046,234 1062,244 C1078,254 1090,272 1104,298 C1118,324 1128,354 1148,380 C1166,403 1188,418 1216,425 C1242,432 1268,428 1295,415 C1318,403 1335,382 1355,358 C1375,334 1395,310 1420,292 C1430,285 1436,280 1440,278 L1440,680 L0,680 Z" fill="url(#rg5)" />

        {/* Layer 4 */}
        <path d="M0,490 C30,472 58,452 85,428 C108,407 124,388 145,368 C166,348 186,338 208,336 C230,334 252,342 272,358 C292,374 308,398 328,422 C348,445 370,462 398,472 C425,481 452,480 480,470 C505,460 524,440 546,415 C568,390 584,365 605,342 C626,319 648,306 672,302 C696,298 720,304 742,318 C764,332 780,356 800,382 C820,408 840,430 868,445 C895,459 924,462 954,452 C980,443 1000,422 1022,396 C1044,370 1060,342 1082,318 C1104,294 1128,280 1155,278 C1182,276 1208,286 1232,304 C1256,322 1274,350 1295,376 C1316,402 1338,424 1368,438 C1396,451 1420,453 1440,450 L1440,680 L0,680 Z" fill="url(#rg4)" />

        {/* Layer 3 */}
        <path d="M0,548 C40,534 80,520 125,506 C165,493 200,482 240,474 C280,466 315,464 350,470 C385,476 415,490 450,506 C488,523 524,538 565,546 C605,553 645,552 685,544 C722,536 755,520 792,504 C830,487 868,472 910,464 C952,456 990,456 1028,464 C1065,472 1098,488 1132,506 C1168,525 1200,542 1240,550 C1278,558 1316,555 1356,544 C1388,534 1416,520 1440,512 L1440,680 L0,680 Z" fill="url(#rg3)" />

        {/* Layer 2 */}
        <path d="M0,592 C70,582 145,572 225,564 C305,556 380,552 460,552 C540,552 612,556 685,562 C758,568 820,576 885,578 C950,580 1010,576 1075,566 C1140,556 1200,542 1268,534 C1336,526 1390,526 1440,528 L1440,680 L0,680 Z" fill="url(#rg2)" />

        {/* Layer 1 */}
        <path d="M0,638 C100,630 210,625 330,622 C460,619 580,620 700,618 C820,616 940,616 1060,614 C1180,612 1310,612 1440,616 L1440,680 L0,680 Z" fill="url(#rg1)" />
      </svg>

      {/* Atmosphere overlay */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(180deg, rgba(2,7,30,0.15) 0%, rgba(2,7,30,0.30) 30%, rgba(2,7,30,0.72) 70%, rgba(2,7,30,0.92) 100%)",
        zIndex: 2,
      }} />

      {/* Nav */}
      <nav style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        padding: "20px 32px",
        display: "flex",
        alignItems: "center",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2L18 17H2L10 2Z" fill="white" opacity="0.9" />
            <path d="M10 6L15.5 16H4.5L10 6Z" fill="white" opacity="0.4" />
          </svg>
          <span style={{
            fontFamily: "var(--font-dm-sans, system-ui)",
            fontSize: 18,
            fontWeight: 800,
            color: "white",
            letterSpacing: "-0.03em",
          }}>PlanUltra</span>
        </Link>
      </nav>

      {/* Centered card */}
      <div style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}>
        <div style={{
          background: "rgba(2, 7, 30, 0.75)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(130,199,246,0.2)",
          borderRadius: 16,
          padding: "40px 36px",
          width: "100%",
          maxWidth: 400,
          textAlign: "center",
        }}>
          {/* Logo icon */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
            <svg width="40" height="40" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L18 17H2L10 2Z" fill="white" opacity="0.9" />
              <path d="M10 6L15.5 16H4.5L10 6Z" fill="white" opacity="0.4" />
            </svg>
          </div>

          <h1 style={{
            fontFamily: "var(--font-dm-sans, system-ui)",
            fontSize: 26,
            fontWeight: 800,
            color: "white",
            letterSpacing: "-0.02em",
            marginBottom: 8,
          }}>
            Sign in to PlanUltra
          </h1>
          <p style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.55)",
            marginBottom: 28,
          }}>
            Start your first 100-mile plan and I&apos;ll help if you get stuck.
          </p>

          <form
            action={async () => {
              'use server'
              await signIn('google', { redirectTo: '/dashboard' })
            }}
          >
            <button
              type="submit"
              className="signin-google-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
          </form>

          <p style={{ marginTop: 20, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
            Free · No credit card required · Founder help available
          </p>
          <div style={{ marginTop: 16 }}>
            <GuestEntryLink />
          </div>
        </div>
      </div>

      <style>{`
        .signin-google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: white;
          color: #1f2937;
          border: none;
          border-radius: 10px;
          padding: 12px 20px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .signin-google-btn:hover {
          background: #f3f4f6;
        }
      `}</style>
    </div>
  )
}
