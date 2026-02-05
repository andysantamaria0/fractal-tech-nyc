import { colors as c } from '@/lib/engineer-design-tokens'

export default function ProfileLoading() {
  const skel: React.CSSProperties = {
    backgroundColor: c.stoneLight,
    borderRadius: 4,
  }

  return (
    <div>
      <style>{`@keyframes ep-pulse { 0%,100% { opacity: .3 } 50% { opacity: .6 } } .ep-skel { animation: ep-pulse 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite; } .ep-skel:nth-child(2) { animation-delay: 0.15s; } .ep-skel:nth-child(3) { animation-delay: 0.3s; } .ep-skel:nth-child(4) { animation-delay: 0.45s; }`}</style>
      <div style={{ marginBottom: 32 }}>
        <div className="ep-skel" style={{ ...skel, width: 160, height: 28 }} />
      </div>
      <div style={{ backgroundColor: c.fog, border: `1px solid ${c.stoneLight}`, borderRadius: 8, padding: '28px 32px' }}>
        <div className="ep-skel" style={{ ...skel, width: 200, height: 24, marginBottom: 8 }} />
        <div className="ep-skel" style={{ ...skel, width: 260, height: 14, marginBottom: 24 }} />
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="ep-skel" style={{ ...skel, width: 80, height: 24 }} />
          ))}
        </div>
        <div style={{ borderTop: `1px solid ${c.stoneLight}`, paddingTop: 24 }}>
          <div className="ep-skel" style={{ ...skel, width: 60, height: 12, marginBottom: 16 }} />
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${c.stoneLight}` }}>
              <div className="ep-skel" style={{ ...skel, width: 80, height: 14 }} />
              <div className="ep-skel" style={{ ...skel, width: 200, height: 14 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
