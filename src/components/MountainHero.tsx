interface MountainHeroProps {
  minHeight?: string
  children?: React.ReactNode
}

export function MountainHero({ minHeight = '400px', children }: MountainHeroProps) {
  return (
    <div
      className="relative w-full overflow-hidden flex items-center justify-center"
      style={{ minHeight, background: 'linear-gradient(135deg, white, #DBF1FA)' }}
    >
      <svg
        viewBox="0 0 1000 600"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
      >
        {/* Layer 1 — back, Deep Ridge */}
        <polygon
          points="0,600 120,380 260,480 400,180 540,420 680,260 820,440 940,320 1000,420 1000,600"
          fill="#114574"
          opacity="0.6"
        />
        {/* Layer 2 — mid, Ridge Blue */}
        <polygon
          points="0,600 160,460 300,300 460,390 600,230 740,400 880,290 1000,400 1000,600"
          fill="#1D7CBE"
          opacity="0.75"
        />
        {/* Layer 3 — front, Sky */}
        <polygon
          points="0,600 100,520 240,400 380,460 520,360 660,470 800,380 920,490 1000,440 1000,600"
          fill="#82C7F6"
          opacity="0.85"
        />
      </svg>
      <div className="relative z-10 text-center px-4 text-white">
        {children}
      </div>
    </div>
  )
}
