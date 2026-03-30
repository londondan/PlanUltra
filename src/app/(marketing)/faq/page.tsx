import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "First-Time 100-Mile Planning FAQ — PlanUltra",
  description:
    "Common questions about PlanUltra, the free race-planning tool for first-time 100-mile ultrarunners. Learn how to plan pacing, drop bags, crew logistics, and weather.",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is PlanUltra?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "PlanUltra is a free web tool that helps ultramarathon runners plan their race logistics. You upload a GPX file (or pick from a library of known races), and PlanUltra builds you a structured plan showing aid stations, distances, estimated arrival times, and hour-by-hour weather conditions across the full race window — including overnight. No subscription, no account required to explore.",
      },
    },
    {
      "@type": "Question",
      name: "Who is PlanUltra for?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "PlanUltra is built first for runners preparing for their first 100-mile ultramarathon, especially in the US, where race-day logistics can feel overwhelming. It is also useful for other ultra distances, but the strongest fit today is the runner who wants help turning aid stations, pacing, weather, and crew logistics into one usable plan. Crew members and pacers can also use the output to understand when and where to show up on race day.",
      },
    },
    {
      "@type": "Question",
      name: "Is PlanUltra free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. PlanUltra is completely free. There's no paid tier, no premium features, and no subscription. It's a side project built by a product manager who runs ultras — not a startup. The crew sheet you generate can be shared with your crew via a public link that requires no account to view.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need an account?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You need a Google account to save a race and generate a plan, but you can explore the tool without signing in. Shared crew sheets are publicly viewable — your crew doesn't need an account to see their copy.",
      },
    },
    {
      "@type": "Question",
      name: "Who built PlanUltra?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "PlanUltra was built by Dan James, a product manager and ultramarathon runner based in Charlotte, NC. Dan DNF'd at Grindstone 100 and built PlanUltra because no existing tool covered the full logistics workflow he needed: aid station layout, pacing anchors, weather across a multi-day event, and a crew sheet his crew could actually use. It's a founder-led side project with personal onboarding help available for early users.",
      },
    },
    {
      "@type": "Question",
      name: "How do I add my race to PlanUltra?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Two options: select from PlanUltra's curated library of known ultras (which includes pre-verified aid station data), or upload a GPX file from your race's website. After loading the course, you confirm which aid stations have drop bag access and which are crew-accessible — that's the only required manual step.",
      },
    },
    {
      "@type": "Question",
      name: "What is a GPX file and where do I get one?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A GPX (GPS Exchange Format) file is a standard file format that stores route and waypoint data. Most race organisers publish a GPX file on their race website — look for a 'GPX download' or 'course file' link on the race's course description page. Sites like Strava and Garmin Connect also export GPX files from any activity. If you can't find a GPX, try emailing the race director — they almost always have one.",
      },
    },
    {
      "@type": "Question",
      name: "How does PlanUltra read aid stations from a GPX file?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Aid stations are stored as named waypoints inside the GPX file. PlanUltra extracts these automatically and presents them as a list for you to confirm. Not all race GPX files include waypoints — if yours doesn't, you'll see a fallback option to enter aid stations manually.",
      },
    },
    {
      "@type": "Question",
      name: "What if my race isn't in the library?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Upload a GPX file instead. The library is a convenience layer — the GPX upload path works for any race. If you want a race added to the library, contact us at danrjames@gmail.com.",
      },
    },
    {
      "@type": "Question",
      name: "How does pace estimation work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You enter a target finish time and PlanUltra distributes that time across each segment, weighted by distance and elevation. Segments with more climbing or descending are allocated more time than flat segments of the same distance — so a short, steep climb gets more time than a long flat stretch. You can also override the estimated arrival at any aid station to act as a fixed anchor, and PlanUltra redistributes the remaining time around it.",
      },
    },
    {
      "@type": "Question",
      name: "How accurate are the arrival time estimates?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Treat them as planning anchors, not predictions. The estimates account for elevation (more time for climbs and descents) but not fatigue, technical terrain, or aid station stops. They're accurate enough to anchor your weather window, your crew's schedule, and your drop bag planning — which is the intended use. For higher accuracy, use the manual override feature to lock in your target time at a key mid-race station.",
      },
    },
    {
      "@type": "Question",
      name: "How does the weather forecast work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "PlanUltra pulls hour-by-hour weather data from Open-Meteo, a free, open-source weather API. The forecast is anchored to your race start time and location, covering the full expected race window — which for most ultras spans at least one night. You'll see temperature, precipitation probability, wind, and conditions for each hour, cross-referenced with where you're estimated to be on course at that time.",
      },
    },
    {
      "@type": "Question",
      name: "How far out does the weather forecast work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Open-Meteo's forecast is reliable to about 7 days and available up to 16 days. For races more than 16 days out, PlanUltra will show the forecast data with a note about reduced reliability at longer horizons. For races more than 16 days out, treat the forecast as directional rather than precise.",
      },
    },
    {
      "@type": "Question",
      name: "What is a crew sheet?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A crew sheet is a shareable, printable summary of your race plan designed for your crew members and pacers. It shows each aid station in order, your estimated arrival times, which stations are crew-accessible, what you've packed in your drop bags, and any notes you've left for your crew. You generate it with one click and share it via a public link — your crew needs no account to view it.",
      },
    },
    {
      "@type": "Question",
      name: "How do I plan a 100-mile race?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "100-mile race planning typically involves five areas: course intelligence (aid station locations, distances, elevation profile), pace planning (estimated arrival times at each station), gear and nutrition (what to carry per leg, what goes in drop bags), crew coordination (who meets you where, and when), and weather preparation (what conditions to expect at key points on the course). PlanUltra covers the first four areas and surfaces weather across the full race window. The crew sheet feature lets you share the full plan with your crew in a format they can actually use on race day.",
      },
    },
    {
      "@type": "Question",
      name: "What should go in drop bags for an ultramarathon?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Drop bag contents depend on the leg: what conditions you'll face, whether it's daytime or night, and how far you have to go. Common items include: food and electrolytes for the upcoming leg, a change of socks or shoes if your feet are suffering, a headlamp and backup battery if night will fall before the next crew station, rain gear if weather is a risk, and any medication you need on a schedule. PlanUltra's drop bag planner (Phase 2) will flag night gear needs automatically based on your estimated arrival times.",
      },
    },
    {
      "@type": "Question",
      name: "What is grade-adjusted pace for ultramarathons?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Grade-adjusted pace (GAP) adjusts your per-mile pace to account for elevation change. Running uphill at 15 min/mile might feel equivalent to 10 min/mile on flat ground — GAP normalises for this. Tools like Strava display GAP for activities. PlanUltra's pace calculator uses a terrain-weighted model: each segment is weighted by its gross climbing and descending, so arrival time estimates automatically reflect the difficulty of each leg, not just its distance.",
      },
    },
    {
      "@type": "Question",
      name: "What is a pacer in ultramarathon running?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A pacer is a runner who joins you at a designated point in a race (typically after mile 50 in a 100-miler) to help you maintain pace, stay motivated, and make good decisions in the later miles. Most 100-mile races allow pacers from a specified aid station onward. Your pacer needs to know when to arrive at the pickup station and what to bring — PlanUltra's crew sheet covers both.",
      },
    },
    {
      "@type": "Question",
      name: "How do I organise my crew for a 100-mile race?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Your crew needs to know: which stations they can access, your estimated arrival times, what to have ready at each station, and where they're allowed to park. PlanUltra generates a crew sheet with all of this in one place. For crew accommodation near remote race stations, the course map helps your crew identify which stations are clustered so they can choose a single base rather than driving between hotels mid-race.",
      },
    },
    {
      "@type": "Question",
      name: "What technology does PlanUltra use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "PlanUltra is a Next.js web application using React on the frontend. Weather data comes from Open-Meteo (free, open-source). Authentication is via Google OAuth. The application is designed to be mobile-friendly — crew sheets in particular are optimised for viewing on a phone in the field.",
      },
    },
    {
      "@type": "Question",
      name: "Can I export my plan?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The crew sheet is shareable via a public link and printable from any browser. GPX is the universal standard — PlanUltra will not lock your race data into a proprietary format. Full data export is on the roadmap.",
      },
    },
    {
      "@type": "Question",
      name: "Is my data private?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Your race plan is private to your account. Crew sheets are publicly accessible via a unique link — only people with the link can view it. PlanUltra does not sell data.",
      },
    },
  ],
};

const sections = [
  {
    id: "general",
    label: "General",
    items: [
      {
        q: "What is PlanUltra?",
        a: "PlanUltra is a free web tool that helps ultramarathon runners plan their race logistics. You upload a GPX file (or pick from a library of known races), and PlanUltra builds you a structured plan showing aid stations, distances, estimated arrival times, and hour-by-hour weather conditions across the full race window — including overnight. No subscription, no account required to explore.",
      },
      {
        q: "Who is PlanUltra for?",
        a: "PlanUltra is built first for runners preparing for their first 100-mile ultramarathon, especially in the US, where race-day logistics can feel overwhelming. It is also useful for other ultra distances, but the strongest fit today is the runner who wants help turning aid stations, pacing, weather, and crew logistics into one usable plan. Crew members and pacers can also use the output to understand when and where to show up on race day.",
      },
      {
        q: "Is PlanUltra free?",
        a: "Yes. PlanUltra is completely free. There's no paid tier, no premium features, and no subscription. It's a side project built by a product manager who runs ultras — not a startup. The crew sheet you generate can be shared with your crew via a public link that requires no account to view.",
      },
      {
        q: "Do I need an account?",
        a: "You need a Google account to save a race and generate a plan, but you can explore the tool without signing in. Shared crew sheets are publicly viewable — your crew doesn't need an account to see their copy.",
      },
      {
        q: "Who built PlanUltra?",
        a: "PlanUltra was built by Dan James, a product manager and ultramarathon runner based in Charlotte, NC. Dan DNF'd at Grindstone 100 and built PlanUltra because no existing tool covered the full logistics workflow he needed: aid station layout, pacing anchors, weather across a multi-day event, and a crew sheet his crew could actually use. It's a founder-led side project with personal onboarding help available for early users.",
      },
    ],
  },
  {
    id: "race-setup",
    label: "Race setup",
    items: [
      {
        q: "How do I add my race to PlanUltra?",
        a: "Two options: select from PlanUltra's curated library of known ultras (which includes pre-verified aid station data), or upload a GPX file from your race's website. After loading the course, you confirm which aid stations have drop bag access and which are crew-accessible — that's the only required manual step.",
      },
      {
        q: "What is a GPX file and where do I get one?",
        a: "A GPX (GPS Exchange Format) file is a standard file format that stores route and waypoint data. Most race organisers publish a GPX file on their race website — look for a \"GPX download\" or \"course file\" link on the race's course description page. Sites like Strava and Garmin Connect also export GPX files from any activity. If you can't find a GPX, try emailing the race director — they almost always have one.",
      },
      {
        q: "How does PlanUltra read aid stations from a GPX file?",
        a: "Aid stations are stored as named waypoints inside the GPX file. PlanUltra extracts these automatically and presents them as a list for you to confirm. Not all race GPX files include waypoints — if yours doesn't, you'll see a fallback option to enter aid stations manually.",
      },
      {
        q: "What if my race isn't in the library?",
        a: "Upload a GPX file instead. The library is a convenience layer — the GPX upload path works for any race. If you want a race added to the library, contact us at danrjames@gmail.com.",
      },
    ],
  },
  {
    id: "planning-features",
    label: "Planning features",
    items: [
      {
        q: "How does pace estimation work?",
        a: "You enter a target finish time and PlanUltra distributes that time across each segment, weighted by distance and elevation. Segments with more climbing or descending are allocated more time than flat segments of the same distance — so a short, steep climb gets more time than a long flat stretch. You can also override the estimated arrival at any aid station to act as a fixed anchor, and PlanUltra redistributes the remaining time around it.",
      },
      {
        q: "How accurate are the arrival time estimates?",
        a: "Treat them as planning anchors, not predictions. The estimates account for elevation (more time for climbs and descents) but not fatigue, technical terrain, or aid station stops. They're accurate enough to anchor your weather window, your crew's schedule, and your drop bag planning — which is the intended use. For higher accuracy, use the manual override feature to lock in your target time at a key mid-race station.",
      },
      {
        q: "How does the weather forecast work?",
        a: "PlanUltra pulls hour-by-hour weather data from Open-Meteo, a free, open-source weather API. The forecast is anchored to your race start time and location, covering the full expected race window — which for most ultras spans at least one night. You'll see temperature, precipitation probability, wind, and conditions for each hour, cross-referenced with where you're estimated to be on course at that time.",
      },
      {
        q: "How far out does the weather forecast work?",
        a: "Open-Meteo's forecast is reliable to about 7 days and available up to 16 days. For races more than 16 days out, PlanUltra will show the forecast data with a note about reduced reliability at longer horizons. Treat the forecast as directional rather than precise beyond 16 days.",
      },
      {
        q: "What is a crew sheet?",
        a: "A crew sheet is a shareable, printable summary of your race plan designed for your crew members and pacers. It shows each aid station in order, your estimated arrival times, which stations are crew-accessible, what you've packed in your drop bags, and any notes you've left for your crew. You generate it with one click and share it via a public link — your crew needs no account to view it.",
      },
    ],
  },
  {
    id: "ultramarathon-planning",
    label: "Ultramarathon planning",
    items: [
      {
        q: "How do I plan a 100-mile race?",
        a: "100-mile race planning typically involves five areas: course intelligence (aid station locations, distances, elevation profile), pace planning (estimated arrival times at each station), gear and nutrition (what to carry per leg, what goes in drop bags), crew coordination (who meets you where, and when), and weather preparation (what conditions to expect at key points on the course). PlanUltra covers the first four areas and surfaces weather across the full race window. The crew sheet feature lets you share the full plan with your crew in a format they can actually use on race day.",
      },
      {
        q: "What should go in drop bags for an ultramarathon?",
        a: "Drop bag contents depend on the leg: what conditions you'll face, whether it's daytime or night, and how far you have to go. Common items include: food and electrolytes for the upcoming leg, a change of socks or shoes if your feet are suffering, a headlamp and backup battery if night will fall before the next crew station, rain gear if weather is a risk, and any medication you need on a schedule. PlanUltra's drop bag planner (Phase 2) will flag night gear needs automatically based on your estimated arrival times.",
      },
      {
        q: "What is grade-adjusted pace for ultramarathons?",
        a: "Grade-adjusted pace (GAP) adjusts your per-mile pace to account for elevation change. Running uphill at 15 min/mile might feel equivalent to 10 min/mile on flat ground — GAP normalises for this. Tools like Strava display GAP for activities. PlanUltra's pace calculator uses a terrain-weighted model: each segment is weighted by its gross climbing and descending, so arrival time estimates automatically reflect the difficulty of each leg, not just its distance.",
      },
      {
        q: "What is a pacer in ultramarathon running?",
        a: "A pacer is a runner who joins you at a designated point in a race (typically after mile 50 in a 100-miler) to help you maintain pace, stay motivated, and make good decisions in the later miles. Most 100-mile races allow pacers from a specified aid station onward. Your pacer needs to know when to arrive at the pickup station and what to bring — PlanUltra's crew sheet covers both.",
      },
      {
        q: "How do I organise my crew for a 100-mile race?",
        a: "Your crew needs to know: which stations they can access, your estimated arrival times, what to have ready at each station, and where they're allowed to park. PlanUltra generates a crew sheet with all of this in one place. For crew accommodation near remote race stations, the course map helps your crew identify which stations are clustered so they can choose a single base rather than driving between hotels mid-race.",
      },
    ],
  },
  {
    id: "technical",
    label: "Technical",
    items: [
      {
        q: "What technology does PlanUltra use?",
        a: "PlanUltra is a Next.js web application using React on the frontend. Weather data comes from Open-Meteo (free, open-source). Authentication is via Google OAuth. The application is designed to be mobile-friendly — crew sheets in particular are optimised for viewing on a phone in the field.",
      },
      {
        q: "Can I export my plan?",
        a: "The crew sheet is shareable via a public link and printable from any browser. GPX is the universal standard — PlanUltra will not lock your race data into a proprietary format. Full data export is on the roadmap.",
      },
      {
        q: "Is my data private?",
        a: "Your race plan is private to your account. Crew sheets are publicly accessible via a unique link — only people with the link can view it. PlanUltra does not sell data.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div style={{ fontFamily: "var(--font-geist-sans, system-ui)", color: "var(--midnight)", background: "white", overflowX: "hidden" }}>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ── Nav ── */}
      <nav
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
          background: "var(--midnight)",
          borderBottom: "1px solid rgba(130,199,246,0.15)",
        }}
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
          }}
        >
          Sign in
        </Link>
      </nav>

      {/* ── Page header ── */}
      <section style={{ background: "var(--midnight)", padding: "136px 48px 64px", paddingTop: "calc(72px + 64px)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{
            fontFamily: "var(--font-geist-mono, monospace)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--sky)",
            opacity: 0.6,
            marginBottom: 16,
          }}>
            Help &amp; FAQ
          </div>
          <h1 style={{
            fontFamily: "var(--font-dm-sans, system-ui)",
            fontSize: "clamp(28px, 4vw, 40px)",
            fontWeight: 800,
            color: "white",
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            marginBottom: 16,
          }}>
            Common questions
          </h1>
          <p style={{
            fontFamily: "var(--font-geist-sans, system-ui)",
            fontSize: 16,
            color: "rgba(255,255,255,0.65)",
            lineHeight: 1.6,
          }}>
            Everything you need to know before race day.
          </p>
        </div>
      </section>

      {/* ── FAQ sections ── */}
      <div style={{ background: "white", padding: "64px 48px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {sections.map((section, sectionIndex) => (
            <div
              key={section.id}
              id={section.id}
              style={{
                borderTop: sectionIndex > 0 ? "1px solid #E2E8F0" : undefined,
                paddingTop: sectionIndex > 0 ? 48 : 0,
                marginTop: sectionIndex > 0 ? 48 : 0,
              }}
            >
              <h2 style={{
                fontFamily: "var(--font-dm-sans, system-ui)",
                fontSize: 20,
                fontWeight: 700,
                color: "var(--midnight)",
                marginBottom: 32,
              }}>
                {section.label}
              </h2>
              {section.items.map((item) => (
                <div key={item.q} style={{ marginBottom: 32 }}>
                  <p style={{
                    fontFamily: "var(--font-dm-sans, system-ui)",
                    fontSize: 17,
                    fontWeight: 700,
                    color: "var(--midnight)",
                    marginBottom: 8,
                    lineHeight: 1.4,
                  }}>
                    {item.q}
                  </p>
                  <p style={{
                    fontFamily: "var(--font-geist-sans, system-ui)",
                    fontSize: 15,
                    color: "#475569",
                    lineHeight: 1.7,
                    margin: 0,
                  }}>
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA strip ── */}
      <section style={{ background: "var(--deep-ridge)", padding: "48px", textAlign: "center" }}>
        <h2 style={{
          fontFamily: "var(--font-dm-sans, system-ui)",
          fontSize: 24,
          fontWeight: 800,
          color: "white",
          letterSpacing: "-0.02em",
          marginBottom: 12,
        }}>
          Ready to plan your race?
        </h2>
        <p style={{
          fontFamily: "var(--font-geist-sans, system-ui)",
          fontSize: 15,
          color: "rgba(255,255,255,0.7)",
          marginBottom: 28,
        }}>
          Free, no subscription. Just upload your GPX and go.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            background: "var(--ridge-blue)",
            color: "white",
            padding: "14px 36px",
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 4px 20px rgba(29,124,190,0.4)",
          }}
        >
          Start planning →
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: "var(--midnight)", borderTop: "1px solid rgba(130,199,246,0.12)", padding: "24px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontFamily: "var(--font-dm-sans, system-ui)", fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "-0.02em" }}>PlanUltra ▲</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>Free forever · Built by a runner · No subscription</div>
      </footer>

      <style>{`
        @media (max-width: 480px) {
          nav { padding: 16px 20px !important; }
        }
      `}</style>
    </div>
  );
}
