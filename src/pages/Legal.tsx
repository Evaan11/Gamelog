export function Legal() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-sm text-text-muted leading-relaxed">
      <h1 className="text-2xl font-bold text-text mb-6">Mentions légales & confidentialité</h1>

      <h2 className="text-lg font-semibold text-text mt-6 mb-2">Éditeur du site</h2>
      <p>
        Ce site est édité à titre personnel par un particulier (projet non professionnel).
        Pour toute question, contactez : <a href="mailto:trashpoubelle11@gmail.com" className="text-accent hover:underline">trashpoubelle11@gmail.com</a>.
      </p>

      <h2 className="text-lg font-semibold text-text mt-6 mb-2">Hébergement</h2>
      <p>
        Le site est hébergé par Vercel Inc. La base de données et l'authentification sont gérées par Supabase.
      </p>

      <h2 className="text-lg font-semibold text-text mt-6 mb-2">Données personnelles</h2>
      <p>
        Lors de la création d'un compte, nous collectons votre adresse email, un nom d'utilisateur
        et les informations que vous choisissez d'ajouter à votre profil (avatar, bio, identifiant Steam, etc.).
        Ces données sont utilisées uniquement pour le fonctionnement du site (compte, profil public, suivi de jeux).
        Elles ne sont jamais vendues ni partagées à des fins publicitaires.
      </p>
      <p className="mt-2">
        Vous pouvez à tout moment modifier ou supprimer votre compte et vos données depuis la page Paramètres.
      </p>

      <h2 className="text-lg font-semibold text-text mt-6 mb-2">Cookies</h2>
      <p>
        Ce site utilise uniquement des cookies/stockage technique nécessaires au fonctionnement
        (connexion, session). Aucun cookie publicitaire ou de tracking n'est utilisé.
      </p>

      <h2 className="text-lg font-semibold text-text mt-6 mb-2">Soutien du projet</h2>
      <p>
        Ce site est un projet gratuit développé par passion. Si vous souhaitez soutenir son développement,
        vous pouvez le faire via Patreon — sans aucune obligation et sans avantage exclusif lié à l'utilisation du site.
      </p>
    </div>
  )
}
