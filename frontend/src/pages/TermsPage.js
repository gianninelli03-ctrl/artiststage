import { Link } from 'react-router-dom';
import { MicrophoneStage } from '@phosphor-icons/react';

export default function TermsPage() {
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
        <h1 className="text-4xl font-bold font-['Unbounded'] text-white mb-2">Termini di Servizio</h1>
        <p className="text-zinc-500 mb-12">Ultimo aggiornamento: 8 aprile 2026</p>

        <div className="space-y-10 text-zinc-400 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Accettazione dei termini</h2>
            <p>
              Utilizzando ArtistStage accetti integralmente i presenti Termini di Servizio. Se non li accetti,
              non puoi utilizzare la piattaforma. L'uso continuato del servizio dopo eventuali modifiche
              costituisce accettazione dei termini aggiornati.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Descrizione del servizio</h2>
            <p>
              ArtistStage è una piattaforma che mette in contatto artisti e venue, permettendo la gestione
              di prenotazioni, live streaming e un sistema di monetizzazione tramite coin virtuali.
              La piattaforma è disponibile a utenti residenti in Italia e nell'Unione Europea.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Account e registrazione</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Devi avere almeno 18 anni per registrarti.</li>
              <li>Sei responsabile della sicurezza delle tue credenziali.</li>
              <li>Non puoi cedere o condividere il tuo account con terzi.</li>
              <li>Ci riserviamo il diritto di sospendere account che violano questi termini.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Coin e pagamenti</h2>
            <p className="mb-3">
              ArtistStage utilizza un sistema di valuta virtuale denominata "Coin":
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Il prezzo dei Coin varia in base al pacchetto acquistato; il valore di riscatto per gli artisti è di €0,014 lordi per Coin (€0,0098 netti dopo la commissione di piattaforma del 30%).</li>
              <li>I Coin acquistati non sono rimborsabili, salvo quanto previsto dalla normativa sul diritto di recesso.</li>
              <li>I Coin possono essere donati agli artisti durante le live o inviati tramite la piattaforma.</li>
              <li>I Coin non hanno valore legale al di fuori della piattaforma e non possono essere scambiati tra utenti al di fuori del sistema.</li>
              <li>I pagamenti sono elaborati da Stripe Inc. e soggetti ai relativi termini.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Cashout per artisti</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Gli artisti possono richiedere il cashout dei Coin ricevuti una volta raggiunto il minimo di €20,00 netti.</li>
              <li>ArtistStage trattiene una commissione del 30% sull'importo lordo (€0,014 per Coin), riconoscendo all'artista €0,0098 netti per Coin.</li>
              <li>I cashout vengono elaborati manualmente entro 5-10 giorni lavorativi.</li>
              <li>Il cashout è soggetto a verifica dell'identità e può essere rifiutato in caso di attività sospetta.</li>
              <li>Gli artisti sono responsabili della corretta dichiarazione fiscale dei proventi ricevuti.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Live streaming</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>L'artista è responsabile del contenuto trasmesso in live.</li>
              <li>È vietato trasmettere contenuti illegali, violenti, sessualmente espliciti o che violino diritti di terzi.</li>
              <li>ArtistStage si riserva il diritto di interrompere live che violino questi termini senza preavviso.</li>
              <li>La piattaforma non garantisce la qualità o la disponibilità del servizio di streaming in ogni momento.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Prenotazioni</h2>
            <p>
              ArtistStage facilita il contatto tra artisti e venue ma non è parte del contratto di prestazione
              artistica. Le condizioni economiche, logistiche e contrattuali sono stabilite direttamente tra
              le parti. ArtistStage non è responsabile per eventuali controversie tra artisti e venue.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Proprietà intellettuale</h2>
            <p>
              Caricando contenuti su ArtistStage (foto, testi, video) concedi alla piattaforma una licenza
              non esclusiva, gratuita e mondiale per visualizzarli nell'ambito del servizio. Rimani il
              titolare dei diritti sui tuoi contenuti.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Limitazione di responsabilità</h2>
            <p>
              ArtistStage è fornita "così com'è". Non garantiamo la disponibilità continua del servizio.
              Non siamo responsabili per perdita di dati, mancati guadagni o danni indiretti derivanti
              dall'uso della piattaforma, nei limiti consentiti dalla legge applicabile.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Legge applicabile e foro competente</h2>
            <p>
              I presenti Termini sono regolati dalla legge italiana. Per qualsiasi controversia è competente
              in via esclusiva il Tribunale di Milano, salvo diversa disposizione inderogabile di legge a
              tutela del consumatore.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Contatti</h2>
            <p>
              Per domande sui presenti Termini scrivi a{' '}
              <a href="mailto:support@artiststage.it" className="text-[#FF007A]">support@artiststage.it</a>.
            </p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-zinc-800 flex gap-6 text-sm">
          <Link to="/" className="text-zinc-500 hover:text-white transition-colors">← Torna alla home</Link>
          <Link to="/privacy" className="text-zinc-500 hover:text-white transition-colors">Privacy Policy</Link>
        </div>
      </main>
    </div>
  );
}
