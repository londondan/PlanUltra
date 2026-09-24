import math, random

# Reference generator for PRD-031-home-D-retro.html (PRD-031 §4).
# Source of truth for the bitmap FONT, sprite grids (RUNNER, FLAG, CAR, PSIGN), icons and scene algorithm.
import os
def _load(p):
    return open(p).read() if os.path.exists(p) else '<svg viewBox="0 0 1 1"></svg>'
QR1 = _load('/home/claude/qr_park1.txt')   # placeholder QR art, mockup only
QR2 = _load('/home/claude/qr_park2.txt')

C = dict(mid='#02071E', deep='#114574', blue='#1D7CBE', sky='#82C7F6', mist='#DBF1FA', white='#FFFFFF')

# ── 5x7 bitmap font (only the glyphs we need) ──
FONT = {
 'A':["01110","10001","10001","11111","10001","10001","10001"],
 'C':["01111","10000","10000","10000","10000","10000","01111"],
 'E':["11111","10000","10000","11110","10000","10000","11111"],
 'G':["01111","10000","10000","10011","10001","10001","01111"],
 'I':["11111","00100","00100","00100","00100","00100","11111"],
 'K':["10001","10010","10100","11000","10100","10010","10001"],
 'L':["10000","10000","10000","10000","10000","10000","11111"],
 'N':["10001","11001","10101","10011","10001","10001","10001"],
 'O':["01110","10001","10001","10001","10001","10001","01110"],
 'P':["11110","10001","10001","11110","10000","10000","10000"],
 'R':["11110","10001","10001","11110","10100","10010","10001"],
 'T':["11111","00100","00100","00100","00100","00100","00100"],
 'U':["10001","10001","10001","10001","10001","10001","01110"],
 'V':["10001","10001","10001","10001","10001","01010","00100"],
 'W':["10001","10001","10001","10101","10101","10101","01010"],
 'Y':["10001","10001","01010","00100","00100","00100","00100"],
 '.':["00000","00000","00000","00000","00000","01100","01100"],
}

def text_rects(txt, ox, oy, fill):
    out, x = [], ox
    for ch in txt:
        if ch == ' ':
            x += 4; continue
        g = FONT[ch]
        for r, row in enumerate(g):
            for c, v in enumerate(row):
                if v == '1':
                    out.append(f'<rect x="{x+c}" y="{oy+r}" width="1" height="1" fill="{fill}"/>')
        x += 6
    return out, x - ox - 1

def pixel_text_svg(lines, label, shadow=C['deep']):
    """lines: [(text, colour)] -> crisp SVG, 1 unit = 1 pixel of the bitmap font, with a 1px drop shadow."""
    rects, maxw = [], 0
    for i, (t, col) in enumerate(lines):
        y = i * 10
        s, w = text_rects(t, 1, y + 1, shadow)
        f, _ = text_rects(t, 0, y, col)
        rects += s + f
        maxw = max(maxw, w + 1)
    h = len(lines) * 10 - 2
    return (f'<svg class="pxhead" viewBox="0 0 {maxw} {h}" role="img" aria-label="{label}" shape-rendering="crispEdges">'
            + "".join(rects) + '</svg>')

# ── sprites ──
def sprite(rows, ox, oy, pal):
    out = []
    for r, row in enumerate(rows):
        for c, ch in enumerate(row):
            if ch in pal:
                out.append(f'<rect x="{ox+c}" y="{oy+r}" width="1" height="1" fill="{pal[ch]}"/>')
    return out

RUNNER = ["...WW..", "...WW..", "..MMM..", ".M.MM.M", "...MM..", "..M..M.", ".M...M.", "M.....M"]
CAR = ["...WWWW....", "..WBBWBBW..", "WWWWWWWWWWW", "WWWWWWWWWWW", ".MM.....MM."]
PSIGN = ["WWWWWWW", "WBBBBWW", "WBWWWBW", "WBWWWBW", "WBBBBWW", "WBWWWWW", "WBWWWWW", "WWWWWWW", "...M...", "...M...", "...M..."]
FLAG = ["MWWW", "MWWW", "M...", "M...", "M...", "M..."]

# ── pixel mountain scene ──
def heights(cols, base, amps, seed):
    r = random.Random(seed)
    waves = [(a, r.uniform(0.6, 1.4) * f, r.uniform(0, 6.28)) for a, f in amps]
    return [max(1, round(base + sum(a * math.sin(2 * math.pi * f * c / cols + p) for a, f, p in waves))) for c in range(cols)]

def scene_svg(cols=180, rows=44, stars=True, runner=True, cls="scene"):
    out = []
    r = random.Random(7)
    if stars:
        for _ in range(70):
            x, y = r.randrange(cols), r.randrange(rows - 16)
            out.append(f'<rect x="{x}" y="{y}" width="1" height="1" fill="{r.choice([C["white"], C["sky"], C["sky"]])}" opacity="{r.choice([.5, .8, 1])}"/>')
        # moon
        for dy, row in enumerate(["..MMM..", ".MMMMM.", "MMSMMMM", "MMMMMSM", "MMMMMMM", ".MSMMM.", "..MMM.."]):
            for dx, ch in enumerate(row):
                if ch in 'MS':
                    out.append(f'<rect x="{14+dx}" y="{3+dy}" width="1" height="1" fill="{C["mist"] if ch == "M" else C["sky"]}"/>')
    back = heights(cols, 22, [(8, 2), (4, 5), (2, 11)], 3)
    midl = heights(cols, 15, [(6, 3), (3, 7), (1.5, 13)], 9)
    front = heights(cols, 8, [(3, 4), (2, 9), (1, 17)], 4)
    peak = max(back)
    for c in range(cols):
        h = back[c]
        out.append(f'<rect x="{c}" y="{rows-h}" width="1" height="{h}" fill="{C["deep"]}"/>')
        if h >= peak - 3:
            out.append(f'<rect x="{c}" y="{rows-h}" width="1" height="{min(2, h)}" fill="{C["mist"]}"/>')
    for c in range(cols):
        h = midl[c]
        out.append(f'<rect x="{c}" y="{rows-h}" width="1" height="{h}" fill="{C["blue"]}"/>')
    for c in range(cols):
        h = front[c]
        out.append(f'<rect x="{c}" y="{rows-h}" width="1" height="{h}" fill="{C["sky"]}"/>')
    if runner:
        pal = {'M': C['mid'], 'W': C['white'], 'B': C['blue']}
        rc = 46
        out += sprite(RUNNER, rc, rows - front[rc + 3] - 8, pal)
        fc = 30
        out += sprite(FLAG, fc, rows - front[fc] - 6, pal)
        cc = 108
        out += sprite(CAR, cc, rows - max(front[cc:cc + 10]) - 5, pal)
        pc = 121
        out += sprite(PSIGN, pc, rows - front[pc + 3] - 11, pal)
    return (f'<svg class="{cls}" viewBox="0 0 {cols} {rows}" preserveAspectRatio="xMidYMax slice" shape-rendering="crispEdges" aria-hidden="true">'
            + "".join(out) + '</svg>')

def icon(rows, pal, size=9):
    w = len(rows[0])
    return (f'<svg class="ico" viewBox="0 0 {w} {len(rows)}" shape-rendering="crispEdges" aria-hidden="true">'
            + "".join(sprite(rows, 0, 0, pal)) + '</svg>')

ICON_LINK = ["..........", ".BBBB.....", "B....B....", "B...BBBB..", "B..B.B..B.", ".BBBB...B.", "....B....B", "....B...B.", ".....BBBB."]
ICON_P = ["BBBBBBBBB", "B.......B", "B.MMMM..B", "B.M...M.B", "B.MMMM..B", "B.M.....B", "B.M.....B", "B.......B", "BBBBBBBBB"]
ICON_QR = ["MMM.M.MMM", "M.M..MM.M", "MMM.M.MMM", "...M.M...", "M.MM.MM.M", "...M..M..", "MMM.MM.M.", "M.M..M.MM", "MMM.M.M.M"]

SEL = ' class="sel"'
RACES = [
    ("LAUREL RIDGE 50", "Marshall, NC", "Oct 10", "50.2"),
    ("BROAD RIVER 100K", "Gaffney, SC", "Nov 7", "62.4"),
    ("TAMARACK LOOPS 50K", "Ellijay, GA", "Dec 5 · 8 loops", "32.8"),
    ("HOLLINS GAP 100", "Damascus, VA", "May 15", "101.8"),
]

def build():
    head = pixel_text_svg([("GIVE YOUR CREW", C['white']), ("ONE LINK.", C['sky'])], "Give your crew one link.")
    logo = pixel_text_svg([("PLANULTRA", C['white'])], "PlanUltra")
    menu = "\n".join(
        f'<li><a href="#"{SEL if i == 0 else ""}><span class="cur">►</span><span class="nm">{n}</span><span class="dots"></span><span class="mi">{m} MI</span><span class="meta">{p} · {d}</span></a></li>'
        for i, (n, p, d, m) in enumerate(RACES))
    pal = {'B': C['blue'], 'W': C['white'], 'M': C['mid']}
    ground = scene_svg(cols=180, rows=14, stars=False, runner=False, cls="ground")
    return f'''<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>PlanUltra</title>
<!-- Direction D: retro. Pixel-art scene and headline drawn as SVG rects (no font dependency), console type throughout.
     Ridge Light palette only. Example data is fictional. -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Press+Start+2P&display=swap" rel="stylesheet">
<style>
  :root{{--mid:#02071E;--deep:#114574;--blue:#1D7CBE;--sky:#82C7F6;--mist:#DBF1FA;
        --mono:"IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace;--px:"Press Start 2P",var(--mono)}}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{font:15px/1.65 var(--mono);color:var(--mid);background:var(--mid)}}
  a{{color:inherit}}
  .wrap{{max-width:1200px;margin:0 auto;padding:0 32px}}
  .px{{font-family:var(--px);letter-spacing:.02em;line-height:1.5}}
  svg{{image-rendering:pixelated}}

  /* ── hero: night scene ── */
  .hero{{position:relative;min-height:100vh;background:var(--mid);color:#fff;display:flex;flex-direction:column;overflow:hidden}}
  .hero .scene{{position:absolute;left:0;right:0;bottom:0;width:100%;height:42vh;min-height:250px}}
  .hero>.wrap{{width:100%}}
  .top{{display:flex;justify-content:space-between;align-items:center;padding:22px 0;position:relative;z-index:2}}
  .top .logo svg{{height:14px;width:auto;display:block}}
  .top nav a{{font-family:var(--px);font-size:10px;color:var(--sky);text-decoration:none;margin-left:22px}}
  .top nav a:hover{{color:#fff}}
  .hero-grid{{position:relative;z-index:2;display:grid;grid-template-columns:1fr 470px;gap:48px;align-items:start;padding-top:3vh;padding-bottom:30vh}}
  .pxhead{{display:block;width:100%;max-width:600px;height:auto}}
  .sub{{color:var(--mist);font-size:17px;max-width:470px;margin-top:22px}}
  .sub b{{color:var(--sky);font-weight:600}}
  .blink{{animation:blink 1s steps(1) infinite}} @keyframes blink{{50%{{opacity:0}}}}

  /* pixel window: stepped corners via box-shadow, no border-radius anywhere */
  .win{{background:var(--mid);border:4px solid var(--sky);box-shadow:0 0 0 4px var(--mid),8px 8px 0 4px var(--deep);position:relative}}
  .win-t{{background:var(--sky);color:var(--mid);font-family:var(--px);font-size:10px;padding:7px 10px;display:flex;justify-content:space-between}}
  .prompt{{display:flex;align-items:center;gap:8px;margin:14px 16px 10px;border-bottom:2px dashed rgba(130,199,246,.45);padding-bottom:8px}}
  .prompt span{{color:var(--sky);font-weight:700}}
  .prompt input{{flex:1;background:transparent;border:0;outline:none;color:#fff;font:500 15px var(--mono)}}
  .prompt input::placeholder{{color:rgba(219,241,250,.5)}}
  .menu{{list-style:none;padding:4px 0 8px}}
  .menu a{{display:grid;grid-template-columns:18px auto 1fr auto;column-gap:8px;padding:7px 16px;text-decoration:none;color:#fff}}
  .menu .cur{{color:var(--sky);visibility:hidden}}
  .menu a:hover .cur,.menu a:focus .cur,.menu a.sel .cur{{visibility:visible}}
  .menu a:hover,.menu a:focus,.menu a.sel{{background:rgba(29,124,190,.35);outline:none}}
  .menu .nm{{font-weight:600}}
  .menu .dots{{border-bottom:2px dotted rgba(130,199,246,.45);margin-bottom:7px}}
  .menu .mi{{color:var(--sky);font-weight:600}}
  .menu .meta{{grid-column:2/5;font-size:12.5px;color:rgba(219,241,250,.6)}}
  .win-foot{{border-top:2px dashed rgba(130,199,246,.45);padding:14px 16px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}}
  .win-foot small{{font-size:12.5px;color:rgba(219,241,250,.7)}}
  .saved{{padding:0 16px 14px;font-size:12.5px;color:rgba(219,241,250,.7)}} .saved a{{color:var(--sky)}}

  /* pixel button */
  .pbtn{{display:inline-block;font-family:var(--px);font-size:11px;color:#fff;background:var(--blue);text-decoration:none;padding:12px 14px 14px;
        box-shadow:inset -4px -4px 0 var(--deep),inset 4px 4px 0 #4d9fd6,0 0 0 3px var(--mid),0 0 0 5px var(--sky)}}
  .pbtn:hover{{background:#2a8fd4}} .pbtn:active{{transform:translateY(2px);box-shadow:inset 4px 4px 0 var(--deep),0 0 0 3px var(--mid),0 0 0 5px var(--sky)}}

  /* ── section 2 ── */
  .gets{{background:var(--mist);position:relative;padding:72px 0 90px}}
  .gets h2{{font-family:var(--px);font-size:22px;line-height:1.4;color:var(--mid)}}
  .gets .lead{{max-width:680px;margin-top:14px;color:var(--deep)}}
  .gets-grid{{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:52px;margin-top:40px;align-items:start}}
  .sheet{{background:#fff;border:4px solid var(--mid);box-shadow:8px 8px 0 var(--deep);font-size:13.5px}}
  .sheet-t{{background:var(--mid);color:var(--sky);font-family:var(--px);font-size:9px;padding:8px 12px;display:flex;justify-content:space-between}}
  .sh{{padding:14px 16px;border-bottom:4px solid var(--mid)}}
  .sh b{{font-size:18px}} .sh div{{color:var(--deep);font-size:12.5px}}
  .url{{display:inline-block;margin-top:8px;background:var(--mid);color:var(--sky);padding:3px 8px;font-size:12.5px}}
  .st{{display:flex;gap:14px;padding:12px 16px;border-bottom:2px solid var(--sky)}}
  .st .b{{flex:1}}
  .mb{{background:var(--sky);color:var(--mid);font-weight:700;font-size:11.5px;padding:1px 6px;margin-right:6px}}
  .st .nm{{font-weight:700;font-size:14.5px}} .pt{{font-size:12px;color:var(--deep);margin:3px 0}}
  .dir{{display:inline-block;font-weight:600;color:var(--blue);text-decoration:underline;text-underline-offset:3px}}
  .nt{{color:var(--deep);font-size:12.5px;margin-top:3px}}
  .q{{width:66px;font-size:9.5px;line-height:1.3;color:var(--deep);text-align:center}} .q svg{{width:66px;height:66px;display:block;color:var(--mid)}}
  .sk{{padding:7px 16px 7px 34px;font-size:12px;color:var(--deep);background:repeating-linear-gradient(90deg,#f3f9fc 0 8px,#fff 8px 16px);border-bottom:2px solid var(--sky)}}
  .n{{display:inline-block;font-family:var(--px);font-size:9px;background:var(--blue);color:#fff;padding:4px 5px 3px;margin-right:6px;vertical-align:1px}}
  .items{{list-style:none;display:flex;flex-direction:column;gap:22px}}
  .item{{background:#fff;border:4px solid var(--mid);padding:16px 18px;display:grid;grid-template-columns:44px 1fr;gap:4px 14px;box-shadow:6px 6px 0 var(--sky)}}
  .item .ico{{width:36px;height:36px;grid-row:1/3}}
  .item h3{{font-family:var(--px);font-size:11px;line-height:1.6}}
  .item p{{font-size:14px;color:var(--deep)}}
  .item .fine{{grid-column:2;font-size:12.5px;color:var(--deep);opacity:.8}}
  .more{{display:inline-block;margin-top:26px;font-weight:600;color:var(--blue)}}

  /* ── credits ── */
  .credits{{background:var(--mid);color:var(--mist);position:relative;padding:72px 0 0;overflow:hidden}}
  .credits h2{{font-family:var(--px);font-size:14px;color:var(--sky);letter-spacing:.1em}}
  .cred-grid{{display:grid;grid-template-columns:260px 1fr;gap:48px;margin-top:26px;max-width:980px}}
  .role{{font-size:13px;color:rgba(219,241,250,.6);line-height:1.9}} .role b{{display:block;font-size:17px;color:#fff}}
  .role a{{color:var(--sky)}}
  .credits p{{max-width:620px;font-size:15.5px}} .credits p+p{{margin-top:14px}} .credits p a{{color:var(--sky)}}
  .credits .ground{{display:block;width:100%;height:112px;margin-top:56px}}
  .foot{{background:var(--deep);color:var(--mist);font-size:12.5px;padding:14px 0}}
  .foot .wrap{{display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px}} .foot a{{color:var(--sky);margin-left:16px}}

  @media(max-width:900px){{
    .wrap{{padding:0 16px}}
    .hero{{min-height:0}} .hero .scene{{height:170px;min-height:0}}
    .hero-grid{{grid-template-columns:1fr;gap:26px;padding-top:6px;padding-bottom:150px}}
    .sub{{font-size:15px;margin-top:14px}}
    .menu li:nth-child(n+4){{display:none}}
    .gets h2{{font-size:16px}}
    .gets-grid,.cred-grid{{grid-template-columns:1fr;gap:28px}}
    .top nav a{{margin-left:14px;font-size:9px}}
  }}
</style></head>
<body>
<section class="hero">
  <div class="wrap top"><a class="logo" href="#">{logo}</a><nav><a href="#gets">HOW IT WORKS</a><a href="#">FAQ</a></nav></div>
  <div class="wrap hero-grid">
    <div>
      <h1>{head}</h1>
      <p class="sub">A link that gets them to <b>every crew stop</b>, and a printout that still works when there's no signal.<span class="blink">_</span></p>
    </div>
    <div class="win">
      <div class="win-t"><span>SELECT RACE</span><span>4 IN LIBRARY</span></div>
      <label class="prompt"><span>&gt;</span><input type="search" placeholder="search races" aria-label="Search races"></label>
      <ul class="menu">{menu}</ul>
      <div class="win-foot"><small>Not listed? Bring the GPX file.</small><a class="pbtn" href="#">+ ADD RACE</a></div>
      <div class="saved">SAVED ON THIS DEVICE: <a href="#">Laurel Ridge 50</a></div>
    </div>
  </div>
  {scene_svg()}
</section>

<section class="gets" id="gets">
  <div class="wrap">
    <h2>WHAT YOUR CREW GETS</h2>
    <p class="lead">PlanUltra builds an overview of the race with every crew stop in order, plus where and how to park. Each stop has a QR code for directions, with the coordinates printed underneath for when there&#39;s no signal.</p>
    <div class="gets-grid">
      <div class="sheet">
        <div class="sheet-t"><span>CREW SHEET</span><span>PAGE 1/2</span></div>
        <div class="sh"><b>Laurel Ridge 50</b><div>Sat Oct 10 2026 · 6:00 AM EDT start · 50.2 mi · 4 crew stops</div><span class="url"><span class="n">1</span>planultrarace.com/crew/k7Qm2x</span></div>
        <div class="st"><div class="b"><span class="mb">MI 0.0</span><span class="nm">Start · Laurel Valley Lodge</span><div class="pt">[Parking lot]</div><a class="dir" href="#"><span class="n">2</span>Directions to crew parking</a><div class="nt">Lot behind the lodge fills by 5:15. Overflow: gravel field on Hwy 208.</div></div><div class="q">{QR1}35.8871<br>-82.7318</div></div>
        <div class="sk">crew can't reach: Bear Gap 4.2 · Laurel Fork 7.9 → next crew stop Ridge Road (+13.3 mi)</div>
        <div class="st"><div class="b"><span class="mb">MI 13.3</span><span class="nm">Ridge Road</span><div class="pt">[Trailhead]</div><a class="dir" href="#">Directions to crew parking</a><div class="nt">Upper lot only. Last two miles are gravel.</div></div><div class="q"><span class="n" style="margin:0 0 4px">3</span>{QR2}35.9403<br>-82.6617</div></div>
      </div>
      <div>
        <ul class="items">
          <li class="item">{icon(ICON_LINK, pal)}<h3><span class="n">1</span>A LINK YOU CAN TEXT</h3><p>It opens on any phone, with no app or account.</p></li>
          <li class="item">{icon(ICON_P, pal)}<h3><span class="n">2</span>DIRECTIONS TO PARKING</h3><p>Not just the aid station, with notes on the lot, the walk in, or the shuttle.</p></li>
          <li class="item">{icon(ICON_QR, pal)}<h3><span class="n">3</span>A PRINTOUT FOR NO SIGNAL</h3><p>Every stop has a QR code for your maps app.</p><p class="fine">Coordinates are printed underneath for an offline map.</p></li>
        </ul>
        <a class="more" href="#">&gt; open the full example_</a>
      </div>
    </div>
  </div>
</section>

<section class="credits">
  <div class="wrap">
    <h2>CREDITS</h2>
    <div class="cred-grid">
      <div class="role"><b>Dan James</b>design, code, parking scouting<br><a href="https://www.linkedin.com/in/daniel-james-45863320/">LinkedIn</a> · <a href="https://github.com/londondan/PlanUltra">GitHub</a><br><a href="mailto:danrjames@gmail.com">danrjames@gmail.com</a></div>
      <div>
        <p>I'm a product manager and ultrarunner. I built PlanUltra after a DNF at Grindstone 100, wanting to do better by my crew. Race websites list the aid stations. Crews need to know where to park and which stops to skip.</p>
        <p>It's a hobby project: free, no ads, no accounts, and the code is on <a href="https://github.com/londondan/PlanUltra">GitHub</a>. If a parking spot is wrong, <a href="mailto:danrjames@gmail.com">email me</a> and I'll fix it.</p>
      </div>
    </div>
  </div>
  {ground}
</section>
<footer class="foot"><div class="wrap"><span>PLANULTRA · FREE · OPEN SOURCE</span><span><a href="#">FAQ</a><a href="https://github.com/londondan/PlanUltra">GITHUB</a></span></div></footer>
</body></html>'''

if __name__ == '__main__':
    open(os.environ.get('OUT', 'PRD-031-home-D-retro.html'), 'w').write(build())
print('ok')
