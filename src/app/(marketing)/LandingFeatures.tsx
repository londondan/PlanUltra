"use client";

import { useState } from "react";

/* ── Illustration shell ── */
function IllusShell({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div style={{
      background: dark ? "var(--midnight)" : "var(--mist)",
      border: `1px solid ${dark ? "rgba(130,199,246,0.2)" : "rgba(130,199,246,0.45)"}`,
      borderRadius: 14,
      padding: 20,
      boxShadow: "0 4px 24px rgba(29,124,190,0.08)",
      overflow: "hidden",
    }}>
      {children}
    </div>
  );
}

/* ── Map Illustration ── */
export function MapIllustration() {
  return (
    <IllusShell>
      <svg
        style={{ width: "100%", borderRadius: 10, overflow: "hidden", boxShadow: "0 2px 12px rgba(29,124,190,0.12)" }}
        viewBox="0 0 420 280"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="mapBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e8f4fb" />
            <stop offset="100%" stopColor="#d0eaf7" />
          </linearGradient>
        </defs>

        <rect width="420" height="280" fill="url(#mapBg)" />

        {/* Topo contours — Hill 1 */}
        <ellipse cx="145" cy="120" rx="85" ry="55" fill="none" stroke="#1D7CBE" strokeWidth="0.8" opacity="0.2" />
        <ellipse cx="145" cy="120" rx="62" ry="40" fill="none" stroke="#1D7CBE" strokeWidth="0.8" opacity="0.28" />
        <ellipse cx="145" cy="120" rx="40" ry="26" fill="none" stroke="#1D7CBE" strokeWidth="0.8" opacity="0.36" />
        <ellipse cx="145" cy="120" rx="20" ry="13" fill="none" stroke="#114574" strokeWidth="1" opacity="0.4" />
        <ellipse cx="145" cy="120" rx="8" ry="5" fill="#114574" opacity="0.2" />

        {/* Hill 2 */}
        <ellipse cx="310" cy="80" rx="65" ry="42" fill="none" stroke="#1D7CBE" strokeWidth="0.8" opacity="0.18" />
        <ellipse cx="310" cy="80" rx="44" ry="28" fill="none" stroke="#1D7CBE" strokeWidth="0.8" opacity="0.26" />
        <ellipse cx="310" cy="80" rx="24" ry="15" fill="none" stroke="#1D7CBE" strokeWidth="0.9" opacity="0.34" />
        <ellipse cx="310" cy="80" rx="10" ry="6" fill="#114574" opacity="0.18" />

        {/* Hill 3 */}
        <ellipse cx="340" cy="200" rx="58" ry="38" fill="none" stroke="#1D7CBE" strokeWidth="0.8" opacity="0.16" />
        <ellipse cx="340" cy="200" rx="38" ry="24" fill="none" stroke="#1D7CBE" strokeWidth="0.8" opacity="0.24" />
        <ellipse cx="340" cy="200" rx="18" ry="12" fill="#114574" opacity="0.15" />

        {/* Hill 4 */}
        <ellipse cx="70" cy="220" rx="50" ry="32" fill="none" stroke="#1D7CBE" strokeWidth="0.7" opacity="0.14" />
        <ellipse cx="70" cy="220" rx="30" ry="19" fill="none" stroke="#1D7CBE" strokeWidth="0.7" opacity="0.2" />

        {/* Route glow */}
        <path
          d="M28,250 C45,240 60,230 75,218 C90,205 100,190 115,175 C130,160 138,148 148,135 C158,122 162,115 155,108 C148,100 140,100 148,88 C158,74 172,68 188,72 C205,76 215,90 228,100 C242,112 255,118 268,108 C282,97 290,82 305,74 C318,67 328,70 338,78 C350,87 355,100 358,118 C362,138 358,158 352,175 C346,193 338,205 342,218 C346,230 354,238 362,248"
          fill="none" stroke="#82C7F6" strokeWidth="5" strokeLinecap="round" opacity="0.25"
        />
        {/* Route */}
        <path
          d="M28,250 C45,240 60,230 75,218 C90,205 100,190 115,175 C130,160 138,148 148,135 C158,122 162,115 155,108 C148,100 140,100 148,88 C158,74 172,68 188,72 C205,76 215,90 228,100 C242,112 255,118 268,108 C282,97 290,82 305,74 C318,67 328,70 338,78 C350,87 355,100 358,118 C362,138 358,158 352,175 C346,193 338,205 342,218 C346,230 354,238 362,248"
          fill="none" stroke="#1D7CBE" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        />

        {/* Start */}
        <circle cx="28" cy="250" r="7" fill="white" stroke="#114574" strokeWidth="2" />
        <circle cx="28" cy="250" r="3" fill="#114574" />
        {/* Station 1 */}
        <circle cx="155" cy="108" r="6" fill="#1D7CBE" />
        <circle cx="155" cy="108" r="3" fill="white" />
        {/* Station 2 */}
        <circle cx="268" cy="108" r="6" fill="#1D7CBE" />
        <circle cx="268" cy="108" r="3" fill="white" />
        {/* Station 3 */}
        <circle cx="338" cy="78" r="6" fill="#1D7CBE" />
        <circle cx="338" cy="78" r="3" fill="white" />
        {/* Finish */}
        <circle cx="362" cy="248" r="7" fill="white" stroke="#114574" strokeWidth="2" />
        <text x="362" y="251" textAnchor="middle" fontSize="7" fontWeight="800" fill="#114574" fontFamily="system-ui">F</text>

        {/* Labels */}
        <text x="28" y="243" fontSize="8" fontWeight="700" fill="#114574" fontFamily="system-ui" textAnchor="middle">Start</text>
        <text x="155" y="100" fontSize="7.5" fontWeight="600" fill="#114574" fontFamily="system-ui" textAnchor="middle">COR</text>
        <text x="268" y="100" fontSize="7.5" fontWeight="600" fill="#114574" fontFamily="system-ui" textAnchor="middle">Big M</text>
        <text x="338" y="70" fontSize="7.5" fontWeight="600" fill="#114574" fontFamily="system-ui" textAnchor="middle">Pole</text>

        {/* Elevation strip */}
        <rect x="0" y="258" width="420" height="22" fill="white" opacity="0.7" />
        <path d="M8,276 L40,268 L80,262 L120,256 L155,260 L190,264 L230,260 L268,264 L308,260 L340,262 L380,266 L412,270" fill="none" stroke="#1D7CBE" strokeWidth="1.5" />
        <text x="8" y="279" fontSize="7" fill="#94a3b8" fontFamily="system-ui">Elevation</text>
        <rect x="280" y="260" width="132" height="16" rx="3" fill="white" opacity="0.8" />
        <text x="284" y="271" fontSize="7.5" fill="#64748b" fontFamily="system-ui" fontWeight="600">● Drop bag  ○ Start / Finish</text>
      </svg>
    </IllusShell>
  );
}

/* ── Section Cards Illustration ── */
const cardBase: React.CSSProperties = {
  background: "white",
  border: "1px solid rgba(130,199,246,0.6)",
  borderRadius: 10,
  overflow: "hidden",
  boxShadow: "0 2px 6px rgba(29,124,190,0.07)",
  marginBottom: 8,
  fontFamily: "system-ui, sans-serif",
};

const cardHeader: React.CSSProperties = {
  background: "var(--mist)",
  padding: "10px 14px",
  borderBottom: "1px solid rgba(130,199,246,0.4)",
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const mileBadge: React.CSSProperties = {
  background: "var(--deep-ridge)",
  color: "white",
  fontFamily: "monospace",
  fontSize: 10,
  fontWeight: 700,
  padding: "2px 7px",
  borderRadius: 4,
};

const timeBadge: React.CSSProperties = {
  background: "white",
  border: "1px solid rgba(130,199,246,0.5)",
  color: "var(--deep-ridge)",
  fontFamily: "monospace",
  fontSize: 10,
  padding: "2px 7px",
  borderRadius: 4,
};

const segName: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "var(--midnight)",
  flex: 1,
};

const infoGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 6,
  padding: "10px 14px",
};

const chipBase: React.CSSProperties = {
  borderRadius: 7,
  padding: "8px 10px",
};

const chipLbl: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  marginBottom: 2,
};

const chipVal: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.2,
};

const chipSub: React.CSSProperties = { fontSize: 9, opacity: 0.7, marginTop: 1 };

export function SectionCardsIllustration() {
  return (
    <IllusShell>
      {/* Card 1: Start → COR */}
      <div style={cardBase}>
        <div style={cardHeader}>
          <div style={mileBadge}>Mile 0</div>
          <div style={timeBadge}>5:00 AM</div>
          <div style={segName}>Start → Chicken Out Ridge</div>
        </div>
        <div style={infoGrid}>
          {/* Distance */}
          <div style={{ ...chipBase, background: "var(--mist)", border: "1px solid rgba(130,199,246,0.5)" }}>
            <div style={{ ...chipLbl, color: "#64748b" }}>Distance</div>
            <div style={{ ...chipVal, color: "var(--midnight)" }}>23.1 mi</div>
            <div style={{ ...chipSub, color: "var(--midnight)" }}>+3,200 ft</div>
          </div>
          {/* Night */}
          <div style={{ ...chipBase, background: "linear-gradient(145deg, #0a0e2a, #1a1f4e)", border: "1px solid rgba(99,102,241,0.3)", position: "relative", overflow: "hidden" }}>
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              backgroundImage: "radial-gradient(1px 1px at 18% 22%, rgba(255,255,255,0.7) 0%, transparent 100%), radial-gradient(1px 1px at 55% 12%, rgba(255,255,255,0.6) 0%, transparent 100%), radial-gradient(1px 1px at 78% 35%, rgba(255,255,255,0.8) 0%, transparent 100%), radial-gradient(1px 1px at 35% 65%, rgba(255,255,255,0.5) 0%, transparent 100%), radial-gradient(1px 1px at 88% 58%, rgba(255,255,255,0.6) 0%, transparent 100%)",
            }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ ...chipLbl, color: "rgba(167,139,250,0.8)" }}>🌙 Night</div>
              <div style={{ ...chipVal, fontSize: 11, fontFamily: "system-ui", color: "#e2e8ff" }}>Start → ~mi 4</div>
              <div style={{ ...chipSub, color: "rgba(196,181,253,0.65)" }}>Sunrise 5:48 AM</div>
            </div>
          </div>
          {/* Sunrise */}
          <div style={{ ...chipBase, background: "linear-gradient(135deg, #3b1f5c, #7c3aed 40%, #f97316 75%, #fbbf24)", border: "1px solid rgba(249,115,22,0.3)" }}>
            <div style={{ ...chipLbl, color: "rgba(254,215,170,0.9)" }}>🌅 Sunrise</div>
            <div style={{ ...chipVal, fontSize: 11, fontFamily: "system-ui", color: "white" }}>~mile 4</div>
            <div style={{ ...chipSub, color: "rgba(254,243,199,0.8)" }}>5:48 AM</div>
          </div>
          {/* Weather clear — spans 3 */}
          <div style={{ ...chipBase, background: "linear-gradient(145deg, #eff6ff, #bfdbfe)", border: "1px solid rgba(96,165,250,0.4)", gridColumn: "span 3" }}>
            <div style={{ ...chipLbl, color: "#1d4ed8" }}>☀️ Weather</div>
            <div style={{ fontSize: 11, fontFamily: "system-ui", fontWeight: 700, color: "#1e3a8a" }}>38°F → 56°F · Clear, light wind</div>
          </div>
        </div>
      </div>

      {/* Card 2: Big Mountain → Pole Canyon */}
      <div style={{ ...cardBase, marginBottom: 0 }}>
        <div style={cardHeader}>
          <div style={mileBadge}>Mile 43.6</div>
          <div style={timeBadge}>3:07 PM</div>
          <div style={segName}>Big Mountain → Pole Canyon</div>
        </div>
        <div style={infoGrid}>
          {/* Distance */}
          <div style={{ ...chipBase, background: "var(--mist)", border: "1px solid rgba(130,199,246,0.5)" }}>
            <div style={{ ...chipLbl, color: "#64748b" }}>Distance</div>
            <div style={{ ...chipVal, color: "var(--midnight)" }}>16.5 mi</div>
            <div style={{ ...chipSub, color: "var(--midnight)" }}>+1,800 ft</div>
          </div>
          {/* Sunset */}
          <div style={{ ...chipBase, background: "linear-gradient(145deg, #fde68a, #fb923c 35%, #9333ea 70%, #4c1d95)", border: "1px solid rgba(147,51,234,0.3)" }}>
            <div style={{ ...chipLbl, color: "rgba(233,213,255,0.9)" }}>🌇 Sunset</div>
            <div style={{ ...chipVal, fontSize: 11, fontFamily: "system-ui", color: "white" }}>~mile 52</div>
            <div style={{ ...chipSub, color: "rgba(221,214,254,0.8)" }}>8:24 PM</div>
          </div>
          {/* Duration */}
          <div style={{ ...chipBase, background: "var(--mist)", border: "1px solid rgba(130,199,246,0.5)" }}>
            <div style={{ ...chipLbl, color: "#64748b" }}>Duration</div>
            <div style={{ ...chipVal, color: "var(--midnight)" }}>~4h 37m</div>
            <div style={{ ...chipSub, color: "var(--midnight)" }}>~1,295 kcal</div>
          </div>
          {/* Storm — spans 2 */}
          <div style={{ ...chipBase, background: "linear-gradient(145deg, #1c1917, #44403c)", border: "1px solid rgba(234,179,8,0.35)", gridColumn: "span 2" }}>
            <div style={{ ...chipLbl, color: "rgba(253,224,71,0.8)" }}>⚡ Weather</div>
            <div style={{ fontSize: 11, fontFamily: "system-ui", fontWeight: 700, color: "#fef08a" }}>62°F → 44°F · Storm risk 2–5 PM · rain gear recommended</div>
          </div>
        </div>
      </div>
    </IllusShell>
  );
}

/* ── Drop Bag Cards Illustration ── */
const bagCardBase: React.CSSProperties = {
  background: "white",
  border: "1px solid rgba(130,199,246,0.6)",
  borderRadius: 10,
  overflow: "hidden",
  marginBottom: 8,
  boxShadow: "0 2px 6px rgba(29,124,190,0.07)",
};

const bagHeaderBase: React.CSSProperties = {
  background: "var(--deep-ridge)",
  color: "white",
  padding: "10px 14px",
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
};

export function DropBagCardsIllustration() {
  const [startOpen, setStartOpen] = useState(true);

  return (
    <IllusShell>
      {/* Start bag */}
      <div style={bagCardBase}>
        <div
          style={{ ...bagHeaderBase, cursor: "pointer" }}
          onClick={() => setStartOpen((v) => !v)}
        >
          <div>
            <div style={{ fontFamily: "var(--font-dm-sans, system-ui)", fontSize: 14, fontWeight: 800 }}>Start bag</div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>Mile 0 · Jun 28, 5:00 AM</div>
          </div>
          <span style={{ fontSize: 11, opacity: 0.5 }}>{startOpen ? "▾" : "▸"}</span>
        </div>
        {startOpen && (
          <div style={{ padding: "10px 14px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--deep-ridge)", marginBottom: 6 }}>What to pack</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.05em", background: "var(--mist)", color: "var(--deep-ridge)" }}>☐ Headlamp</span>
              <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.05em", background: "var(--mist)", color: "var(--deep-ridge)" }}>☐ Extra layer</span>
            </div>
            <div style={{ background: "var(--mist)", border: "1px solid rgba(130,199,246,0.5)", borderRadius: 7, padding: "8px 10px", marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--midnight)", marginBottom: 3 }}>🥡 Baggie → Chicken Out Ridge</div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: "#64748b" }}>23.1 mi · ~4h 22m leg</div>
              <div style={{ fontSize: 10, color: "#475569", marginTop: 3 }}>3× drink mix · ~1,225 kcal · 4× gel, 2× bar, 1× rice ball</div>
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--deep-ridge)", margin: "8px 0 5px" }}>When do I reach this bag?</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10 }}>
              <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--deep-ridge)" }}>Mile 0</span>
              <span style={{ color: "#64748b", fontFamily: "monospace" }}>Jun 28 · 5:00 AM</span>
              <span style={{ color: "#475569" }}>Race start</span>
            </div>
          </div>
        )}
      </div>

      {/* COR bag — collapsed */}
      <div style={bagCardBase}>
        <div style={{ ...bagHeaderBase, background: "#0d3a63" }}>
          <div>
            <div style={{ fontFamily: "var(--font-dm-sans, system-ui)", fontSize: 14, fontWeight: 800 }}>Chicken Out Ridge</div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>Mile 23.1 · first drop bag</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, opacity: 0.6, lineHeight: 1.5 }}>Headlamp · Rain gear<br />1 baggie packed</div>
            <span style={{ fontSize: 11, opacity: 0.4 }}>▸</span>
          </div>
        </div>
      </div>

      {/* Big Mountain bag — collapsed */}
      <div style={{ ...bagCardBase, marginBottom: 0 }}>
        <div style={{ ...bagHeaderBase, background: "#0d3a63" }}>
          <div>
            <div style={{ fontFamily: "var(--font-dm-sans, system-ui)", fontSize: 14, fontWeight: 800 }}>Big Mountain</div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>Mile 43.6 · crew access</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, opacity: 0.6, lineHeight: 1.5 }}>Headlamp · Poles · Shoe change<br />1 baggie packed</div>
            <span style={{ fontSize: 11, opacity: 0.4 }}>▸</span>
          </div>
        </div>
      </div>
    </IllusShell>
  );
}
