/**
 * German demo content.
 *
 * Everything here is invented for demonstration. No real person, family,
 * company or event is described, and no text is taken from an existing
 * publication. Demo authors are flagged `isDemo` and the article page prints a
 * visible notice, so nothing can be mistaken for reporting.
 *
 * Article lengths vary on purpose (≈250 to ≈1200 words) so the ad density
 * engine can be seen doing its job across the range.
 */

export interface SeedBlock {
  type: 'paragraph' | 'heading2' | 'heading3' | 'quote' | 'callout' | 'list'
  text?: string
  lead?: boolean
  attribution?: string
  title?: string
  variant?: 'info' | 'context' | 'warning'
  items?: string[]
  ordered?: boolean
}

export interface SeedPost {
  title: string
  subtitle: string
  excerpt: string
  slug: string
  category: string
  author: string
  tags: string[]
  featured?: boolean
  editorsPick?: boolean
  daysAgo: number
  views: number
  blocks: SeedBlock[]
}

export const SEED_CATEGORIES = [
  {
    name: 'Leben & Schicksale',
    slug: 'leben-schicksale',
    description: 'Wendepunkte, Brüche und Neuanfänge — Geschichten von Menschen, deren Leben eine andere Richtung nahm.',
    intro:
      'Manche Leben verlaufen in geraden Linien. Die meisten nicht. Hier erzählen wir von den Momenten, in denen alles kippt — und von dem, was danach kommt.',
    order: 1,
  },
  {
    name: 'Liebe & Beziehungen',
    slug: 'liebe-beziehungen',
    description: 'Über das Zusammenkommen, das Bleiben und das Auseinandergehen.',
    intro:
      'Wie Menschen einander finden, wie sie einander halten und woran es liegt, wenn es nicht mehr geht. Ohne Ratgeberton.',
    order: 2,
  },
  {
    name: 'Familie',
    slug: 'familie',
    description: 'Eltern, Kinder, Geschwister — und alles, was zwischen den Generationen liegt.',
    intro:
      'Familie ist die Beziehung, die man sich nicht aussucht. Genau deshalb sind die Geschichten darüber so aufschlussreich.',
    order: 3,
  },
  {
    name: 'Menschen & Gesellschaft',
    slug: 'menschen-gesellschaft',
    description: 'Wie wir zusammenleben — Nachbarschaft, Arbeit, Zugehörigkeit.',
    intro:
      'Gesellschaft ist kein abstraktes Wort. Sie zeigt sich im Treppenhaus, in der Werkstatt, an der Bushaltestelle.',
    order: 4,
  },
  {
    name: 'Unglaubliche Geschichten',
    slug: 'unglaubliche-geschichten',
    description: 'Begebenheiten, die man kaum glauben würde — und doch erzählt werden.',
    intro:
      'Zufälle, die zu groß wirken für einen Zufall. Wir erzählen sie ruhig und ordnen ein, was sich einordnen lässt.',
    order: 5,
  },
  {
    name: 'Tiere',
    slug: 'tiere',
    description: 'Was Tiere uns über Bindung, Instinkt und Geduld beibringen.',
    intro:
      'Geschichten über Hunde, Katzen, Pferde, Krähen — und über die Menschen, die mit ihnen leben.',
    order: 6,
  },
  {
    name: 'Reisen & Orte',
    slug: 'reisen-orte',
    description: 'Orte, die etwas mit Menschen machen.',
    intro:
      'Kein Reiseführer. Sondern Geschichten über Landschaften, Dörfer und Stadtviertel, die sich einprägen.',
    order: 7,
  },
]

export const SEED_AUTHORS = [
  {
    name: 'Marlene Ahrens',
    slug: 'marlene-ahrens',
    role: 'Redaktionsleitung',
    bio: 'Schreibt über Familien und Lebensläufe. Demo-Profil zur Veranschaulichung der Redaktionsstruktur.',
  },
  {
    name: 'Jonas Feldt',
    slug: 'jonas-feldt',
    role: 'Redakteur',
    bio: 'Interessiert sich für Orte, Handwerk und ungewöhnliche Berufe. Demo-Profil.',
  },
  {
    name: 'Sibel Yalçın',
    slug: 'sibel-yalcin',
    role: 'Redakteurin',
    bio: 'Berichtet über Nachbarschaft, Zusammenleben und Tiere. Demo-Profil.',
  },
]

const p = (text: string, lead = false): SeedBlock => ({ type: 'paragraph', text, lead })
const h2 = (text: string): SeedBlock => ({ type: 'heading2', text })
const h3 = (text: string): SeedBlock => ({ type: 'heading3', text })
const quote = (text: string, attribution?: string): SeedBlock => ({ type: 'quote', text, attribution })
const callout = (title: string, text: string, variant: SeedBlock['variant'] = 'context'): SeedBlock => ({
  type: 'callout',
  title,
  text,
  variant,
})
const list = (items: string[], ordered = false): SeedBlock => ({ type: 'list', items, ordered })

export const SEED_POSTS: SeedPost[] = [
  // ---------------------------------------------------------------- LONG ---
  {
    title: 'Zweiundvierzig Jahre in derselben Werkstatt — und dann kam der Brief',
    subtitle:
      'Ein Uhrmacher aus dem Bergischen Land wollte nie etwas anderes machen. Als seine Straße saniert wurde, musste er entscheiden, was ein Beruf eigentlich wert ist.',
    excerpt:
      'Ein Uhrmacher, der zweiundvierzig Jahre lang in derselben Werkstatt saß, bekommt einen Brief von der Stadt. Was danach passiert, sagt viel darüber, wie wir mit alten Berufen umgehen.',
    slug: 'zweiundvierzig-jahre-werkstatt-brief',
    category: 'leben-schicksale',
    author: 'marlene-ahrens',
    tags: ['handwerk', 'beruf', 'wandel', 'kleinstadt'],
    featured: true,
    editorsPick: true,
    daysAgo: 1,
    views: 4820,
    blocks: [
      p(
        'Die Werkstatt liegt hinter einer Tür, die man leicht übersieht. Zwei Stufen hinunter, ein Vorhang aus schwerem Stoff, dahinter ein Raum von vielleicht zwölf Quadratmetern. Es riecht nach Öl und altem Papier. An der Wand hängen dreiundzwanzig Uhren, und alle gehen unterschiedlich.',
        true,
      ),
      p(
        'Das sei Absicht, sagt der Mann am Werktisch. Wenn alle gleich gingen, würde er nicht hören, wenn eine stehen bleibt.',
      ),
      p(
        'Zweiundvierzig Jahre hat er in diesem Raum gearbeitet. Er hat ihn 1983 übernommen, von einem Meister, der ihm nichts erklärte, was man auch selbst herausfinden konnte. Der erste Satz an ihn habe gelautet: „Setz dich hin und schau zu." Der zweite kam drei Wochen später.',
      ),
      h2('Ein Brief mit vier Wochen Frist'),
      p(
        'Im vergangenen Frühjahr lag ein Schreiben der Stadtverwaltung im Briefkasten. Die Straße werde grundhaft saniert, hieß es darin, das Gebäude sei betroffen, die Erdgeschossflächen würden neu geordnet. Er möge sich innerhalb von vier Wochen äußern, ob er an einer Ersatzfläche interessiert sei.',
      ),
      p(
        'Vier Wochen. Für eine Entscheidung, die er seit vierzig Jahren nicht getroffen hatte, weil sie sich nie gestellt hatte.',
      ),
      quote(
        'Ich habe den Brief dreimal gelesen und dann in die Schublade gelegt. Danach habe ich eine Uhr repariert, die seit Wochen liegen geblieben war. Das hat geholfen.',
      ),
      p(
        'Die angebotene Ersatzfläche lag am Rand eines Gewerbegebiets, mit Parkplatz und größerem Schaufenster. Betriebswirtschaftlich sei das die bessere Lösung gewesen, sagt er. Er habe sie sich angesehen, sei durch den leeren Raum gelaufen und habe gemerkt, dass er dort nicht hören würde, wenn eine Uhr stehen bleibt.',
      ),
      h2('Was ein Ort mit einem Beruf macht'),
      p(
        'Es gibt eine Vorstellung davon, dass Handwerk ortsunabhängig sei. Werkzeug einpacken, woanders auspacken, weitermachen. Bei genauerem Hinsehen stimmt das selten.',
      ),
      p(
        'Kundschaft, die über Jahrzehnte gewachsen ist, kommt nicht mit, wenn der Weg fünfzehn Minuten länger wird. Die Frau, die zweimal im Jahr die Uhr ihres Vaters bringt, kommt vorbei, weil sie ohnehin in der Straße ist. Fällt der Anlass weg, fällt oft auch der Besuch weg.',
      ),
      callout(
        'Zum Einordnen',
        'Kleine Reparaturbetriebe leben von Laufkundschaft und Gewohnheit. Wenn ein Standort wegfällt, verschwindet häufig nicht nur eine Adresse, sondern die Selbstverständlichkeit, mit der ein Handwerk genutzt wird.',
      ),
      p(
        'Er habe das lange unterschätzt, sagt er. Als junger Mann habe er geglaubt, es komme nur auf die Arbeit an. Heute wisse er, dass eine Werkstatt auch ein Versprechen ist: Hier ist jemand. Hier war schon immer jemand.',
      ),
      h2('Die Entscheidung'),
      p(
        'Nach drei Wochen rief er bei der Stadt an. Er habe gefragt, ob es möglich sei, während der Bauzeit im Gebäude zu bleiben — mit Staub, mit Lärm, mit allem, was dazugehört. Die Sachbearbeiterin habe zunächst gezögert und dann zurückgerufen.',
      ),
      p(
        'Es war möglich. Nicht als reguläre Lösung, sondern als Ausnahme, mit einer Vereinbarung über acht Monate und einer Klausel, die er selbst als „nicht besonders freundlich" bezeichnet. Er hat unterschrieben.',
      ),
      h3('Acht Monate Baustelle'),
      p(
        'Die Sanierung begann im Juli. Seitdem arbeitet er zwischen Gerüsten. An manchen Tagen ist der Zugang nur über eine Holzrampe möglich. Zwei Stammkunden sind nicht mehr gekommen, sagt er, und er verstehe das.',
      ),
      p(
        'Dafür kommen andere. Eine Nachbarin bringt seit dem Sommer regelmäßig Kaffee vorbei. Ein Vater kam mit seinem Sohn, weil der wissen wollte, wie eine mechanische Uhr funktioniert. Der Junge sei zwei Stunden geblieben.',
      ),
      quote(
        'Wenn ich in das Gewerbegebiet gezogen wäre, hätte niemand gewusst, dass es mich noch gibt. Hier stolpert man über mich.',
      ),
      h2('Was danach kommt'),
      p(
        'Die Frage, die er sich am längsten nicht gestellt hat, ist die nach dem Ende. Er ist siebenundsechzig. Ein Nachfolger ist nicht in Sicht; die nächste Uhrmacherschule liegt weit weg, und die wenigen Absolventen gehen zu Herstellern, nicht in eine Werkstatt hinter einem Vorhang.',
      ),
      p(
        'Er sagt, er habe aufgehört, darüber nachzudenken, wie es weitergeht, wenn er nicht mehr da ist. Stattdessen denke er darüber nach, wie es weitergeht, solange er da ist. Das sei eine kleinere Frage, und sie lasse sich beantworten.',
      ),
      p(
        'Am Ende des Gesprächs steht eine der dreiundzwanzig Uhren still. Er steht auf, ohne die Unterhaltung zu unterbrechen, öffnet das Gehäuse, dreht etwas, schließt es wieder. Die Uhr läuft weiter. Er setzt sich hin und sagt, das sei eigentlich alles.',
      ),
    ],
  },

  // -------------------------------------------------------------- MEDIUM ---
  {
    title: 'Sie schrieben sich elf Jahre lang Briefe, ohne sich je zu treffen',
    subtitle:
      'Eine Brieffreundschaft, die als Schulprojekt begann, hielt länger als die meisten Ehen im gleichen Jahrgang. Über eine Nähe, die Distanz brauchte.',
    excerpt:
      'Was hält eine Beziehung zusammen, in der man sich nie sieht? Eine Brieffreundschaft über elf Jahre erzählt etwas über Nähe, das man selten liest.',
    slug: 'elf-jahre-briefe-ohne-treffen',
    category: 'liebe-beziehungen',
    author: 'marlene-ahrens',
    tags: ['freundschaft', 'briefe', 'nähe', 'distanz'],
    featured: true,
    daysAgo: 2,
    views: 3610,
    blocks: [
      p(
        'Der erste Brief war eine Pflichtaufgabe. Achte Klasse, Deutschunterricht, ein Austauschprojekt mit einer Schule vierhundert Kilometer entfernt. Jede Schülerin bekam einen Namen zugeteilt. Die meisten schrieben zweimal und hörten dann auf.',
        true,
      ),
      p('Diese beiden schrieben sich elf Jahre lang.'),
      h2('Warum es funktionierte'),
      p(
        'Beide sagen unabhängig voneinander dasselbe: Es habe funktioniert, weil sie sich nicht sahen. Ein Brief zwingt zur Auswahl. Man schreibt nicht auf, was man zum Frühstück hatte, sondern das, was in vier Wochen noch wichtig ist.',
      ),
      quote(
        'In einem Brief lügt man anders als am Telefon. Man lässt eher etwas weg, als dass man etwas erfindet. Und was übrig bleibt, stimmt meistens.',
      ),
      p(
        'Aus den Briefen wurde mit den Jahren ein Archiv. Prüfungen, ein Umzug, der Tod eines Großvaters, ein abgebrochenes Studium, ein neuer Anfang. Zwei Leben, jeweils aus der Distanz betrachtet — und dadurch klarer beschrieben, als es aus der Nähe möglich gewesen wäre.',
      ),
      h2('Der Anruf, der alles änderte'),
      p(
        'Im elften Jahr rief einer der beiden an. Es gab einen Anlass: eine schlechte Nachricht, die nicht vier Tage Postweg vertrug. Das Gespräch dauerte vierzig Minuten und war, wie beide sagen, „seltsam".',
      ),
      p(
        'Nicht unangenehm. Aber die Stimme passte nicht zur Schrift. Das Tempo war ein anderes. Man unterbrach einander, was in Briefen unmöglich ist.',
      ),
      callout(
        'Beobachtung',
        'Beziehungen entwickeln ein Medium, in dem sie am besten funktionieren. Ein Wechsel des Mediums ist kein neutraler Schritt — er verändert, was gesagt werden kann.',
      ),
      p(
        'Danach schrieben sie noch zweimal. Dann hörte es auf, ohne Streit und ohne Erklärung. Beide beschreiben es rückblickend nicht als Bruch, sondern als Ende einer Form.',
      ),
      h2('Was geblieben ist'),
      p(
        'Die Briefe liegen bei beiden noch. In einem Karton, in einer Schublade, ungeordnet. Gelesen hat sie seitdem keiner von beiden — nicht aus Bitterkeit, sondern weil es sich falsch anfühlen würde, sagt einer der beiden: „Das war ein Gespräch. Man liest ein Gespräch nicht nach."',
      ),
      p(
        'Auf die Frage, ob sie sich heute treffen würden, kommt zweimal dieselbe Antwort. Nein. Und beide klingen dabei nicht traurig.',
      ),
    ],
  },

  {
    title: 'Der Hund, der jeden Morgen zum Bahnhof ging',
    subtitle:
      'Sieben Monate lang lief ein Mischling zur selben Zeit zum selben Gleis. Die Erklärung war weniger romantisch als erhofft — und interessanter.',
    excerpt:
      'Sieben Monate lang lief ein Hund jeden Morgen zum Bahnhof und wartete. Die Nachbarschaft erfand eine Geschichte dazu. Die Wahrheit war eine andere.',
    slug: 'hund-jeden-morgen-bahnhof',
    category: 'tiere',
    author: 'sibel-yalcin',
    tags: ['hunde', 'gewohnheit', 'nachbarschaft'],
    featured: true,
    daysAgo: 3,
    views: 8940,
    blocks: [
      p(
        'Um Viertel nach sieben stand er da. Braun-weiß, mittelgroß, kein Halsband. Er setzte sich an dieselbe Stelle am Ende des Bahnsteigs, blieb etwa vierzig Minuten und ging dann wieder.',
        true,
      ),
      p(
        'Das ging sieben Monate so. Und weil Menschen Geschichten brauchen, gab es nach kurzer Zeit eine: Der Hund warte auf sein Herrchen, das gestorben sei. Jemand schrieb es auf einen Zettel und klebte ihn an den Fahrkartenautomaten.',
      ),
      h2('Die Erklärung'),
      p(
        'Der Hund gehörte einer Frau, die drei Straßen weiter wohnte. Er war nicht herrenlos, nicht verwaist und wartete auf niemanden. Er hatte eine Angewohnheit entwickelt.',
      ),
      p(
        'Der Kiosk am Bahnsteig hatte zwei Jahre lang jeden Morgen Reste ausgegeben. Der Hund kam, bekam etwas, ging. Der Kiosk schloss im Frühjahr. Der Hund kam weiter.',
      ),
      quote(
        'Er hat nicht getrauert. Er hat gehofft, dass es wieder aufmacht. Das ist ein Unterschied, auch wenn es von außen gleich aussieht.',
        'Die Halterin des Hundes',
      ),
      h2('Warum die falsche Geschichte hielt'),
      p(
        'Die Halterin sagt, sie habe mehrfach versucht, es zu erklären. Es habe nichts geändert. Der Zettel blieb hängen, Leute fotografierten den Hund, jemand legte Blumen hin.',
      ),
      callout(
        'Zum Einordnen',
        'Tiere zeigen Verhalten, keine Erzählung. Wiederholtes Aufsuchen eines Ortes ist bei Hunden meist an eine Belohnung gekoppelt, die dort einmal zuverlässig auftrat — auch lange nachdem sie ausbleibt.',
      ),
      p(
        'Im Herbst hörte er von selbst auf. Nicht abrupt, sondern in Etappen: erst unregelmäßig, dann seltener, dann gar nicht mehr. Der Zettel hing noch bis in den Winter.',
      ),
      p(
        'Die Halterin sagt, sie sei froh, dass er aufgehört habe. Nicht wegen der Aufmerksamkeit — sondern weil ihr Hund sieben Monate lang jeden Morgen enttäuscht wurde und es nicht verstand.',
      ),
    ],
  },

  {
    title: 'Ein Dorf mit vierzig Einwohnern hat eine eigene Bibliothek — und niemand weiß warum',
    subtitle:
      'In einem Ort in der Uckermark stehen 4.000 Bücher in einer ehemaligen Feuerwehrgarage. Die Geschichte dahinter hat mit einem Missverständnis begonnen.',
    excerpt:
      'Vierzig Einwohner, viertausend Bücher: Wie in einem sehr kleinen Dorf eine Bibliothek entstand, die niemand geplant hatte.',
    slug: 'dorf-vierzig-einwohner-bibliothek',
    category: 'reisen-orte',
    author: 'jonas-feldt',
    tags: ['dorf', 'bibliothek', 'ehrenamt', 'brandenburg'],
    editorsPick: true,
    daysAgo: 4,
    views: 5120,
    blocks: [
      p(
        'Das Schild ist handgemalt. „Bibliothek", darunter kleiner: „Klingeln nicht nötig". Die Tür steht offen, auch im Winter, auch wenn niemand da ist.',
        true,
      ),
      p(
        'Dahinter: eine ehemalige Feuerwehrgarage, ausgeräumt, gestrichen, mit Regalen an drei Wänden. Etwa viertausend Bücher, grob sortiert. Ein Ofen. Zwei Sessel, die nicht zusammenpassen.',
      ),
      h2('Wie es anfing'),
      p(
        'Vor elf Jahren löste eine Kreisbibliothek zwei Zweigstellen auf. Es gab eine Liste von Beständen, die abgegeben werden sollten, und eine Anfrage an die Gemeinden, ob Interesse bestehe.',
      ),
      p(
        'Der damalige Ortsvorsteher antwortete mit „Ja" — nach eigener Aussage, weil er die Anfrage so verstand, dass es um einzelne Kisten ging. Geliefert wurden achtzehn Paletten.',
      ),
      quote(
        'Wir standen davor und wussten nicht, wohin damit. Die Garage war das Einzige, was leer war.',
      ),
      h2('Der Betrieb'),
      p(
        'Es gibt keine Ausleihfristen, keine Mitgliedschaft und keine Aufsicht. Wer ein Buch mitnimmt, trägt es in ein Heft ein, das auf einem Tisch liegt. Wer eines zurückbringt, streicht die Zeile durch.',
      ),
      p(
        'Nach elf Jahren fehlen laut Heft neunzehn Bücher. Bei viertausend Bänden entspricht das einer Quote, von der städtische Bibliotheken nur träumen können.',
      ),
      list([
        'Rund viertausend Bände, überwiegend Belletristik und Sachbuch',
        'Geöffnet rund um die Uhr, kein Personal',
        'Ausleihe über ein Heft, keine Ausweise',
        'Heizung von Oktober bis April, betrieben von wechselnden Nachbarn',
      ]),
      h2('Warum es funktioniert'),
      p(
        'Es gibt keine anonyme Nutzung. In einem Ort mit vierzig Einwohnern weiß man, wer die Tür aufgemacht hat. Diebstahl ist nicht unmöglich, aber sozial teuer.',
      ),
      p(
        'Dazu kommt etwas anderes. Die Bibliothek ist nicht nur ein Ort für Bücher. Sie ist der einzige beheizte Raum im Dorf, den man ohne Anlass betreten kann. Es gibt keinen Laden, keine Kneipe, keine Kirche mit regelmäßigen Öffnungszeiten.',
      ),
      callout(
        'Beobachtung',
        'Der Bestand wird kaum genutzt, der Raum dagegen ständig. Die Bibliothek ist faktisch ein Gemeinschaftsraum, der zufällig Bücher enthält — und funktioniert genau deshalb.',
      ),
      p(
        'Seit drei Jahren kommen auch Auswärtige. Radfahrer, die von der Route abweichen, weil jemand die Bibliothek in einer App eingetragen hat. Das Heft verzeichnet Einträge aus sieben Ländern.',
      ),
      p(
        'Der heutige Ortsvorsteher sagt, man habe nie beschlossen, eine Bibliothek zu betreiben. Man habe nur nie beschlossen, damit aufzuhören.',
      ),
    ],
  },

  {
    title: 'Als die Nachbarn nach 23 Jahren zum ersten Mal miteinander sprachen',
    subtitle:
      'Zwei Parteien, ein Treppenhaus, kein Wort. Was dann passierte, hatte weder mit Versöhnung noch mit einem Streit zu tun.',
    excerpt:
      'Dreiundzwanzig Jahre wohnten sie Tür an Tür, ohne miteinander zu sprechen. Es gab keinen Streit — und das machte es schwieriger.',
    slug: 'nachbarn-23-jahre-erstes-gespraech',
    category: 'menschen-gesellschaft',
    author: 'sibel-yalcin',
    tags: ['nachbarschaft', 'stadt', 'schweigen'],
    daysAgo: 5,
    views: 6280,
    blocks: [
      p(
        'Es gab keinen Streit. Das ist der Teil, den alle zuerst hören wollen, und es ist der Teil, der die Geschichte eigentlich erklärt.',
        true,
      ),
      p(
        'Zwei Wohnungen im dritten Stock, gegenüberliegende Türen, dreiundzwanzig Jahre lang. Ein Nicken im Treppenhaus. Einmal ein Paket angenommen. Sonst nichts.',
      ),
      h2('Wie so etwas entsteht'),
      p(
        'Am Anfang war es Zurückhaltung. Beide zogen im selben Jahr ein, beide beschäftigt, beide der Meinung, der andere wolle seine Ruhe. Nach etwa zwei Jahren war das Nicht-Sprechen keine Entscheidung mehr, sondern ein Zustand.',
      ),
      quote(
        'Irgendwann ist es peinlich, jemanden zu fragen, wie er heißt, wenn man ihn seit sieben Jahren jeden Tag sieht.',
      ),
      p(
        'Die Schwelle wächst mit der Zeit. Was im ersten Monat eine Nebensächlichkeit gewesen wäre, wird im achten Jahr zu einem Gespräch, das erklärt werden müsste.',
      ),
      h2('Der Anlass'),
      p(
        'Im vergangenen Herbst fiel im Haus für zwei Tage die Heizung aus. Die Hausverwaltung war nicht erreichbar. Im Treppenhaus stand ein Zettel, auf dem jemand eine Nummer notiert hatte.',
      ),
      p(
        'Sie klopfte, weil sie wissen wollte, ob er die Nummer schon angerufen hatte. Er hatte. Das Gespräch dauerte laut beiden „ungefähr eine Minute" und endete damit, dass er fragte, ob sie einen zweiten Heizlüfter brauche.',
      ),
      callout(
        'Zum Einordnen',
        'Kontaktaufnahme unter Nachbarn scheitert selten an Abneigung, sondern meist an der fehlenden Gelegenheit. Ein gemeinsames praktisches Problem senkt die Schwelle deutlicher als jedes Nachbarschaftsfest.',
      ),
      h2('Was daraus wurde'),
      p(
        'Keine Freundschaft. Beide betonen das. Sie grüßen sich jetzt mit Namen, sprechen gelegentlich zwei Sätze über das Haus, haben einander Telefonnummern gegeben.',
      ),
      p(
        'Sie sagt, sie habe sich hinterher geärgert. Nicht über ihn, sondern über die dreiundzwanzig Jahre. Er sagt, er ärgere sich nicht — es habe ja keinen Schaden gegeben.',
      ),
      p(
        'Auf die Frage, ob sie sich gegenseitig fehlten in all den Jahren, antworten beide mit Nein. Auf die Frage, ob sie den Kontakt heute vermissen würden, antworten beide mit Ja.',
      ),
    ],
  },

  {
    title: 'Der Vater, der seinen Sohn erst als Erwachsener kennenlernte',
    subtitle:
      'Über eine Wiederbegegnung nach 29 Jahren, die nicht mit einer Umarmung begann, sondern mit einer Tabelle.',
    excerpt:
      'Nach 29 Jahren trafen sich Vater und Sohn wieder. Sie begannen nicht mit Gefühlen, sondern mit Fakten. Das war eine bewusste Entscheidung.',
    slug: 'vater-sohn-wiederbegegnung-29-jahre',
    category: 'familie',
    author: 'marlene-ahrens',
    tags: ['familie', 'väter', 'wiedersehen'],
    editorsPick: true,
    daysAgo: 6,
    views: 7340,
    blocks: [
      p(
        'Sie trafen sich in einem Café am Hauptbahnhof, weil beide dachten, ein neutraler Ort sei einfacher. Der Sohn brachte einen Ausdruck mit: zwei Seiten, chronologisch, alles, was er über die Trennung seiner Eltern wusste, mit Jahreszahlen.',
        true,
      ),
      p(
        'Er habe das nicht als Anklage gemeint, sagt er heute. Er habe wissen wollen, wo die Lücken sind.',
      ),
      h2('Warum keine Gefühle zuerst'),
      p(
        'Beide hatten Ratgeber gelesen, unabhängig voneinander, und beide waren zu dem Schluss gekommen, dass das erste Gespräch schiefgehen würde, wenn es mit Vorwürfen oder mit Rührung beginnt.',
      ),
      quote(
        'Ich hatte Angst, dass ich weine und er sich dann verpflichtet fühlt, mich zu trösten. Das wollte ich nicht. Er schuldet mir nichts, und ich schulde ihm auch nichts.',
      ),
      p(
        'Also gingen sie die Tabelle durch. Der Vater korrigierte drei Jahreszahlen, ergänzte zwei Umzüge und widersprach an einer Stelle deutlich.',
      ),
      h2('Die Stelle, an der es schwierig wurde'),
      p(
        'Der Sohn hatte notiert, dass es zwischen dem elften und dem sechzehnten Lebensjahr keinen Kontaktversuch gegeben habe. Der Vater sagte, er habe in dieser Zeit vier Briefe geschrieben.',
      ),
      p(
        'Angekommen ist keiner. Ob sie abgefangen wurden, ob die Adresse falsch war, ob sie nie abgeschickt wurden — das lässt sich nicht mehr klären. Beide haben aufgehört, es klären zu wollen.',
      ),
      callout(
        'Zum Einordnen',
        'Bei lange unterbrochenen Familienkontakten sind widersprüchliche Erinnerungen die Regel. Beratungsstellen empfehlen, den Widerspruch stehen zu lassen, statt eine gemeinsame Version zu erzwingen — der Versuch scheitert meist und beendet den Kontakt erneut.',
      ),
      h2('Wie es weitergeht'),
      p(
        'Sie telefonieren jetzt etwa alle drei Wochen. Die Gespräche sind kurz und handeln von unspektakulären Dingen: Arbeit, Wetter, ein Auto, das repariert werden muss.',
      ),
      p(
        'Der Sohn sagt, er habe zunächst enttäuscht sein wollen, weil so wenig passiere. Dann habe er gemerkt, dass genau das der Punkt sei: Väter und Söhne, die sich immer kannten, reden auch nicht über mehr.',
      ),
      p('Die Tabelle liegt noch in einer Schublade. Ergänzt hat sie seitdem niemand.'),
    ],
  },

  // --------------------------------------------------------------- SHORT ---
  {
    title: 'Eine verlorene Kamera kam nach elf Jahren zurück — mit vollen Speicherkarten',
    subtitle: 'Was passiert, wenn Erinnerungen zurückkommen, die man längst ersetzt hat.',
    excerpt:
      'Elf Jahre nach dem Verlust taucht eine Kamera wieder auf. Die Bilder darauf zeigen ein Leben, das es so nicht mehr gibt.',
    slug: 'verlorene-kamera-elf-jahre-zurueck',
    category: 'unglaubliche-geschichten',
    author: 'jonas-feldt',
    tags: ['zufall', 'erinnerung', 'fundsache'],
    daysAgo: 7,
    views: 9120,
    blocks: [
      p(
        'Die Kamera lag elf Jahre in einem Karton in einem Fundbüro, das zweimal umgezogen ist. Aufgefallen ist sie erst bei einer Bestandsaufnahme.',
        true,
      ),
      p(
        'Auf dem Gehäuse klebte ein Aufkleber mit einem Nachnamen und einer Vorwahl. Beides reichte, mit einiger Mühe, für eine Zuordnung.',
      ),
      h2('Die Bilder'),
      p(
        'Zwei Speicherkarten, gut 1.400 Aufnahmen. Ein Urlaub, eine Wohnung, die längst gekündigt ist, zwei Menschen, die inzwischen getrennt sind, und ein Hund, der nicht mehr lebt.',
      ),
      quote(
        'Ich hatte vergessen, wie unsere Küche damals aussah. Nicht die Menschen — die Küche.',
      ),
      p(
        'Das sei das Merkwürdige gewesen, sagt die Besitzerin. Die großen Dinge habe sie erinnert. Zurückgekommen seien die kleinen: eine Tapete, ein Wasserkocher, die Reihenfolge der Gewürze im Regal.',
      ),
      h2('Was sie damit gemacht hat'),
      p(
        'Sie hat die Bilder kopiert und die Kamera behalten, obwohl sie sie nicht mehr benutzt. Verschickt hat sie nichts. Auf die Frage, ob sie die Fotos ihrem früheren Partner geben würde, sagt sie: „Wenn er fragt."',
      ),
      p('Gefragt hat bisher niemand.'),
    ],
  },

  {
    title: 'Warum eine Bäckerin ihre besten Kunden bittet, seltener zu kommen',
    subtitle: 'Ein Betrieb, der bewusst nicht wächst — und die Rechnung, die dahintersteckt.',
    excerpt:
      'Eine Bäckerei, die absichtlich nicht mehr verkauft. Die Begründung ist weniger idealistisch, als man denkt.',
    slug: 'baeckerin-bittet-kunden-seltener-zu-kommen',
    category: 'menschen-gesellschaft',
    author: 'jonas-feldt',
    tags: ['handwerk', 'wachstum', 'arbeit'],
    daysAgo: 8,
    views: 3980,
    blocks: [
      p(
        'Der Zettel an der Tür ist freundlich formuliert und trotzdem ungewöhnlich: Man möge, wenn möglich, nicht jeden Tag kommen. Zweimal die Woche reiche völlig.',
        true,
      ),
      p('Es ist keine Marketingidee. Es ist eine Kapazitätsentscheidung.'),
      h2('Die Rechnung'),
      p(
        'Die Backstube fasst eine feste Menge. Mehr Nachfrage bedeutet nicht mehr Brot, sondern früher ausverkauft — und Kundschaft, die vor verschlossener Tür steht.',
      ),
      list([
        'Ein Ofen, zwei Durchgänge pro Tag',
        'Drei Mitarbeitende, keine Nachtschicht',
        'Kein Vorteig aus Zukauf',
      ]),
      p(
        'Eine zweite Schicht hätte Nachtarbeit bedeutet. Ein zweiter Ofen hätte einen Umbau erfordert, für den die Fläche nicht reicht.',
      ),
      quote(
        'Ich kann wachsen oder ich kann so backen, wie ich backen will. Beides geht in diesem Raum nicht.',
      ),
      h2('Ob es funktioniert'),
      p(
        'Die Bäckerin sagt, etwa die Hälfte der Stammkundschaft habe den Rhythmus tatsächlich geändert. Der Umsatz sei gleich geblieben, die Zahl der abgewiesenen Kunden deutlich gesunken.',
      ),
      p(
        'Sie halte das für den besseren Zustand: „Lieber verkaufe ich einem Menschen zweimal die Woche Brot, als dass ich ihn dreimal wegschicke."',
      ),
    ],
  },

  {
    title: 'Die Krähe, die Werkzeug zurückbrachte',
    subtitle: 'Auf einem Bauhof beobachten Mitarbeiter seit zwei Jahren ein Verhalten, das man so kaum erwartet.',
    excerpt:
      'Auf einem Bauhof im Emsland bringt eine Krähe seit zwei Jahren Kleinteile zurück. Was Verhaltensforscher dazu sagen.',
    slug: 'kraehe-brachte-werkzeug-zurueck',
    category: 'tiere',
    author: 'sibel-yalcin',
    tags: ['krähen', 'verhalten', 'intelligenz'],
    daysAgo: 9,
    views: 11240,
    blocks: [
      p(
        'Angefangen hat es mit einem Schraubendreher, der auf dem Hof lag und am nächsten Tag auf der Fensterbank der Werkstatt.',
        true,
      ),
      p(
        'Die Mitarbeiter hielten es zunächst für einen Kollegen. Nach dem vierten Mal stellten sie eine Kamera auf.',
      ),
      h2('Was die Aufnahmen zeigen'),
      p(
        'Eine Rabenkrähe, erkennbar an einer beschädigten Schwanzfeder, nimmt kleine Metallteile auf und legt sie auf der Fensterbank ab — dort, wo die Mitarbeiter morgens Futterreste hinlegen.',
      ),
      callout(
        'Einordnung',
        'Rabenvögel sind für Werkzeuggebrauch und für den Austausch von Objekten gegen Futter bekannt. Ein „Zurückbringen" im menschlichen Sinne ist es nicht: Das Tier verknüpft das Ablegen eines Gegenstands an einer bestimmten Stelle mit einer Belohnung.',
        'context',
      ),
      p(
        'Der Effekt bleibt beeindruckend. In zwei Jahren zählte der Bauhof 61 abgelegte Gegenstände: Schrauben, zwei Schlüssel, ein Feuerzeug, mehrmals Kabelbinder.',
      ),
      quote(
        'Wir haben aufgehört, uns zu wundern. Wir legen morgens etwas hin, und irgendwann liegt etwas anderes da.',
      ),
      p(
        'Ein Schlüssel wurde von einem Anwohner als vermisst gemeldet. Er hatte ihn drei Wochen zuvor auf dem Parkplatz verloren.',
      ),
    ],
  },

  {
    title: 'Ein Haus, das zwölf Jahre leer stand, hat jetzt sieben Bewohner',
    subtitle:
      'Der Umbau eines Leerstands zu einem Mehrgenerationenhaus — und die drei Regeln, an denen ähnliche Projekte meist scheitern.',
    excerpt:
      'Zwölf Jahre Leerstand, jetzt sieben Bewohner zwischen 6 und 81. Was dieses Projekt anders gemacht hat.',
    slug: 'haus-zwoelf-jahre-leer-sieben-bewohner',
    category: 'menschen-gesellschaft',
    author: 'jonas-feldt',
    tags: ['wohnen', 'gemeinschaft', 'umbau'],
    daysAgo: 11,
    views: 4460,
    blocks: [
      p(
        'Als sie das Haus zum ersten Mal betraten, stand in der Küche noch das Geschirr vom letzten Mittagessen — zwölf Jahre alt, unter einer Staubschicht.',
        true,
      ),
      p(
        'Vier Erwachsene hatten es gemeinsam gekauft, nach zweijähriger Suche und drei geplatzten Finanzierungen. Heute leben sieben Menschen darin, zwischen sechs und einundachtzig Jahren.',
      ),
      h2('Die drei Regeln'),
      p(
        'Auf die Frage, was den Unterschied gemacht habe, nennen alle Beteiligten dieselben drei Punkte — und alle drei klingen unromantisch.',
      ),
      list(
        [
          'Jede Partei hat eine abgeschlossene Wohneinheit mit eigener Küche. Gemeinschaft ist ein Angebot, keine Pflicht.',
          'Alle Ausgaben über 500 Euro brauchen Einstimmigkeit. Das verlangsamt Entscheidungen und verhindert Überstimmung.',
          'Es gibt einen schriftlichen Ausstiegsmechanismus, verhandelt vor dem Einzug, als noch alle guter Dinge waren.',
        ],
        true,
      ),
      quote(
        'Der Ausstiegsvertrag war das unangenehmste Gespräch und im Nachhinein das wichtigste. Wer nicht darüber reden will, wie man auseinandergeht, sollte nicht zusammenziehen.',
      ),
      h2('Was nicht funktioniert hat'),
      p(
        'Der gemeinsame Garten wurde zweimal geplant und zweimal nicht umgesetzt. Die gemeinsame Waschküche führte im ersten Jahr zu mehr Konflikten als alle Bauentscheidungen zusammen.',
      ),
      p(
        'Inzwischen gibt es zwei Waschmaschinen und einen Belegungsplan an der Wand. Die Bewohner beschreiben das als „die unelegante Lösung, die funktioniert".',
      ),
    ],
  },

  {
    title: 'Warum diese Straße nachts völlig anders klingt',
    subtitle: 'Ein Akustiker hat ein Wohnviertel 48 Stunden lang aufgezeichnet. Das Ergebnis erklärt einige Nachbarschaftskonflikte.',
    excerpt:
      'Ein Akustiker zeichnete eine Wohnstraße 48 Stunden lang auf. Was er fand, erklärt, warum Nachbarn sich nachts stärker stören als tagsüber.',
    slug: 'strasse-nachts-anders-klingt',
    category: 'menschen-gesellschaft',
    author: 'jonas-feldt',
    tags: ['lärm', 'stadt', 'nachbarschaft'],
    daysAgo: 12,
    views: 2890,
    blocks: [
      p(
        'Der Pegel fällt nachts um etwa 15 Dezibel. Das ist erwartbar. Interessant ist, was mit dem übrig bleibenden Geräusch passiert.',
        true,
      ),
      p(
        'Tagsüber verschwinden einzelne Geräusche in einem Grundrauschen aus Verkehr, Lüftungen und Stimmen. Nachts fällt dieses Rauschen weg — und jedes Einzelgeräusch steht frei.',
      ),
      h2('Der Effekt'),
      p(
        'Eine zufallende Autotür um 23:40 Uhr ist objektiv nicht lauter als um 15:00 Uhr. Subjektiv ist sie erheblich lauter, weil nichts sie überdeckt.',
      ),
      callout(
        'Zum Einordnen',
        'Für die Störwirkung ist weniger der absolute Pegel entscheidend als der Abstand zum Umgebungsgeräusch. Deshalb wirken ruhige Wohnlagen bei einzelnen Ereignissen oft empfindlicher als laute.',
      ),
      p(
        'Das erklärt eine Beobachtung, die viele Hausverwaltungen kennen: Beschwerden über Lärm häufen sich nicht dort, wo es am lautesten ist, sondern dort, wo es überwiegend still ist.',
      ),
      quote('Ruhe macht empfindlich. Das ist kein Vorwurf, das ist Physik plus Wahrnehmung.'),
    ],
  },

  {
    title: 'Nach dem Umzug fand sie im Keller die Briefe der Vormieterin',
    subtitle:
      'Was tut man mit Post, die einem nicht gehört, deren Empfängerin aber nicht mehr auffindbar ist?',
    excerpt:
      'Ein Karton mit fremden Briefen im Keller stellt eine neue Mieterin vor eine Frage, auf die es keine saubere Antwort gibt.',
    slug: 'keller-briefe-der-vormieterin',
    category: 'unglaubliche-geschichten',
    author: 'marlene-ahrens',
    tags: ['fundsache', 'privatsphäre', 'umzug'],
    daysAgo: 14,
    views: 5670,
    blocks: [
      p(
        'Der Karton stand hinter dem Heizungsrohr, mit Klebeband verschlossen, beschriftet mit einem einzelnen Wort: „Aufheben".',
        true,
      ),
      p('Darin: rund achtzig Briefe, gebündelt, die jüngsten aus dem Jahr 2004.'),
      h2('Die erste Entscheidung'),
      p(
        'Sie hat sie nicht gelesen. Das sagt sie ohne Pathos: Es sei ihr nicht schwergefallen, weil ihr sofort klar gewesen sei, dass sie sie dann nicht mehr weggeben könnte.',
      ),
      p(
        'Stattdessen versuchte sie, die Vormieterin zu finden. Die Hausverwaltung durfte keine Adresse herausgeben. Ein Nachbar erinnerte sich an einen Nachnamen.',
      ),
      h2('Die zweite Entscheidung'),
      p(
        'Nach vier Monaten ohne Ergebnis fragte sie in einer Rechtsberatung nach. Die Auskunft war ernüchternd: Es gebe keine Pflicht, den Karton aufzubewahren, aber auch kein Recht, ihn zu lesen.',
      ),
      callout(
        'Zum Einordnen',
        'Persönliche Aufzeichnungen fallen unter das allgemeine Persönlichkeitsrecht, das über den Tod hinaus wirkt. Fundstücke dieser Art sind rechtlich Fundsachen — praktisch aber häufig unzustellbar.',
      ),
      p(
        'Der Karton steht heute wieder im Keller, an derselben Stelle, mit einem zweiten Zettel darauf: „Nicht meins. Bitte stehen lassen."',
      ),
      p(
        'Sie sagt, sie habe sich damit abgefunden, dass die Geschichte kein Ende bekommt. Man müsse nicht alles auflösen.',
      ),
    ],
  },

  {
    title: 'Zwei Schwestern, ein Rezept, dreißig Jahre Streit',
    subtitle: 'Ein Familienkonflikt, in dem es nie ums Essen ging.',
    excerpt:
      'Dreißig Jahre stritten zwei Schwestern über ein Rezept. Erst spät wurde klar, worum es eigentlich ging.',
    slug: 'zwei-schwestern-ein-rezept',
    category: 'familie',
    author: 'marlene-ahrens',
    tags: ['geschwister', 'erinnerung', 'streit'],
    daysAgo: 15,
    views: 6910,
    blocks: [
      p(
        'Es ging um einen Hefekuchen. Genauer: darum, ob die Mutter Zitronenschale hineingab oder nicht.',
        true,
      ),
      p(
        'Die ältere Schwester sagt ja. Die jüngere sagt nein. Beide haben den Kuchen jahrzehntelang gebacken, jede nach ihrer Version, und beide haben der anderen vorgeworfen, das Rezept zu verfälschen.',
      ),
      h2('Warum ein Kuchen'),
      p(
        'Die Mutter starb, als die jüngere sechzehn war. Aufgeschrieben hat sie nichts. Was blieb, waren zwei Erinnerungen, die nicht zusammenpassten.',
      ),
      quote(
        'Wenn ich zugebe, dass da Zitrone drin war, gebe ich zu, dass ich sie schlechter gekannt habe als meine Schwester. So habe ich das damals empfunden.',
      ),
      h2('Die Auflösung'),
      p(
        'Vor zwei Jahren fand eine Cousine ein Foto: die Mutter am Küchentisch, daneben ein Einkaufszettel, gut lesbar. Darauf stand unter anderem „2 Zitronen".',
      ),
      p(
        'Das beweist wenig — Zitronen kauft man aus vielen Gründen. Trotzdem war es der Anlass für ein Gespräch, das die Schwestern dreißig Jahre lang nicht geführt hatten.',
      ),
      p(
        'Sie backen den Kuchen heute noch getrennt und weiterhin unterschiedlich. Der Unterschied ist, dass sie einander inzwischen davon erzählen.',
      ),
    ],
  },

  {
    title: 'Der Bahnhof, an dem seit 1998 kein Zug mehr hält — und trotzdem jemand putzt',
    subtitle: 'Über einen Mann, der einen stillgelegten Ort instand hält, ohne dafür bezahlt zu werden.',
    excerpt:
      'Seit 27 Jahren hält kein Zug mehr. Trotzdem ist der Bahnsteig gefegt und die Bank gestrichen. Wer macht das, und warum?',
    slug: 'bahnhof-seit-1998-kein-zug',
    category: 'reisen-orte',
    author: 'jonas-feldt',
    tags: ['bahn', 'stillgelegt', 'ehrenamt'],
    daysAgo: 17,
    views: 4230,
    blocks: [
      p(
        'Die Uhr an der Fassade geht richtig. Das ist das Erste, was auffällt, und das Merkwürdigste.',
        true,
      ),
      p(
        'Seit 1998 hält hier kein Zug mehr. Die Gleise liegen noch, überwachsen, aber sichtbar. Der Bahnsteig ist gefegt, die Bank frisch gestrichen, das Fahrplanschild leer, aber sauber.',
      ),
      h2('Der Mann mit dem Besen'),
      p(
        'Er kommt zweimal die Woche, meistens dienstags und samstags. Er war hier Fahrdienstleiter, von 1979 bis zur Stilllegung.',
      ),
      quote(
        'Ich habe nicht beschlossen, das zu machen. Ich bin nach der Stilllegung einmal hergekommen und habe gesehen, wie es aussieht. Da habe ich gefegt.',
      ),
      p(
        'Das war vor siebenundzwanzig Jahren. Die Farbe kauft er selbst. Die Uhr stellt er zweimal im Jahr um.',
      ),
      h2('Was die Gemeinde sagt'),
      p(
        'Offiziell ist das Gelände Eigentum eines Infrastrukturunternehmens. Eine Genehmigung hat er nicht. Beanstandet hat es auch nie jemand.',
      ),
      callout(
        'Beobachtung',
        'Solche informellen Pflegearrangements sind an stillgelegten Bahnanlagen nicht selten. Sie funktionieren, solange niemand eine formale Klärung verlangt — und enden meist genau dann.',
      ),
      p(
        'Er sagt, er wisse, dass es irgendwann aufhören werde. Er sei siebenundsiebzig. Auf die Frage, ob jemand weitermachen werde, zuckt er mit den Schultern.',
      ),
      p('Dann fegt er weiter.'),
    ],
  },

  {
    title: 'Sie heiratete mit 74 zum ersten Mal — und erklärt, warum nicht früher',
    subtitle: 'Eine Entscheidung, die weniger mit Romantik zu tun hatte als mit Verwaltung.',
    excerpt:
      'Mit 74 heiratete sie zum ersten Mal. Der Grund war nicht, dass sie vorher niemanden gefunden hätte.',
    slug: 'erste-hochzeit-mit-74',
    category: 'liebe-beziehungen',
    author: 'marlene-ahrens',
    tags: ['heirat', 'alter', 'entscheidung'],
    daysAgo: 19,
    views: 7820,
    blocks: [
      p(
        'Sie hat drei lange Beziehungen gehabt, zwei davon über zehn Jahre. Geheiratet hat sie keine davon.',
        true,
      ),
      p(
        'Nicht aus Prinzip, sagt sie, und auch nicht aus Angst. Sondern weil es nie einen Grund gab, der über das Gefühl hinausging.',
      ),
      h2('Der Grund diesmal'),
      p(
        'Ihr Partner hatte einen Schlaganfall. Im Krankenhaus wurde ihr die Auskunft verweigert, weil sie nicht angehörig war. Sie saß vier Stunden auf einem Flur.',
      ),
      quote(
        'Ich habe nicht geheiratet, weil ich ihn mehr liebe als die anderen. Ich habe geheiratet, damit mich niemand mehr aus einem Zimmer schicken kann.',
      ),
      h2('Was sie anderen rät'),
      p(
        'Sie sagt, sie halte nichts von der Empfehlung, aus Liebe zu heiraten. Liebe brauche keine Urkunde. Was eine Urkunde könne, sei etwas anderes: Zugang, Vertretung, Entscheidungen im Ernstfall.',
      ),
      callout(
        'Praktischer Hinweis',
        'Vieles davon lässt sich auch ohne Ehe regeln — über Vorsorgevollmacht, Patientenverfügung und Betreuungsverfügung. Wer nicht heiraten möchte, sollte diese Dokumente rechtzeitig erstellen lassen.',
      ),
      p(
        'Die Trauung dauerte elf Minuten. Gefeiert wurde nicht. Sie sagt, das habe gut gepasst.',
      ),
    ],
  },

  {
    title: 'Ein Sommer im Wohnwagen — und die Frage, ob man je zurückzieht',
    subtitle: 'Aus drei Monaten wurden vier Jahre. Eine Bilanz ohne Verklärung.',
    excerpt:
      'Aus einem Übergangssommer im Wohnwagen wurden vier Jahre. Was daran gut war — und was nicht.',
    slug: 'sommer-im-wohnwagen-vier-jahre',
    category: 'leben-schicksale',
    author: 'jonas-feldt',
    tags: ['wohnen', 'minimalismus', 'entscheidung'],
    daysAgo: 21,
    views: 5340,
    blocks: [
      p(
        'Der Plan war ein Sommer. Die Wohnung war gekündigt, die neue erst ab Oktober frei, ein Wohnwagen auf dem Grundstück der Eltern stand ohnehin da.',
        true,
      ),
      p('Die neue Wohnung wurde nie bezogen.'),
      h2('Was besser war'),
      list([
        'Deutlich niedrigere Fixkosten, im Schnitt rund 380 Euro weniger im Monat',
        'Weniger Besitz, weil kein Platz für Ansammlung ist',
        'Mehr Zeit draußen, auch bei schlechtem Wetter',
      ]),
      h2('Was schlechter war'),
      list([
        'Im Winter kostet Heizen fast so viel wie eine kleine Wohnung',
        'Besuch ist praktisch unmöglich',
        'Krankheit ist unangenehm — es gibt keinen zweiten Raum',
      ]),
      quote(
        'Romantisch ist es genau bis zu dem Moment, an dem man mit Fieber liegt und die Toilette dreißig Meter entfernt ist.',
      ),
      h2('Die Bilanz'),
      p(
        'Nach vier Jahren zieht er nun doch um — in eine kleine Wohnung, nicht in ein Haus. Er sagt, er habe nicht das Gefühl, gescheitert zu sein.',
      ),
      p(
        'Er habe herausgefunden, wie wenig er brauche. Diese Information sei mehr wert gewesen als die vier Jahre gekostet hätten.',
      ),
    ],
  },

  {
    title: 'Die Katze, die drei Haushalte gleichzeitig führte',
    subtitle: 'Drei Familien, drei Namen, ein Tier. Aufgefallen ist es durch einen Tierarztbesuch.',
    excerpt:
      'Drei Familien dachten, es sei ihre Katze. Sie hatte drei Namen, drei Näpfe und ein sehr gutes Zeitmanagement.',
    slug: 'katze-drei-haushalte',
    category: 'tiere',
    author: 'sibel-yalcin',
    tags: ['katzen', 'nachbarschaft', 'kurios'],
    daysAgo: 23,
    views: 12480,
    blocks: [
      p(
        'Sie hieß Mimi, Nero und Frau Schmidt. Je nachdem, wen man fragte.',
        true,
      ),
      p(
        'Aufgeflogen ist es beim Tierarzt. Zwei Halterinnen saßen mit demselben Tier im Wartezimmer, an unterschiedlichen Tagen, unter unterschiedlichen Namen. Der Chip war eindeutig.',
      ),
      h2('Der Tagesablauf'),
      p(
        'Nach Rekonstruktion der drei Haushalte ergab sich ein bemerkenswert stabiler Rhythmus: morgens Haus eins, mittags Haus zwei, abends Haus drei, Nacht wechselnd.',
      ),
      quote(
        'Wir dachten immer, sie sei tagsüber unterwegs. Sie war unterwegs. Nur eben zum Frühstück.',
      ),
      callout(
        'Zum Einordnen',
        'Freigängerkatzen bauen regelmäßig Beziehungen zu mehreren Haushalten auf. Sie sind an Orte gebunden, nicht an Personen — was aus menschlicher Sicht wie Untreue wirkt, ist aus Katzensicht Ressourcensicherung.',
      ),
      h2('Wie es ausging'),
      p(
        'Die drei Haushalte haben sich abgestimmt. Es gibt jetzt einen gemeinsamen Chat, einen Fütterungsplan und die Vereinbarung, dass die Tierarztkosten gedrittelt werden.',
      ),
      p(
        'Auf den Namen konnte man sich nicht einigen. Sie heißt weiterhin je nach Haus anders und reagiert, laut allen drei Parteien, auf keinen davon.',
      ),
    ],
  },

  {
    title: 'Was ein Kind lernt, wenn Eltern zugeben, dass sie es nicht wissen',
    subtitle:
      'Eine Beobachtung aus dem Familienalltag, die überraschend gut zu dem passt, was die Forschung sagt.',
    excerpt:
      'Eltern, die „Ich weiß es nicht" sagen, wirken auf Kinder nicht unsicher — sondern glaubwürdiger. Warum das so ist.',
    slug: 'eltern-ich-weiss-es-nicht',
    category: 'familie',
    author: 'marlene-ahrens',
    tags: ['erziehung', 'vertrauen', 'kinder'],
    daysAgo: 26,
    views: 8150,
    blocks: [
      p(
        'Die Frage lautete, warum der Mond manchmal am Tag zu sehen ist. Die Antwort lautete: „Keine Ahnung. Wollen wir nachschauen?"',
        true,
      ),
      p(
        'Was danach passierte, war unspektakulär: zwanzig Minuten gemeinsames Suchen, eine halbwegs verstandene Erklärung, ein zufriedenes Kind.',
      ),
      h2('Warum das mehr ist als Ehrlichkeit'),
      p(
        'Kinder testen Auskunftsquellen. Wer regelmäßig falsche oder ausweichende Antworten gibt, wird als Quelle abgewertet — nicht bewusst, aber verlässlich.',
      ),
      callout(
        'Zum Einordnen',
        'Entwicklungspsychologische Studien zeigen, dass Kinder ab etwa vier Jahren zwischen zuverlässigen und unzuverlässigen Informanten unterscheiden und spätere Auskünfte entsprechend gewichten.',
      ),
      quote(
        'Ein „Ich weiß es nicht" kostet einmal Autorität und spart zehnmal Glaubwürdigkeit.',
      ),
      h2('Die Grenze'),
      p(
        'Das gilt nicht grenzenlos. Bei Fragen, die Sicherheit betreffen, erwarten Kinder eine klare Ansage — und Unsicherheit verunsichert dann tatsächlich.',
      ),
      p(
        'Der Unterschied liegt zwischen Wissensfragen und Orientierungsfragen. Bei der ersten Sorte darf man passen. Bei der zweiten nicht.',
      ),
    ],
  },
]
