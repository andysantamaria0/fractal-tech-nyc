import { colors as c } from '@/lib/engineer-design-tokens'

export default function DashboardLoading() {
  const skel: React.CSSProperties = {
    backgroundColor: c.stoneLight,
    borderRadius: 4,
  }

  return (
    <div>
      <style>{`@keyframes ep-pulse { 0%,100% { opacity: .4 } 50% { opacity: 1 } } .ep-skel { animation: ep-pulse 1.5s ease-in-out infinite; }`}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div className="ep-skel" style={{ ...skel, width: 140, height: 28 }} />
        <div className="ep-skel" style={{ ...skel, width: 180, height: 28 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ backgroundColor: c.fog, border: `1px solid ${c.stoneLight}`, borderRadius: 8, padding: '24px 32px', textAlign: 'center' }}>
            <div className="ep-skel" style={{ ...skel, width: 60, height: 32, margin: '0 auto 8px' }} />
            <div className="ep-skel" style={{ ...skel, width: 80, height: 12, margin: '0 auto' }} />
          </div>
        ))}
      </div>
      <div className="ep-skel" style={{ ...skel, width: '100%', height: 120 }} />
    </div>
  )
}
