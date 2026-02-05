import { colors as c, fonts as f } from '@/lib/engineer-design-tokens'

export default function WeeklyAppCounter({ count }: { count: number }) {
  return (
    <span style={{
      fontFamily: f.mono, fontSize: 11, fontWeight: 500,
      color: c.match, backgroundColor: c.honeyLight,
      padding: '6px 12px', borderRadius: 4,
      display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>
      {count} {count === 1 ? 'application' : 'applications'} this week
    </span>
  )
}
