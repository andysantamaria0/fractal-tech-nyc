import { colors as c } from '@/lib/engineer-design-tokens'

export default function QuestionnaireLoading() {
  const skel: React.CSSProperties = {
    backgroundColor: c.stoneLight,
    borderRadius: 4,
  }

  return (
    <div>
      <style>{`@keyframes ep-pulse { 0%,100% { opacity: .3 } 50% { opacity: .6 } } .ep-skel { animation: ep-pulse 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite; } .ep-skel:nth-child(2) { animation-delay: 0.15s; } .ep-skel:nth-child(3) { animation-delay: 0.3s; } .ep-skel:nth-child(4) { animation-delay: 0.45s; }`}</style>
      <div style={{ marginBottom: 32 }}>
        <div className="ep-skel" style={{ ...skel, width: 180, height: 28, marginBottom: 8 }} />
        <div className="ep-skel" style={{ ...skel, width: 440, height: 16 }} />
      </div>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ marginBottom: 40 }}>
          <div className="ep-skel" style={{ ...skel, width: 200, height: 20, marginBottom: 8 }} />
          <div className="ep-skel" style={{ ...skel, width: 320, height: 14, marginBottom: 20 }} />
          {[0, 1].map(j => (
            <div key={j} style={{ marginBottom: 20 }}>
              <div className="ep-skel" style={{ ...skel, width: 260, height: 14, marginBottom: 8 }} />
              <div className="ep-skel" style={{ ...skel, width: '100%', height: 72, borderRadius: 6 }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
