import { colors as c } from '@/lib/engineer-design-tokens'

export default function QuestionnaireLoading() {
  const skel: React.CSSProperties = {
    backgroundColor: c.stoneLight,
    borderRadius: 4,
  }

  return (
    <div>
      <style>{`@keyframes ep-pulse { 0%,100% { opacity: .4 } 50% { opacity: 1 } } .ep-skel { animation: ep-pulse 1.5s ease-in-out infinite; }`}</style>
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
