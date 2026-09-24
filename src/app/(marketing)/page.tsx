export const dynamic = 'force-dynamic'

import { getLibraryRaces } from '@/lib/db/races'
import { getAidStations } from '@/lib/db/aid-stations'
import { PixelText } from '@/components/retro/PixelText'
import { PixelScene } from '@/components/retro/PixelScene'
import { PixelIcon, ICON_LINK, ICON_P, ICON_QR } from '@/components/retro/PixelIcon'
import { RaceMenu } from '@/components/home/RaceMenu'
import type { LibraryRace } from '@/components/home/RaceMenu'
import { C } from '@/components/retro/pixel-font'

export default async function HomePage() {
  const rawRaces = await getLibraryRaces()

  const races: LibraryRace[] = (
    await Promise.all(
      rawRaces.map(async ({ gpxData: _, ...r }) => {
        const stations = await getAidStations(r.raceId)
        const crewStations = stations.filter((s) => s.hasCrewAccess)
        const isComplete =
          crewStations.length > 0 &&
          crewStations.every((s) => s.crewParkingUrl || s.crewParkingCoords)
        const lastStation = stations.length > 0 ? stations[stations.length - 1] : null
        const totalMi =
          lastStation != null
            ? Math.round(lastStation.distanceFromStart * 10) / 10
            : undefined
        return { ...r, isComplete, totalMi }
      })
    )
  )
    .filter((r) => r.isComplete)
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))

  return (
    <div className="retro-root">
      {/* ── Hero ── */}
      <section className="hero">
        <div className="wrap top">
          <a className="logo" href="/">
            <PixelText lines={[['PLANULTRA', C.white]]} label="PlanUltra" className="logo-svg" />
          </a>
          <nav>
            <a href="#gets">HOW IT WORKS</a>
            <a href="/faq">FAQ</a>
          </nav>
        </div>

        <div className="wrap hero-grid">
          <div>
            <h1>
              <PixelText
                lines={[
                  ['GIVE YOUR CREW', C.white],
                  ['ONE LINK.', C.sky],
                ]}
                label="Give your crew one link."
              />
            </h1>
            <p className="sub">
              A link that gets them to <b>every crew stop</b>, and a printout that still
              works when there&apos;s no signal.
              <span className="blink">_</span>
            </p>
          </div>

          <RaceMenu races={races} />
        </div>

        <PixelScene />
      </section>

      {/* ── What your crew gets ── */}
      <section className="gets" id="gets">
        <div className="wrap">
          <h2>WHAT YOUR CREW GETS</h2>
          <p className="lead">
            PlanUltra builds an overview of the race with every crew stop in order,
            plus where and how to park. Each stop has a QR code for directions —
            and the coordinates printed underneath for when there&apos;s no signal.
          </p>
          <div className="gets-grid">
            {/* Crew sheet mock */}
            <div className="sheet">
              <div className="sheet-t">
                <span>CREW SHEET</span>
                <span>PAGE 1/2</span>
              </div>
              <div className="sh">
                <b>Grindstone 100</b>
                <div>Sat Oct 4 2025 · 6:00 AM EDT start · 101.4 mi · 6 crew stops</div>
                <span className="url">
                  <span className="n">1</span>planultrarace.com/crew/mn7jrA
                </span>
              </div>
              <div className="st">
                <div className="b">
                  <span className="mb">MI 0.0</span>
                  <span className="nm">Start · Swoope Ruritan Hall</span>
                  <div className="pt">[Parking lot]</div>
                  <a className="dir" href="https://planultrarace.com/crew/mn7jrA-wOyPOB-qk">
                    <span className="n">2</span>Directions to crew parking
                  </a>
                  <div className="nt">Parking in the grass field across from the hall. Follow volunteer signs from Rt 254.</div>
                </div>
                <div className="q">
                  <PixelIcon rows={ICON_QR} />
                  <span>38.2714<br />-79.3648</span>
                </div>
              </div>
              <div className="sk">
                crew can&apos;t reach: Dry Branch 9.4 · Crawford Mtn 18.6 → next crew stop Braley Pond (+24.2 mi)
              </div>
              <div className="st">
                <div className="b">
                  <span className="mb">MI 24.2</span>
                  <span className="nm">Braley Pond</span>
                  <div className="pt">[Trailhead lot]</div>
                  <a className="dir" href="https://planultrarace.com/crew/mn7jrA-wOyPOB-qk">
                    Directions to crew parking
                  </a>
                  <div className="nt">Small lot — arrive early or park on the gravel shoulder 0.2 mi back.</div>
                </div>
                <div className="q">
                  <span className="n" style={{ marginBottom: 4, display: 'inline-block' }}>3</span>
                  <PixelIcon rows={ICON_QR} />
                  <span>38.3021<br />-79.4112</span>
                </div>
              </div>
            </div>

            {/* Feature items */}
            <div>
              <ul className="items">
                <li className="item">
                  <PixelIcon rows={ICON_LINK} />
                  <h3><span className="n">1</span>A LINK YOU CAN TEXT</h3>
                  <p>It opens on any phone, with no app or account.</p>
                </li>
                <li className="item">
                  <PixelIcon rows={ICON_P} />
                  <h3><span className="n">2</span>DIRECTIONS TO PARKING</h3>
                  <p>Not just the aid station — notes on the lot, the walk-in, or the shuttle.</p>
                </li>
                <li className="item">
                  <PixelIcon rows={ICON_QR} />
                  <h3><span className="n">3</span>A PRINTOUT FOR NO SIGNAL</h3>
                  <p>Every stop has a QR code for your maps app.</p>
                  <p className="fine">Coordinates are printed underneath for an offline map.</p>
                </li>
              </ul>
              <a className="more" href="https://planultrarace.com/crew/mn7jrA-wOyPOB-qk" target="_blank" rel="noopener noreferrer">
                &gt; open the full example_
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Credits ── */}
      <section className="credits">
        <div className="wrap">
          <h2>CREDITS</h2>
          <div className="cred-grid">
            <div className="role">
              <b>Dan James</b>
              design, code, parking scouting
              <br />
              <a href="https://www.linkedin.com/in/daniel-james-45863320/" target="_blank" rel="noopener noreferrer">
                LinkedIn
              </a>{' '}
              ·{' '}
              <a href="https://github.com/londondan/PlanUltra" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
              <br />
              <a href="mailto:danrjames@gmail.com">danrjames@gmail.com</a>
            </div>
            <div>
              <p>
                I&apos;m a product manager and ultrarunner. I built PlanUltra after a DNF at Grindstone 100,
                wanting to do better by my crew. Race websites list the aid stations. Crews need to know
                where to park and which stops to skip.
              </p>
              <p>
                It&apos;s a hobby project: free, no ads, no accounts, and the code is on{' '}
                <a href="https://github.com/londondan/PlanUltra" target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
                . If a parking spot is wrong,{' '}
                <a href="mailto:danrjames@gmail.com">email me</a> and I&apos;ll fix it.
              </p>
            </div>
          </div>
        </div>
        <PixelScene cols={180} rows={14} stars={false} runner={false} cls="ground" />
      </section>

      <footer className="foot">
        <div className="wrap">
          <span>PLANULTRA · FREE · OPEN SOURCE</span>
          <span>
            <a href="/faq">FAQ</a>
            <a href="https://github.com/londondan/PlanUltra" target="_blank" rel="noopener noreferrer">
              GITHUB
            </a>
          </span>
        </div>
      </footer>

      <style>{`
        .retro-root {
          --mid: #02071E;
          --deep: #114574;
          --blue: #1D7CBE;
          --sky: #82C7F6;
          --mist: #DBF1FA;
          --mono: var(--font-ibm-plex-mono, "IBM Plex Mono"), ui-monospace, Menlo, Consolas, monospace;
          --px: var(--font-press-start-2p, "Press Start 2P"), var(--mono);
          font: 15px/1.65 var(--mono);
          color: var(--mid);
          background: var(--mid);
        }
        .retro-root a { color: inherit; }
        .retro-root * { box-sizing: border-box; }

        .wrap { max-width: 1200px; margin: 0 auto; padding: 0 32px; }

        /* ── hero ── */
        .hero {
          position: relative;
          min-height: 100vh;
          background: var(--mid);
          color: #fff;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .hero .scene {
          position: absolute;
          left: 0; right: 0; bottom: 0;
          width: 100%;
          height: 42vh;
          min-height: 250px;
        }
        .hero > .wrap { width: 100%; }
        .top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 22px 0;
          position: relative;
          z-index: 2;
        }
        .logo { text-decoration: none; }
        .logo-svg { display: block; height: 14px; width: auto; }
        .top nav a {
          font-family: var(--px);
          font-size: 10px;
          color: var(--sky);
          text-decoration: none;
          margin-left: 22px;
        }
        .top nav a:hover { color: #fff; }

        .hero-grid {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: 1fr 470px;
          gap: 48px;
          align-items: start;
          padding-top: 3vh;
          padding-bottom: 30vh;
        }
        .pxhead { display: block; width: 100%; max-width: 600px; height: auto; }
        .sub { color: var(--mist); font-size: 17px; max-width: 470px; margin-top: 22px; }
        .sub b { color: var(--sky); font-weight: 600; }
        .blink { animation: blink 1s steps(1) infinite; }
        @keyframes blink { 50% { opacity: 0; } }

        /* ── pixel window ── */
        .win {
          background: var(--mid);
          border: 4px solid var(--sky);
          box-shadow: 0 0 0 4px var(--mid), 8px 8px 0 4px var(--deep);
          position: relative;
          outline: none;
        }
        .win-t {
          background: var(--sky);
          color: var(--mid);
          font-family: var(--px);
          font-size: 10px;
          padding: 7px 10px;
          display: flex;
          justify-content: space-between;
        }
        .prompt {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 14px 16px 10px;
          border-bottom: 2px dashed rgba(130,199,246,.45);
          padding-bottom: 8px;
        }
        .prompt span { color: var(--sky); font-weight: 700; }
        .prompt input {
          flex: 1;
          background: transparent;
          border: 0;
          outline: none;
          color: #fff;
          font: 500 15px var(--mono);
        }
        .prompt input::placeholder { color: rgba(219,241,250,.5); }

        .menu { list-style: none; padding: 4px 0 8px; margin: 0; }
        .menu a {
          display: grid;
          grid-template-columns: 18px auto 1fr auto;
          column-gap: 8px;
          padding: 7px 16px;
          text-decoration: none;
          color: #fff;
        }
        .menu .cur { color: var(--sky); visibility: hidden; }
        .menu a:hover .cur,
        .menu a:focus .cur,
        .menu a.sel .cur { visibility: visible; }
        .menu a:hover,
        .menu a:focus,
        .menu a.sel { background: rgba(29,124,190,.35); outline: none; }
        .menu .nm { font-weight: 600; }
        .menu .dots { border-bottom: 2px dotted rgba(130,199,246,.45); margin-bottom: 7px; }
        .menu .mi { color: var(--sky); font-weight: 600; }
        .menu .meta { grid-column: 2/5; font-size: 12.5px; color: rgba(219,241,250,.6); }

        .win-foot {
          border-top: 2px dashed rgba(130,199,246,.45);
          padding: 14px 16px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .win-foot small { font-size: 12.5px; color: rgba(219,241,250,.7); }
        .saved { padding: 0 16px 14px; font-size: 12.5px; color: rgba(219,241,250,.7); }
        .saved a { color: var(--sky); }

        /* pixel button */
        .pbtn {
          display: inline-block;
          font-family: var(--px);
          font-size: 11px;
          color: #fff;
          background: var(--blue);
          text-decoration: none;
          padding: 12px 14px 14px;
          box-shadow: inset -4px -4px 0 var(--deep), inset 4px 4px 0 #4d9fd6, 0 0 0 3px var(--mid), 0 0 0 5px var(--sky);
        }
        .pbtn:hover { background: #2a8fd4; }
        .pbtn:active {
          transform: translateY(2px);
          box-shadow: inset 4px 4px 0 var(--deep), 0 0 0 3px var(--mid), 0 0 0 5px var(--sky);
        }

        /* ── section 2: gets ── */
        .gets {
          background: var(--mist);
          position: relative;
          padding: 72px 0 90px;
        }
        .gets h2 { font-family: var(--px); font-size: 22px; line-height: 1.4; color: var(--mid); }
        .gets .lead { max-width: 680px; margin-top: 14px; color: var(--deep); }
        .gets-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
          gap: 52px;
          margin-top: 40px;
          align-items: start;
        }

        /* crew sheet mock */
        .sheet {
          background: #fff;
          border: 4px solid var(--mid);
          box-shadow: 8px 8px 0 var(--deep);
          font-size: 13.5px;
        }
        .sheet-t {
          background: var(--mid);
          color: var(--sky);
          font-family: var(--px);
          font-size: 9px;
          padding: 8px 12px;
          display: flex;
          justify-content: space-between;
        }
        .sh { padding: 14px 16px; border-bottom: 4px solid var(--mid); }
        .sh b { font-size: 18px; }
        .sh div { color: var(--deep); font-size: 12.5px; }
        .url {
          display: inline-block;
          margin-top: 8px;
          background: var(--mid);
          color: var(--sky);
          padding: 3px 8px;
          font-size: 12.5px;
        }
        .st { display: flex; gap: 14px; padding: 12px 16px; border-bottom: 2px solid var(--sky); }
        .st .b { flex: 1; }
        .mb {
          background: var(--sky);
          color: var(--mid);
          font-weight: 700;
          font-size: 11.5px;
          padding: 1px 6px;
          margin-right: 6px;
        }
        .st .nm { font-weight: 700; font-size: 14.5px; }
        .pt { font-size: 12px; color: var(--deep); margin: 3px 0; }
        .dir {
          display: inline-block;
          font-weight: 600;
          color: var(--blue);
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .nt { color: var(--deep); font-size: 12.5px; margin-top: 3px; }
        .q {
          width: 66px;
          font-size: 9.5px;
          line-height: 1.3;
          color: var(--deep);
          text-align: center;
          flex-shrink: 0;
        }
        .q svg { width: 66px; height: 66px; display: block; }
        .sk {
          padding: 7px 16px 7px 34px;
          font-size: 12px;
          color: var(--deep);
          background: repeating-linear-gradient(90deg, #f3f9fc 0 8px, #fff 8px 16px);
          border-bottom: 2px solid var(--sky);
        }
        .n {
          display: inline-block;
          font-family: var(--px);
          font-size: 9px;
          background: var(--blue);
          color: #fff;
          padding: 4px 5px 3px;
          margin-right: 6px;
          vertical-align: 1px;
        }

        /* feature items */
        .items { list-style: none; display: flex; flex-direction: column; gap: 22px; padding: 0; margin: 0; }
        .item {
          background: #fff;
          border: 4px solid var(--mid);
          padding: 16px 18px;
          display: grid;
          grid-template-columns: 44px 1fr;
          gap: 4px 14px;
          box-shadow: 6px 6px 0 var(--sky);
        }
        .item .ico { width: 36px; height: 36px; grid-row: 1 / 3; }
        .item h3 { font-family: var(--px); font-size: 11px; line-height: 1.6; margin: 0; }
        .item p { font-size: 14px; color: var(--deep); margin: 0; }
        .item .fine { grid-column: 2; font-size: 12.5px; color: var(--deep); opacity: .8; }
        .more {
          display: inline-block;
          margin-top: 26px;
          font-weight: 600;
          color: var(--blue);
          text-decoration: none;
        }
        .more:hover { text-decoration: underline; }

        /* ── credits ── */
        .credits {
          background: var(--mid);
          color: var(--mist);
          position: relative;
          padding: 72px 0 0;
          overflow: hidden;
        }
        .credits h2 { font-family: var(--px); font-size: 14px; color: var(--sky); letter-spacing: .1em; }
        .cred-grid {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 48px;
          margin-top: 26px;
          max-width: 980px;
        }
        .role { font-size: 13px; color: rgba(219,241,250,.6); line-height: 1.9; }
        .role b { display: block; font-size: 17px; color: #fff; }
        .role a { color: var(--sky); }
        .credits p { max-width: 620px; font-size: 15.5px; }
        .credits p + p { margin-top: 14px; }
        .credits p a { color: var(--sky); }
        .ground { display: block; width: 100%; height: 112px; margin-top: 56px; }

        /* footer */
        .foot { background: var(--deep); color: var(--mist); font-size: 12.5px; padding: 14px 0; }
        .foot .wrap { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
        .foot a { color: var(--sky); margin-left: 16px; text-decoration: none; }
        .foot a:hover { text-decoration: underline; }

        /* ── responsive ── */
        @media (max-width: 900px) {
          .wrap { padding: 0 16px; }
          .hero { min-height: 0; }
          .hero .scene { height: 170px; min-height: 0; }
          .hero-grid { grid-template-columns: 1fr; gap: 26px; padding-top: 6px; padding-bottom: 150px; }
          .sub { font-size: 15px; margin-top: 14px; }
          .menu li:nth-child(n+4) { display: none; }
          .gets h2 { font-size: 16px; }
          .gets-grid, .cred-grid { grid-template-columns: 1fr; gap: 28px; }
          .top nav a { margin-left: 14px; font-size: 9px; }
        }
      `}</style>
    </div>
  )
}
