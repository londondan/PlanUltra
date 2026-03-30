import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NavScrollWatcher } from "./NavScrollWatcher";
import { MapIllustration, SectionCardsIllustration, DropBagCardsIllustration, CrewSheetMockup } from "./LandingFeatures";
import { GuestEntryLink } from "@/components/GuestEntryLink";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div style={{ fontFamily: "var(--font-geist-sans, system-ui)", color: "var(--midnight)", background: "white", overflowX: "hidden" }}>

      {/* ── Nav ── */}
      <nav
        id="marketing-nav"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: "20px 48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          transition: "background 0.25s, border-color 0.25s",
        }}
        className="landing-nav"
      >
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
        <Link
          href="/auth/signin"
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1.5px solid rgba(255,255,255,0.4)",
            color: "white",
            padding: "8px 20px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            backdropFilter: "blur(8px)",
            textDecoration: "none",
            transition: "all 0.2s",
          }}
        >
          Sign in
        </Link>
      </nav>

      {/* ── Hero ── */}
      <section style={{ position: "relative", minHeight: 680, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "var(--midnight)" }}>

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

        {/* Hero content */}
        <div style={{ position: "relative", zIndex: 10, textAlign: "center", padding: "80px 24px 60px", maxWidth: 760 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--sky)", marginBottom: 16, opacity: 0.9 }}>
            First-time 100-mile race planning
          </div>
          <h1 style={{
            fontFamily: "var(--font-dm-sans, system-ui)",
            fontSize: "clamp(38px, 6vw, 64px)",
            fontWeight: 800,
            color: "white",
            letterSpacing: "-0.03em",
            lineHeight: 1.08,
            marginBottom: 24,
          }}>
            Build the race-day plan<br />your <em style={{ fontStyle: "normal", color: "var(--sky)" }}>crew</em> can actually use
          </h1>
          <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "rgba(255,255,255,0.75)", maxWidth: 580, margin: "0 auto 36px", lineHeight: 1.65 }}>
            {"Training gets you to the start line. PlanUltra helps first-time 100-mile runners turn aid stations, pacing, weather, and crew logistics into one usable race-day plan. Free to use, with founder help available if you want it."}
          </p>
          <Link
            href="/auth/signin"
            style={{
              display: "inline-block",
              background: "var(--ridge-blue)",
              color: "white",
              padding: "14px 36px",
              borderRadius: 10,
              fontSize: 16,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 4px 20px rgba(29,124,190,0.45)",
              letterSpacing: "-0.01em",
            }}
          >
            Start Your Plan
          </Link>
          <div style={{ marginTop: 14, fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
            Free · No credit card required · Founder help available
          </div>
          <div style={{ marginTop: 16 }}>
            <GuestEntryLink />
          </div>
        </div>

        {/* Scroll hint */}
        <div style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: 0.4 }}>
          <span style={{ fontSize: 10, color: "white", letterSpacing: "0.1em", textTransform: "uppercase" }}>Scroll</span>
          <div style={{ width: 20, height: 20, borderRight: "2px solid white", borderBottom: "2px solid white", transform: "rotate(45deg)", marginTop: -6 }} />
        </div>

        {/* Sentinel for scroll watcher */}
        <NavScrollWatcher navId="marketing-nav" />
      </section>

      {/* ── Feature rows ── */}
      <section style={{ background: "white" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 48px 0" }}>
          <div style={{ textAlign: "center", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ridge-blue)", marginBottom: 12 }}>
            Everything you need
          </div>
          <h2 style={{
            fontFamily: "var(--font-dm-sans, system-ui)",
            fontSize: "clamp(26px, 4vw, 36px)",
            fontWeight: 800,
            color: "var(--midnight)",
            textAlign: "center",
            letterSpacing: "-0.02em",
            marginBottom: 56,
          }}>
            From race-week chaos to a usable plan
          </h2>
        </div>

        {/* Row 1: GPX Upload — text left, map right */}
        <div className="feature-row">
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, background: "var(--deep-ridge)", color: "white", borderRadius: "50%", fontFamily: "var(--font-dm-sans, system-ui)", fontSize: 14, fontWeight: 800, marginBottom: 16 }}>1</div>
            <h3 style={{ fontFamily: "var(--font-dm-sans, system-ui)", fontSize: "clamp(22px, 2.8vw, 30px)", fontWeight: 800, color: "var(--midnight)", letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 14 }}>
              Start with your race file,<br />then stop juggling tabs
            </h3>
            <p style={{ fontSize: 15, color: "var(--deep-ridge)", opacity: 0.85, lineHeight: 1.7, marginBottom: 20 }}>
              Upload a GPX or choose a library race and PlanUltra lays out the course, aid stations, and section structure in one place. No more bouncing between race PDFs, spreadsheets, and screenshots.
            </p>
            <div style={{ fontSize: 13, color: "var(--ridge-blue)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              → Supports any standard GPX file
            </div>
          </div>
          <MapIllustration />
        </div>

        {/* Row 2: Plan — illustration left, text right (reversed) */}
        <div className="feature-row feature-row-reverse">
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, background: "var(--deep-ridge)", color: "white", borderRadius: "50%", fontFamily: "var(--font-dm-sans, system-ui)", fontSize: 14, fontWeight: 800, marginBottom: 16 }}>2</div>
            <h3 style={{ fontFamily: "var(--font-dm-sans, system-ui)", fontSize: "clamp(22px, 2.8vw, 30px)", fontWeight: 800, color: "var(--midnight)", letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 14 }}>
              Know what happens<br />between aid stations
            </h3>
            <p style={{ fontSize: 15, color: "var(--deep-ridge)", opacity: 0.85, lineHeight: 1.7, marginBottom: 20 }}>
              Work through each leg with pace anchors, weather, sunset and sunrise context, and section-level details. It is built to answer the race-week questions that hit hardest before a first hundred.
            </p>
            <div style={{ fontSize: 13, color: "var(--ridge-blue)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              → Powered by weather forecasts + suncalc
            </div>
          </div>
          <SectionCardsIllustration />
        </div>

        {/* Row 3: Pack — text left, bag right */}
        <div className="feature-row">
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, background: "var(--deep-ridge)", color: "white", borderRadius: "50%", fontFamily: "var(--font-dm-sans, system-ui)", fontSize: 14, fontWeight: 800, marginBottom: 16 }}>3</div>
            <h3 style={{ fontFamily: "var(--font-dm-sans, system-ui)", fontSize: "clamp(22px, 2.8vw, 30px)", fontWeight: 800, color: "var(--midnight)", letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 14 }}>
              Pack with intent,<br />not guesswork
            </h3>
            <p style={{ fontSize: 15, color: "var(--deep-ridge)", opacity: 0.85, lineHeight: 1.7, marginBottom: 20 }}>
              Use the planning view to think through drop bags, key gear changes, and what each leg demands. The goal is to arrive at race week with fewer open loops and fewer 2 AM decisions.
            </p>
            <div style={{ fontSize: 13, color: "var(--ridge-blue)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              → Share your crew plan with a single link
            </div>
          </div>
          <DropBagCardsIllustration />
        </div>

        {/* Row 4: Crew sheet — illustration left, text right */}
        <div className="feature-row feature-row-reverse" style={{ paddingBottom: 80 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", fontFamily: "var(--font-geist-mono, monospace)", fontSize: 11, fontWeight: 700, color: "var(--ridge-blue)", background: "var(--mist)", border: "1px solid rgba(29,124,190,0.2)", padding: "3px 10px", borderRadius: 6, marginBottom: 16 }}>04</div>
            <h3 style={{ fontFamily: "var(--font-dm-sans, system-ui)", fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 800, color: "var(--midnight)", letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 14 }}>
              Share with your crew
            </h3>
            <p style={{ fontSize: 15, color: "var(--deep-ridge)", opacity: 0.85, lineHeight: 1.7, marginBottom: 12 }}>
              Publish a shareable crew sheet with a single click. Your crew gets a clean, printable page showing when to expect you, what to pull from your drop bag, and the notes they will actually need on race day.
            </p>
            <p style={{ fontSize: 15, color: "var(--deep-ridge)", opacity: 0.85, lineHeight: 1.7, marginBottom: 20 }}>
              Works on any phone, prints cleanly, and needs no account to view.
            </p>
            <a
              href="https://planultrarace.com/crew/mn7jrA-wOyPOB-qk"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 14, color: "var(--ridge-blue)", textDecoration: "none" }}
              className="crew-link"
            >
              See Daniel&apos;s Hellbender plan ↗
            </a>
          </div>
          <CrewSheetMockup />
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div style={{ background: "var(--midnight)", padding: "36px 48px" }}>
        <div className="stats-inner">
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-dm-sans, system-ui)", fontSize: 36, fontWeight: 800, color: "var(--sky)", letterSpacing: "-0.03em", lineHeight: 1 }}>100s</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 5, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 500 }}>of miles planned</div>
          </div>
          <div className="stat-div" />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-dm-sans, system-ui)", fontSize: 36, fontWeight: 800, color: "var(--sky)", letterSpacing: "-0.03em", lineHeight: 1 }}>Free</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 5, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 500 }}>For early users</div>
          </div>
          <div className="stat-div" />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-dm-sans, system-ui)", fontSize: 36, fontWeight: 800, color: "var(--sky)", letterSpacing: "-0.03em", lineHeight: 1 }}>Pace</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 5, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 500 }}>Weather and timing</div>
          </div>
          <div className="stat-div" />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-dm-sans, system-ui)", fontSize: 36, fontWeight: 800, color: "var(--sky)", letterSpacing: "-0.03em", lineHeight: 1 }}>Crew</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 5, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 500 }}>Shareable race sheet</div>
          </div>
        </div>
      </div>

      {/* ── About ── */}
      <section style={{ background: "var(--midnight)", borderTop: "1px solid rgba(130,199,246,0.12)", padding: "72px 48px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div className="about-grid">
            {/* Left: identity */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, background: "var(--deep-ridge)", borderRadius: "50%", fontFamily: "var(--font-geist-sans, system-ui)", fontSize: 14, fontWeight: 600, color: "var(--sky)", marginBottom: 12 }}>DJ</div>
              <div style={{ fontFamily: "var(--font-dm-sans, system-ui)", fontSize: 22, fontWeight: 700, color: "white", lineHeight: 1.2 }}>Dan James</div>
              <div style={{ fontFamily: "var(--font-geist-sans, system-ui)", fontSize: 13, color: "rgba(130,199,246,0.7)", marginTop: 4 }}>Product Manager · Ultra runner</div>
              <div style={{ width: 40, height: 2, background: "var(--ridge-blue)", borderRadius: 2, margin: "12px 0" }} />
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <a href="https://www.linkedin.com/in/daniel-james-45863320/" target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--font-geist-sans, system-ui)", fontSize: 12, color: "rgba(255,255,255,0.5)", textDecoration: "none" }} className="about-link">↗ LinkedIn</a>
                <a href="https://github.com/londondan/PlanUltra" target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--font-geist-sans, system-ui)", fontSize: 12, color: "rgba(255,255,255,0.5)", textDecoration: "none" }} className="about-link">↗ GitHub</a>
                <a href="mailto:danrjames@gmail.com" style={{ fontFamily: "var(--font-geist-sans, system-ui)", fontSize: 12, color: "rgba(255,255,255,0.5)", textDecoration: "none" }} className="about-link">✉ danrjames@gmail.com</a>
              </div>
            </div>

            {/* Right: copy */}
            <div>
              <div style={{ fontFamily: "var(--font-geist-sans, system-ui)", fontSize: 11, color: "rgba(130,199,246,0.6)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>Why this exists</div>
              <p style={{ fontFamily: "var(--font-geist-sans, system-ui)", fontSize: 15, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, marginBottom: 16 }}>
                I&apos;m a product manager who runs ultras in my spare time. I built PlanUltra after DNF&apos;ing Grindstone and realizing I didn&apos;t have a race-day logistics plan my future self or crew could actually use.
              </p>
              <p style={{ fontFamily: "var(--font-geist-sans, system-ui)", fontSize: 15, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, marginBottom: 16 }}>
                I built it because first-time 100-mile planning still feels too manual: race PDFs, GPX files, weather tabs, spreadsheets, and half-finished notes. PlanUltra pulls those pieces into one place and gives you something you can actually act on.
              </p>
              <p style={{ fontFamily: "var(--font-geist-sans, system-ui)", fontSize: 15, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, fontStyle: "italic" }}>
                If you&apos;re preparing for your first hundred and want help setting up your plan, send me a note. If you&apos;re curious about my product background, you can also find me on{" "}
                <a href="https://www.linkedin.com/in/daniel-james-45863320/" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(130,199,246,0.8)", textDecoration: "none" }} className="about-link">LinkedIn</a>
                {" "}or drop me an{" "}
                <a href="mailto:danrjames@gmail.com" style={{ color: "rgba(130,199,246,0.8)", textDecoration: "none" }} className="about-link">email</a>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section style={{ position: "relative", background: "var(--midnight)", borderTop: "1px solid rgba(130,199,246,0.1)", padding: "80px 48px", textAlign: "center", overflow: "hidden" }}>
        <svg
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 120, opacity: 0.06, width: "100%" }}
          viewBox="0 0 1440 120"
          preserveAspectRatio="xMidYMax slice"
        >
          <path d="M0,80 C120,55 240,45 360,50 C480,55 560,70 680,60 C800,50 880,35 1000,40 C1120,45 1240,60 1360,65 L1440,68 L1440,120 L0,120 Z" fill="white" />
          <path d="M0,100 C100,85 200,78 320,80 C460,83 560,95 700,88 C840,81 940,70 1080,75 C1200,80 1320,90 1440,93 L1440,120 L0,120 Z" fill="white" opacity="0.4" />
        </svg>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--sky)", opacity: 0.7, marginBottom: 14 }}>Ready to plan?</div>
          <h2 style={{ fontFamily: "var(--font-dm-sans, system-ui)", fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 800, color: "white", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 20 }}>
            Build the plan before<br />the panic starts
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", marginBottom: 36, maxWidth: 440, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
            If your first 100 is on the calendar, PlanUltra helps you turn your course, pace, weather, and crew logistics into one clear plan.
          </p>
          <Link
            href="/auth/signin"
            style={{
              display: "inline-block",
              background: "var(--ridge-blue)",
              color: "white",
              padding: "14px 40px",
              borderRadius: 10,
              fontSize: 16,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 4px 20px rgba(29,124,190,0.4)",
            }}
          >
            Start Your Plan
          </Link>
          <div style={{ marginTop: 20 }}>
            <Link href="/faq" style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>
              Have questions? See the FAQ →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: "var(--midnight)", borderTop: "1px solid rgba(130,199,246,0.12)", padding: "24px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontFamily: "var(--font-dm-sans, system-ui)", fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "-0.02em" }}>PlanUltra ▲</div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link href="/faq" style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>FAQ</Link>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>Free · Built by a runner · Founder help available</span>
        </div>
      </footer>

      {/* ── Landing page styles ── */}
      <style>{`
        .landing-nav[data-scrolled] {
          background: var(--midnight);
          border-bottom: 1px solid rgba(130,199,246,0.15);
        }
        .feature-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          max-width: 1200px;
          margin: 0 auto;
          padding: 80px 48px 0;
          align-items: center;
          border-top: 1px solid rgba(130,199,246,0.25);
        }
        .feature-row:first-of-type {
          border-top: none;
        }
        .feature-row-reverse {
          direction: rtl;
        }
        .feature-row-reverse > * {
          direction: ltr;
        }
        .stats-inner {
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          justify-content: space-around;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
        }
        .stat-div {
          width: 1px;
          height: 40px;
          background: rgba(130,199,246,0.2);
        }
        @media (max-width: 640px) {
          .feature-row {
            grid-template-columns: 1fr;
            gap: 32px;
            padding: 48px 24px 0;
          }
          .feature-row-reverse {
            direction: ltr;
          }
        }
        @media (max-width: 560px) {
          .stats-inner {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
          }
          .stat-div {
            display: none;
          }
        }
        .about-grid {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 64px;
          align-items: start;
        }
        .about-link:hover {
          color: white !important;
          text-decoration: underline !important;
        }
        .crew-link:hover {
          text-decoration: underline;
        }
        @media (max-width: 768px) {
          .about-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }
        }
        @media (max-width: 480px) {
          nav { padding: 16px 20px; }
        }
      `}</style>
    </div>
  );
}
