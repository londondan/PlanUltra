import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NavScrollWatcher } from "./NavScrollWatcher";
import { CrewSheetDemo } from "./CrewSheetDemo";

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
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a
            href="https://planultrarace.com/crew/mn7jrA-wOyPOB-qk"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", textDecoration: "none" }}
            className="nav-example-link"
          >
            See an example ↗
          </a>
          <Link
            href="/auth/signin"
            style={{
              background: "var(--ridge-blue)",
              color: "white",
              padding: "8px 18px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Build a crew plan
          </Link>
        </div>
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
          <div style={{
            fontFamily: "var(--font-geist-sans, system-ui)",
            fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
            color: "var(--sky)", marginBottom: 20, opacity: 0.7,
          }}>
            Race day crew planning
          </div>
          <h1 style={{
            fontFamily: "var(--font-dm-sans, system-ui)",
            fontSize: "clamp(32px, 5vw, 54px)",
            fontWeight: 800,
            color: "white",
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            marginBottom: 24,
          }}>
            Give your crew <em style={{ fontStyle: "normal", color: "var(--sky)" }}>one link.</em><br />
            Everything they need is in it.
          </h1>
          <p style={{
            fontFamily: "var(--font-geist-sans, system-ui)",
            fontSize: 18, color: "rgba(255,255,255,0.65)", maxWidth: 560, margin: "0 auto 36px", lineHeight: 1.65,
          }}>
            PlanUltra builds a shareable crew sheet your team can open on their phone, print as backup, and navigate from at every aid station — no app, no account, works without cell signal.
          </p>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <Link
              href="/auth/signin"
              style={{
                display: "inline-block",
                background: "var(--ridge-blue)",
                color: "white",
                padding: "14px 28px",
                borderRadius: 10,
                fontSize: 16,
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 4px 20px rgba(29,124,190,0.45)",
                letterSpacing: "-0.01em",
              }}
            >
              Build your crew plan — it&apos;s free
            </Link>
            <a
              href="https://planultrarace.com/crew/mn7jrA-wOyPOB-qk"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 15, color: "var(--sky)", textDecoration: "none" }}
            >
              See a real crew sheet ↗
            </a>
          </div>
          {/* Trust pills */}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 24 }}>
            {["Free forever", "No subscription", "No ads", "Open source"].map(pill => (
              <span key={pill} style={{
                fontFamily: "var(--font-geist-mono, monospace)",
                fontSize: 11, color: "rgba(255,255,255,0.35)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20,
                padding: "3px 12px", background: "transparent",
              }}>{pill}</span>
            ))}
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

      {/* ── Crew Sheet Demo ── */}
      <section style={{ background: "white", padding: "80px 32px" }}>
        <div className="crew-demo-grid" style={{ maxWidth: 1040, margin: "0 auto" }}>
          {/* Text column */}
          <div>
            <div style={{
              fontFamily: "var(--font-geist-mono, system-ui)",
              fontSize: 11, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.12em", color: "var(--ridge-blue)", marginBottom: 6,
            }}>
              The crew sheet
            </div>
            <div style={{
              fontFamily: "var(--font-geist-mono, system-ui)",
              fontSize: 11, color: "rgba(17,69,116,0.45)", marginBottom: 20,
            }}>
              ↓ Real example: 2025 Grindstone 100
            </div>
            <h2 style={{
              fontFamily: "var(--font-dm-sans, system-ui)",
              fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 800,
              color: "var(--midnight)", letterSpacing: "-0.02em", lineHeight: 1.2,
              marginBottom: 16,
            }}>
              This is what your crew gets.
            </h2>
            <p style={{ fontSize: 15, color: "rgba(2,7,30,0.65)", lineHeight: 1.7, marginBottom: 24 }}>
              One URL. Open it on any phone. Print it as backup. Navigate directly from it — even without signal.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column" }}>
              {[
                "Aid station locations with Google Maps QR codes",
                "Drive time between each crew stop",
                "Parking notes and access directions",
                "Exactly what to have ready at each station",
                "Weather, sunrise, and sunset for race day",
                "Intermediate checkpoints so they know where you are",
                "Prints cleanly to A4",
              ].map((item, i) => (
                <li key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  fontSize: 14, color: "rgba(2,7,30,0.65)", lineHeight: 1.5,
                  padding: "9px 0",
                  borderTop: i === 0 ? "none" : "1px solid rgba(130,199,246,0.2)",
                }}>
                  <span style={{ color: "var(--ridge-blue)", fontWeight: 700, flexShrink: 0 }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Demo column */}
          <CrewSheetDemo />
        </div>
      </section>

      {/* ── Feature Cards ── */}
      <section style={{ background: "#f8fbfe", padding: "80px 32px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <h2 style={{
            fontFamily: "var(--font-dm-sans, system-ui)",
            fontSize: "clamp(24px, 3.5vw, 34px)", fontWeight: 800,
            color: "var(--midnight)", letterSpacing: "-0.02em",
            textAlign: "center", marginBottom: 8,
          }}>
            What&apos;s in the crew sheet
          </h2>
          <p style={{ fontSize: 16, color: "rgba(2,7,30,0.5)", textAlign: "center", marginBottom: 40 }}>
            Built by the runner. Everything the crew needs.
          </p>
          <div className="feature-cards-grid">
            {[
              {
                num: "01",
                title: "Navigate to every aid station — even without signal",
                body: "Each crew-accessible station includes a Google Maps link and a QR code for offline directions. Remote trailheads, forest roads, unmarked pull-offs — your crew can find them at 3am.",
                detail: "QR code opens Google Maps even without cell service",
              },
              {
                num: "02",
                title: "Drive time between every crew stop",
                body: "The sheet tells your crew exactly how long it takes to drive to the next station, so they know whether to leave immediately or whether they have time to rest. No more guessing.",
                detail: "Includes intermediate checkpoints so they can track your progress",
              },
              {
                num: "03",
                title: "Exactly what to have ready — no questions",
                body: "Drop bag items, gear, food, and what to do if you're talking yourself out of the race at mile 70. It's all in the plan. They read it before the race and execute it on the day.",
                detail: 'Includes an "if I say I want to quit" note',
              },
              {
                num: "04",
                title: "Weather, sunrise, and sunset — already there",
                body: "Your crew knows when to expect you to need a headlamp, what temperature to dress for, and when the sun comes up. PlanUltra pulls conditions for your race date so your crew can prepare, not react.",
                detail: null,
              },
            ].map(card => (
              <div key={card.num} style={{
                background: "white",
                border: "1px solid rgba(130,199,246,0.3)",
                borderRadius: 14,
                padding: 28,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}>
                <div style={{
                  fontFamily: "var(--font-geist-mono, monospace)",
                  fontSize: 11, fontWeight: 700, color: "var(--ridge-blue)",
                }}>{card.num}</div>
                <h3 style={{
                  fontFamily: "var(--font-dm-sans, system-ui)",
                  fontSize: 17, fontWeight: 800, color: "var(--midnight)",
                  letterSpacing: "-0.01em", lineHeight: 1.3,
                }}>{card.title}</h3>
                <p style={{ fontSize: 14, color: "rgba(2,7,30,0.65)", lineHeight: 1.6, flex: 1 }}>{card.body}</p>
                {card.detail && (
                  <div style={{
                    fontSize: 13, color: "var(--ridge-blue)",
                    borderTop: "1px solid rgba(130,199,246,0.2)", paddingTop: 10,
                  }}>{card.detail}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section style={{ background: "white", padding: "80px 48px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h2 style={{
            fontFamily: "var(--font-dm-sans, system-ui)",
            fontSize: "clamp(24px, 3.5vw, 34px)", fontWeight: 800,
            color: "var(--midnight)", letterSpacing: "-0.02em",
            textAlign: "center", marginBottom: 8,
          }}>
            How it works
          </h2>
          <p style={{ fontSize: 16, color: "rgba(2,7,30,0.5)", textAlign: "center", marginBottom: 48 }}>
            Built by the runner. Used by the crew.
          </p>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {[
              {
                step: "01",
                title: "Runner sets up the race",
                body: "Enter your race, aid stations, and cutoff times. PlanUltra maps out the course and pulls weather and light conditions for race day.",
                note: "Takes about 20 minutes",
              },
              {
                step: "02",
                title: "Add crew locations and notes",
                body: "Drop a pin for each crew-accessible station. Add parking notes, what you'll need at each stop, and anything else your crew should know — including what to do if you want to bail at mile 70.",
                note: null,
              },
              {
                step: "03",
                title: "Share one link with your crew",
                body: "Your crew gets a single URL. It works on any phone, prints cleanly, and has everything — directions, drive times, gear lists, conditions — no app, no account needed.",
                note: "As a bonus, you've also built yourself a solid race plan",
              },
            ].map((s, i) => (
              <div key={s.step} style={{
                display: "flex", gap: 24, padding: "28px 0",
                borderTop: i === 0 ? "none" : "1px solid rgba(130,199,246,0.2)",
              }}>
                <div style={{
                  fontFamily: "var(--font-geist-mono, monospace)",
                  fontSize: 13, fontWeight: 700, color: "var(--sky)",
                  flexShrink: 0, paddingTop: 2, minWidth: 28,
                }}>{s.step}</div>
                <div>
                  <div style={{
                    fontFamily: "var(--font-dm-sans, system-ui)",
                    fontSize: 17, fontWeight: 700, color: "var(--midnight)",
                    marginBottom: 8,
                  }}>{s.title}</div>
                  <p style={{ fontSize: 14, color: "rgba(2,7,30,0.65)", lineHeight: 1.65, marginBottom: s.note ? 8 : 0 }}>
                    {s.body}
                  </p>
                  {s.note && (
                    <p style={{ fontSize: 13, fontStyle: "italic", color: "var(--ridge-blue)" }}>
                      &ldquo;{s.note}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <Link
              href="/auth/signin"
              style={{
                display: "inline-block",
                background: "var(--ridge-blue)",
                color: "white",
                padding: "14px 28px",
                borderRadius: 10,
                fontSize: 16,
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 4px 20px rgba(29,124,190,0.3)",
              }}
            >
              Build your crew plan — it&apos;s free
            </Link>
          </div>
        </div>
      </section>

      {/* ── Builder Identity ── */}
      <section style={{ background: "var(--midnight)", borderTop: "1px solid rgba(130,199,246,0.1)", padding: "72px 48px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div className="about-grid">
            {/* Left: identity */}
            <div>
              <div style={{ fontFamily: "var(--font-dm-sans, system-ui)", fontSize: 22, fontWeight: 700, color: "white", lineHeight: 1.2 }}>Dan James</div>
              <div style={{ fontFamily: "var(--font-geist-mono, monospace)", fontSize: 13, color: "rgba(130,199,246,0.65)", marginTop: 4 }}>Product Manager · Ultra runner</div>
              <div style={{ width: 40, height: 2, background: "var(--ridge-blue)", borderRadius: 2, margin: "12px 0" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <a href="https://www.linkedin.com/in/daniel-james-45863320/" target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--font-geist-sans, system-ui)", fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none" }} className="about-link">↗ LinkedIn</a>
                <a href="https://github.com/londondan/PlanUltra" target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--font-geist-sans, system-ui)", fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none" }} className="about-link">↗ GitHub (open source)</a>
                <a href="mailto:danrjames@gmail.com" style={{ fontFamily: "var(--font-geist-sans, system-ui)", fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none" }} className="about-link">✉ danrjames@gmail.com</a>
              </div>
            </div>

            {/* Right: copy */}
            <div>
              <div style={{
                fontFamily: "var(--font-geist-mono, monospace)",
                fontSize: 11, color: "rgba(130,199,246,0.55)",
                textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16,
              }}>
                Why this exists · Why it&apos;s free
              </div>
              {/* Fact pills */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                {["Free forever", "No subscription", "No ads", "Open source"].map(pill => (
                  <span key={pill} style={{
                    fontFamily: "var(--font-geist-mono, monospace)",
                    fontSize: 11, color: "rgba(130,199,246,0.75)",
                    background: "rgba(130,199,246,0.07)", border: "1px solid rgba(130,199,246,0.15)",
                    borderRadius: 20, padding: "4px 14px",
                  }}>{pill}</span>
                ))}
              </div>
              <p style={{ fontFamily: "var(--font-geist-sans, system-ui)", fontSize: 15, color: "rgba(255,255,255,0.72)", lineHeight: 1.75, marginBottom: 16 }}>
                I&apos;m a product manager who runs ultras on weekends. PlanUltra exists because I wanted a tool like this and couldn&apos;t find one — so I built it. It&apos;s a hobby project, not a startup. There&apos;s no VC money, no growth target, no free trial leading to a paywall.
              </p>
              <p style={{ fontFamily: "var(--font-geist-sans, system-ui)", fontSize: 15, color: "rgba(255,255,255,0.72)", lineHeight: 1.75, marginBottom: 16 }}>
                Running the server costs me almost nothing — AWS and Mapbox both have generous free tiers that easily cover a tool at this scale. An account is required so your plan has somewhere to live between sessions; that&apos;s the only reason it exists. The code is open source on{" "}
                <a href="https://github.com/londondan/PlanUltra" target="_blank" rel="noopener noreferrer" style={{ color: "var(--sky)", textDecoration: "none" }} className="about-link">GitHub</a>
                {" "}— if you want to fork it, run your own copy, or just look under the hood, go ahead.
              </p>
              <div style={{ borderTop: "1px solid rgba(130,199,246,0.1)", paddingTop: 16 }}>
                <p style={{ fontFamily: "var(--font-geist-sans, system-ui)", fontSize: 14, fontStyle: "italic", color: "rgba(255,255,255,0.4)", lineHeight: 1.65 }}>
                  &ldquo;It&apos;s also a live example of my product work. If you&apos;re curious about that side of things, find me on{" "}
                  <a href="https://www.linkedin.com/in/daniel-james-45863320/" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(130,199,246,0.65)", textDecoration: "none" }} className="about-link">LinkedIn</a>.&rdquo;
                </p>
              </div>
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
          <h2 style={{
            fontFamily: "var(--font-dm-sans, system-ui)",
            fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 800,
            color: "white", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 20,
          }}>
            Your crew is giving up their weekend for you.
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", marginBottom: 36, maxWidth: 440, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
            Give them everything they need so they can focus on being there for you.
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
              letterSpacing: "-0.01em",
            }}
          >
            Build your crew plan
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
          <span style={{
            fontFamily: "var(--font-geist-mono, monospace)",
            fontSize: 12, color: "rgba(255,255,255,0.35)",
          }}>Free forever · Built by a runner · No subscription</span>
        </div>
      </footer>

      {/* ── Landing page styles ── */}
      <style>{`
        .landing-nav[data-scrolled] {
          background: var(--midnight);
          border-bottom: 1px solid rgba(130,199,246,0.15);
        }
        .crew-demo-grid {
          display: grid;
          grid-template-columns: 1fr 1.8fr;
          gap: 64px;
          align-items: start;
        }
        @media (max-width: 640px) {
          .crew-demo-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }
        }
        .feature-cards-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        @media (max-width: 640px) {
          .feature-cards-grid {
            grid-template-columns: 1fr;
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
        @media (max-width: 640px) {
          .about-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }
        }
        @media (max-width: 480px) {
          nav { padding: 16px 20px; }
          .nav-example-link { display: none; }
        }
      `}</style>
    </div>
  );
}
