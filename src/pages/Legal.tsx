export function Legal() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-sm text-text-muted leading-relaxed">
      <h1 className="text-2xl font-bold text-text mb-6">Legal notice & privacy policy</h1>

      <h2 className="text-lg font-semibold text-text mt-6 mb-2">Site owner</h2>
      <p>
        This site is run by an individual as a personal, non-commercial project.
        For any question, contact: <a href="mailto:trashpoubelle11@gmail.com" className="text-accent hover:underline">trashpoubelle11@gmail.com</a>.
      </p>

      <h2 className="text-lg font-semibold text-text mt-6 mb-2">Hosting</h2>
      <p>
        The site is hosted by Vercel Inc. The database and authentication are managed by Supabase.
      </p>

      <h2 className="text-lg font-semibold text-text mt-6 mb-2">Personal data</h2>
      <p>
        When you create an account, we collect your email address, a username,
        and any information you choose to add to your profile (avatar, bio, Steam ID, etc.).
        This data is used only for the site to function (account, public profile, game tracking).
        It is never sold or shared for advertising purposes.
      </p>
      <p className="mt-2">
        You can edit or delete your account and data at any time from the Settings page.
      </p>

      <h2 className="text-lg font-semibold text-text mt-6 mb-2">Cookies</h2>
      <p>
        This site only uses technical cookies/storage required for it to work
        (login, session). No advertising or tracking cookies are used.
      </p>

      <h2 className="text-lg font-semibold text-text mt-6 mb-2">Supporting the project</h2>
      <p>
        This site is a free passion project. If you'd like to support its development,
        you can do so via Patreon — entirely optional, with no exclusive benefits tied to using the site.
      </p>
    </div>
  )
}
