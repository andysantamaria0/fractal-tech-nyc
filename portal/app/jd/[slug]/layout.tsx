import '../jd-public.css'
import '../hiring-spa.css'

export default function JDPublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="jd-public hiring-spa">
      {children}
    </div>
  )
}
