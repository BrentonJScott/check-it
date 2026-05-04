export function SiteFooter() {
  return (
    <footer className="site-footer">
      <nav className="site-footer__links" aria-label="Footer">
        <a href="#">Privacy</a>
        <a
          href="https://github.com/BrentonJScott/check-it/issues"
          rel="noreferrer"
        >
          Help center
        </a>
        <a
          href="https://github.com/BrentonJScott/check-it#readme"
          rel="noreferrer"
        >
          Science
        </a>
      </nav>
      <p className="site-footer__copy">
        © {new Date().getFullYear()} Check-it · Posture reminders
      </p>
    </footer>
  );
}
