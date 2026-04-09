import { Link } from 'react-router-dom';
import { MicrophoneStage } from '@phosphor-icons/react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-300">
      {/* Header */}
      <header className="border-b border-zinc-800 px-4 sm:px-6 lg:px-8 py-4">
        <Link to="/" className="flex items-center gap-2 w-fit">
          <MicrophoneStage size={32} weight="duotone" className="text-[#FF007A]" />
          <span className="font-['Unbounded'] font-bold text-xl text-white">ArtistStage</span>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold font-['Unbounded'] text-white mb-2">Privacy Policy</h1>
        <p className="text-zinc-500 mb-12">Ultimo aggiornamento: 8 aprile 2026</p>

        <div className="space-y-10 text-zinc-400 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Titolare del trattamento</h2>
            <p>
              ArtistStage è una piattaforma gestita da un privato con sede in Italia.
              Per qualsiasi questione relativa alla privacy puoi contattarci all'indirizzo:
              <a href="mailto:support@artiststage.it" className="text-[#FF007A] ml-1">support@artiststage.it</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Dati che raccogliamo</h2>
            <p className="mb-3">Raccogliamo i seguenti dati personali:</p>
            <ul className="list-disc list-inside space-y-2">
              <li><strong className="text-zinc-300">Dati di registrazione:</strong> indirizzo email, nome/nome d'arte, foto profilo.</li>
              <li><strong className="text-zinc-300">Dati del profilo artista:</strong> categoria, descrizione, città, social network.</li>
              <li><strong className="text-zinc-300">Dati di utilizzo:</strong> live stream effettuate, messaggi in chat, transazioni di coin, prenotazioni.</li>
              <li><strong className="text-zinc-300">Dati di pagamento:</strong> le transazioni economiche sono gestite da Stripe; non memorizziamo dati di carta di credito.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Come utilizziamo i dati</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Fornire e migliorare i servizi della piattaforma.</li>
              <li>Consentire le comunicazioni tra artisti e venue.</li>
              <li>Elaborare pagamenti e cashout tramite Stripe.</li>
              <li>Inviare notifiche di sistema relative al tuo account.</li>
              <li>Rilevare e prevenire attività fraudolente.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Base giuridica del trattamento</h2>
            <p>
              Il trattamento dei dati avviene sulla base dell'esecuzione del contratto (fornitura del servizio),
              del legittimo interesse (sicurezza e prevenzione frodi) e, ove necessario, del consenso esplicito
              dell'interessato, in conformità al Regolamento UE 2016/679 (GDPR).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Servizi terzi</h2>
            <ul className="list-disc list-inside space-y-2">
              <li><strong className="text-zinc-300">Supabase:</strong> database, autenticazione e storage. I dati sono ospitati nell'UE.</li>
              <li><strong className="text-zinc-300">Stripe:</strong> elaborazione dei pagamenti. Consulta la privacy policy di Stripe su stripe.com.</li>
              <li><strong className="text-zinc-300">Google (OAuth):</strong> login con Google, se scelto dall'utente.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Conservazione dei dati</h2>
            <p>
              I dati vengono conservati per tutta la durata dell'account e per i successivi 12 mesi dalla
              cancellazione, salvo obblighi di legge che richiedano conservazione più lunga (es. dati fiscali: 10 anni).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. I tuoi diritti</h2>
            <p className="mb-3">In qualità di interessato hai il diritto di:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Accedere ai tuoi dati personali.</li>
              <li>Rettificare dati inesatti o incompleti.</li>
              <li>Richiedere la cancellazione ("diritto all'oblio").</li>
              <li>Opporsi al trattamento o richiederne la limitazione.</li>
              <li>Richiedere la portabilità dei dati.</li>
              <li>Proporre reclamo all'Autorità Garante per la protezione dei dati personali (Garante Privacy).</li>
            </ul>
            <p className="mt-3">
              Per esercitare questi diritti scrivi a{' '}
              <a href="mailto:support@artiststage.it" className="text-[#FF007A]">support@artiststage.it</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Cookie</h2>
            <p>
              ArtistStage utilizza cookie tecnici necessari al funzionamento della piattaforma (es. sessione di
              autenticazione). Non utilizziamo cookie di profilazione o di tracciamento a fini pubblicitari.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Modifiche a questa policy</h2>
            <p>
              Ci riserviamo il diritto di aggiornare questa Privacy Policy. In caso di modifiche sostanziali
              ti informeremo tramite email o tramite un avviso in-app.
            </p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-zinc-800 flex gap-6 text-sm">
          <Link to="/" className="text-zinc-500 hover:text-white transition-colors">← Torna alla home</Link>
          <Link to="/terms" className="text-zinc-500 hover:text-white transition-colors">Termini di servizio</Link>
        </div>
      </main>
    </div>
  );
}
