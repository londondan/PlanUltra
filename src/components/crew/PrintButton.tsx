'use client'

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print-hide"
      style={{
        background: 'transparent',
        border: '1px solid rgba(130,199,246,0.4)',
        color: '#82C7F6',
        fontSize: 12,
        padding: '5px 14px',
        borderRadius: 6,
        cursor: 'pointer',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
      }}
    >
      Print crew sheet
    </button>
  )
}
