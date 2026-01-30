import Link from 'next/link'

export default function LandingPage() {
  return (
    <>
      <header className="portal-header">
        <div className="header-content">
          <Link href="/" className="logo">Fractal Partners</Link>
          <nav>
            <ul className="nav-links">
              <li><Link href="/login">Log In</Link></li>
              <li><Link href="/signup" className="btn-secondary">Sign Up</Link></li>
            </ul>
          </nav>
        </div>
      </header>

      <main>
        <div className="container">
          <section className="landing-hero">
            <div className="hero-window">
              <div className="hero-title-bar">PARTNERS.FRACTALTECH.NYC</div>
              <div className="hero-content">
                <h1>Your Window Into the Fractal Cohort</h1>
                <p>
                  Track real-time engineering progress, discover available engineers,
                  and submit feature requests — all in one place.
                </p>
                <div className="landing-ctas">
                  <Link href="/signup" className="btn-primary">Get Started</Link>
                  <Link href="/login" className="btn-secondary">Log In</Link>
                </div>
              </div>
            </div>
          </section>

          <section className="landing-features">
            <div className="window">
              <div className="window-title">Cohort Overview</div>
              <div className="window-content">
                <p>See what week of the cohort we&apos;re in, how many engineers are building, and what they&apos;re focused on this week.</p>
              </div>
            </div>

            <div className="window">
              <div className="window-title">GitHub Activity</div>
              <div className="window-content">
                <p>Real-time feed of pull requests, commits, and code reviews across the Fractal org. Watch engineers ship.</p>
              </div>
            </div>

            <div className="window">
              <div className="window-title">Engineer Cycles</div>
              <div className="window-content">
                <p>Browse available engineers and submit feature requests. Get real engineering work done by proven builders.</p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="portal-footer">
        <div className="container">
          <div className="footer-text">
            <p><a href="https://fractaltech.nyc">fractaltech.nyc</a></p>
          </div>
        </div>
      </footer>
    </>
  )
}
