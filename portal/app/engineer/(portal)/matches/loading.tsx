import { colors as c } from '@/lib/engineer-design-tokens'

export default function MatchesLoading() {
  const skel: React.CSSProperties = {
    backgroundColor: c.stoneLight,
    borderRadius: 4,
  }

  return (
    <div>
      <style>{`@keyframes ep-pulse { 0%,100% { opacity: .4 } 50% { opacity: 1 } } .ep-skel { animation: ep-pulse 1.5s ease-in-out infinite; }`}</style>
      <div style={{ marginBottom: 32 }}>
        <div className="ep-skel" style={{ ...skel, width: 200, height: 28, marginBottom: 8 }} />
        <div className="ep-skel" style={{ ...skel, width: 400, height: 16 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ backgroundColor: c.fog, border: `1px solid ${c.stoneLight}`, borderRadius: 8, padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="ep-skel" style={{ ...skel, width: 220, height: 20, marginBottom: 6 }} />
                <div className="ep-skel" style={{ ...skel, width: 140, height: 14 }} />
              </div>
              <div className="ep-skel" style={{ ...skel, width: 50, height: 28 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
