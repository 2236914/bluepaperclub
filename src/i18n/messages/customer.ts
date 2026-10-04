/* Messages for the customer area. Same rules as common.ts: `fil` must match `en` key for key. */
export const en = {
  /** Header, nav and footer around every customer page */
  layout: {
    navLabel: 'Main',
    howItWorks: 'How it works',
    sendFiles: 'Send files',
    trackOrder: 'Track an order',
    hours: 'Hours',
    contact: 'Contact',
    staff: 'Staff',
    staffSignIn: 'Staff sign in',
    homeLink: (shop: string) => `${shop}, home`,
  },

  /** The landing page: hero, how it works, quick track */
  home: {
    heroTitle: 'Send your files. Pick them up printed.',
    heroCopy:
      "Upload your documents, choose how they should be printed, and we'll email you an order ID. Use it to track your order and to claim it at the counter.",
    services: 'Printing · Xerox · Scanning · Lamination · Binding',
    formLabel: 'Send files',
    howTitle: 'How it works',
    stepLabel: (n: number) => `Step ${n}`,
    steps: [
      { title: 'Upload your files', body: 'Add PDFs, Word files or photos, then choose paper, color and copies.' },
      { title: 'Get your order ID', body: 'We email it to you right away. Keep it for tracking and pickup.' },
      { title: 'Track your order', body: 'Check the status anytime with your order ID and email.' },
      { title: 'Claim at the counter', body: 'When it says Ready for pickup, show your order ID and pay at the shop.' },
    ],
    quickTitle: 'Already sent your files?',
    quickBody: 'Enter your order ID and email to see where your order is.',
    orderIdLabel: 'Order ID',
    emailLabel: 'Email',
    emailPlaceholder: 'you@email.com',
    quickSubmit: 'Track order',
  },

  /** /order/:code, the page after sending files */
  received: {
    badIdTitle: "That isn't an order ID",
    badIdBody: 'Order IDs look like PRT-7K3QM. Check the link in your email, or track your order by ID.',
    badIdAction: 'Track an order',
    tag: 'Order received',
    thanks: (first: string) => `Thanks, ${first}. We have your files.`,
    thanksNoName: 'We have your files.',
    yourOrderId: 'Your order ID',
    emailed: (email: string) => `We emailed it to ${email}. Keep it to track your order and to claim it at the counter.`,
    keepIt: 'Keep it to track your order and to claim it at the counter.',
    trackThis: 'Track this order',
    summaryTitle: 'Order summary',
    submitted: (when: string, summary: string) => `Sent ${when} · ${summary}`,
    yourNotes: 'Your notes',
    detailsTitle: 'See your order details',
    detailsBody: 'Enter the email you used when you sent your files.',
    emailLabel: 'Email',
    showOrder: 'Show order',
    nextTitle: 'What happens next',
    next: [
      "We check your files. If something won't print well, we email you before printing.",
      "We print your order and email you when it's ready for pickup.",
    ],
    nextClaim: (address: string) => `Claim it at ${address}. Show your order ID and pay at the counter.`,
    noEmail: (phone: string) => `No email after a few minutes? Check your spam folder, or call us at ${phone}.`,
    sendMore: 'Send more files',
  },

  /** The thank-you popup right after sending files */
  thanks: {
    title: (first: string) => `Thank you, ${first}.`,
    titleNoName: 'Thank you.',
    received: "We have your files. We'll print them and email you when your order is ready to pick up.",
    receivedNoEmail: "We have your files. We'll print them soon.",
    yourOrderId: 'Your order ID',
    emailedTo: (email: string) => `We also sent it to ${email}.`,
    writeItDown: 'Write this number down or take a screenshot. You need it to pick up your order.',
    payAtCounter: 'Pay at the counter when you pick it up.',
    /** read aloud: the order ID spelled out, e.g. "P R T, 7 K 3 Q M" */
    idSpoken: (spelled: string) => `Your order ID is ${spelled}.`,
    rememberTitle: 'Remember me on this phone?',
    rememberBody:
      "Next time, your name and email are filled in for you, and your orders are listed when you track an order. No password needed. Don't use this on a shared computer.",
    rememberYes: 'Yes, remember me',
    rememberNo: 'No, thanks',
    rememberedNow: 'Done. This phone now remembers your details and this order.',
    notRemembered: 'OK. Nothing was saved on this phone.',
    savedToList: 'This order is saved under "Your orders on this phone". You can find it under "Track an order".',
  },

  /** "Get updates on Messenger" (thank-you popup and tracking result) */
  messenger: {
    button: 'Get updates on Messenger',
    explain: "We'll message you when it's printing, ready to pick up, or if there's a problem with a file.",
    dialogTitle: 'Get updates on Messenger',
    howTitle: 'What happens',
    how: [
      'Messenger opens a chat with our Facebook Page. Your order ID is already attached.',
      'Tap Send once.',
      "From then on, we message you there by ourselves: when we get your order, when it's printing, when it's ready to pick up, and if a file has a problem.",
    ],
    why: 'Facebook only lets a shop message people who messaged its Page first. That is why the one tap is needed. It is free.',
    previewNote: 'This is a preview, so there is no real Facebook Page yet. On the live site, the button opens this link:',
    linkLabel: 'Messenger link',
    simulate: 'Simulate: I sent the message',
    connectedTitle: 'Connected to Messenger',
    connectedBody: "We'll message you on Messenger when there is news about this order.",
  },

  /** 404 */
  notFound: {
    title: "This page doesn't exist",
    body: 'Check the link, or start from one of these.',
    sendFiles: 'Send files',
    track: 'Track an order',
  },

  /** Plain-language privacy notice next to the consent checkbox (Data Privacy Act of 2012) */
  privacy: {
    intro: (shop: string) =>
      `${shop} collects only what it needs to print your order. Uploads often include IDs and school records, so we keep them private and delete them on a schedule.`,
    whatTitle: 'What we collect',
    what: 'Your name, email, mobile number if you give it, your print settings and the files you upload.',
    whyTitle: 'Why',
    why: 'To print your order, to email you your order ID and status, and to contact you if a file has a problem.',
    whoTitle: 'Who sees it',
    who: 'Only our staff. Files are stored in a private bucket and opened only through links that expire in minutes.',
    keepTitle: 'How long we keep it',
    keep: (days: number) =>
      `We delete your files 7 days after you claim your order, or ${days} days after it is ready if it is never claimed. We keep the order record (no files) for our books.`,
    rightsTitle: 'Your rights',
    rights: (email: string, phone: string) =>
      `Under the Data Privacy Act of 2012 you can ask to see, correct or delete your information. Email ${email} or call ${phone}.`,
  },

  /** Shared order pieces on customer screens */
  bits: {
    filesLabel: 'Files',
  },
};

export const fil: typeof en = {
  layout: {
    navLabel: 'Pangunahing menu',
    howItWorks: 'Paano mag-order',
    sendFiles: 'Ipadala ang mga file',
    trackOrder: 'Tingnan ang order',
    hours: 'Oras ng bukas',
    contact: 'Kontak',
    staff: 'Staff',
    staffSignIn: 'Pag-sign in ng staff',
    homeLink: (shop: string) => `${shop}, simula`,
  },

  home: {
    heroTitle: 'Ipadala ang mga file. Kunin nang naka-print na.',
    heroCopy:
      'I-upload ang inyong mga dokumento at piliin kung paano ito ipi-print. Ie-email namin sa inyo ang order ID. Gamitin ito para tingnan ang status ng order at para kunin ito sa counter.',
    services: 'Printing · Xerox · Scanning · Lamination · Binding',
    formLabel: 'Ipadala ang mga file',
    howTitle: 'Paano mag-order',
    stepLabel: (n: number) => `Hakbang ${n}`,
    steps: [
      { title: 'Ipadala ang mga file', body: 'Maglagay ng PDF, Word o litrato, saka piliin ang papel, kulay at ilang kopya.' },
      { title: 'Matanggap ang order ID', body: 'Ie-email namin ito agad sa inyo. Itago ito para makita ang status at para makuha ang order.' },
      { title: 'Tingnan ang status', body: 'Makikita ninyo ang status kahit kailan gamit ang order ID at email ninyo.' },
      { title: 'Kunin sa counter', body: 'Kapag "Handa nang kunin" na, ipakita ang order ID at magbayad sa shop.' },
    ],
    quickTitle: 'Naipadala na ba ninyo ang mga file?',
    quickBody: 'Ilagay ang order ID at email ninyo para makita kung nasaan na ang order.',
    orderIdLabel: 'Order ID',
    emailLabel: 'Email',
    emailPlaceholder: 'pangalan@email.com',
    quickSubmit: 'Tingnan ang order',
  },

  received: {
    badIdTitle: 'Hindi ito order ID',
    badIdBody: 'Ganito ang itsura ng order ID: PRT-7K3QM. Tingnan ang link sa inyong email, o hanapin ang order gamit ang order ID.',
    badIdAction: 'Tingnan ang order',
    tag: 'Natanggap ang order',
    thanks: (first: string) => `Salamat po, ${first}. Natanggap na namin ang inyong mga file.`,
    thanksNoName: 'Natanggap na namin ang inyong mga file.',
    yourOrderId: 'Ang inyong order ID',
    emailed: (email: string) => `Ipinadala namin ito sa ${email}. Itago ito para makita ang status ng order at para makuha ito sa counter.`,
    keepIt: 'Itago ito para makita ang status ng order at para makuha ito sa counter.',
    trackThis: 'Tingnan ang order na ito',
    summaryTitle: 'Buod ng order',
    submitted: (when: string, summary: string) => `Ipinadala ${when} · ${summary}`,
    yourNotes: 'Inyong bilin',
    detailsTitle: 'Tingnan ang detalye ng order',
    detailsBody: 'Ilagay ang email na ginamit ninyo nang ipadala ang mga file.',
    emailLabel: 'Email',
    showOrder: 'Ipakita ang order',
    nextTitle: 'Ano ang susunod',
    next: [
      'Titingnan namin ang inyong mga file. Kung may hindi maayos na mapi-print, ie-email namin kayo bago mag-print.',
      'Ipi-print namin ang order at ie-email namin kayo kapag handa nang kunin.',
    ],
    nextClaim: (address: string) => `Kunin ito sa ${address}. Ipakita ang order ID at magbayad sa counter.`,
    noEmail: (phone: string) => `Wala pang email pagkalipas ng ilang minuto? Tingnan ang spam folder, o tawagan kami sa ${phone}.`,
    sendMore: 'Magpadala pa ng file',
  },

  thanks: {
    title: (first: string) => `Salamat po, ${first}.`,
    titleNoName: 'Salamat po.',
    received: 'Natanggap na namin ang inyong mga file. Ipi-print namin ang mga ito at ie-email namin kayo kapag handa nang kunin.',
    receivedNoEmail: 'Natanggap na namin ang inyong mga file. Ipi-print namin agad ang mga ito.',
    yourOrderId: 'Ang inyong order ID',
    emailedTo: (email: string) => `Ipinadala rin namin ito sa ${email}.`,
    writeItDown: 'Isulat ang numerong ito o i-screenshot. Kailangan ninyo ito para makuha ang order.',
    payAtCounter: 'Magbayad sa counter pagkuha ng order.',
    idSpoken: (spelled: string) => `Ang inyong order ID ay ${spelled}.`,
    rememberTitle: 'Tandaan ako sa phone na ito?',
    rememberBody:
      'Sa susunod, nakasulat na agad ang inyong pangalan at email, at nakalista na ang inyong mga order kapag titingnan ninyo ang status. Hindi kailangan ng password. Huwag itong gamitin sa computer na ginagamit din ng iba.',
    rememberYes: 'Oo, tandaan ako',
    rememberNo: 'Huwag na',
    rememberedNow: 'Sige po. Tanda na ng phone na ito ang inyong detalye at ang order na ito.',
    notRemembered: 'Sige po. Walang na-save sa phone na ito.',
    savedToList: 'Naka-save na ang order na ito sa "Mga order ninyo sa phone na ito". Makikita ninyo ito kapag pinindot ang "Tingnan ang order".',
  },

  messenger: {
    button: 'Kumuha ng update sa Messenger',
    explain: 'Ime-message namin kayo kapag pinipi-print na, handa nang kunin, o may problema sa file.',
    dialogTitle: 'Kumuha ng update sa Messenger',
    howTitle: 'Ano ang mangyayari',
    how: [
      'Magbubukas ang Messenger na may chat sa Facebook Page ng shop. Kasama na roon ang inyong order ID.',
      'Pindutin ang Send nang isang beses.',
      'Mula noon, kusa namin kayong ime-message doon: kapag natanggap na ang order, pinipi-print na, handa nang kunin, o may problema sa file.',
    ],
    why: 'Pinapayagan lang ng Facebook ang isang shop na mag-message sa taong nag-message muna sa Page nito. Kaya kailangan ang isang pindot na ito. Libre ito.',
    previewNote: 'Preview pa lang ito, kaya wala pang totoong Facebook Page. Sa totoong site, bubuksan ng button ang link na ito:',
    linkLabel: 'Link sa Messenger',
    simulate: 'Kunwari: naipadala ko na ang message',
    connectedTitle: 'Naka-connect sa Messenger',
    connectedBody: 'Ime-message namin kayo sa Messenger kapag may balita sa order na ito.',
  },

  notFound: {
    title: 'Hindi makita ang page na ito',
    body: 'Tingnan ulit ang link, o pumili sa mga ito.',
    sendFiles: 'Ipadala ang mga file',
    track: 'Tingnan ang order',
  },

  privacy: {
    intro: (shop: string) =>
      `Kinukuha lang ng ${shop} ang kailangan para ma-print ang inyong order. Madalas may ID at school records sa mga ina-upload, kaya pribado namin itong itinatago at binubura ayon sa takdang araw.`,
    whatTitle: 'Ano ang kinukuha namin',
    what: 'Ang inyong pangalan, email, numero ng cellphone kung ibibigay ninyo, ang inyong print settings at ang mga file na ina-upload ninyo.',
    whyTitle: 'Bakit',
    why: 'Para ma-print ang order, para ma-email sa inyo ang order ID at status, at para makontak kayo kung may problema sa file.',
    whoTitle: 'Sino ang nakakakita',
    who: 'Ang aming staff lang. Nakatago ang mga file sa pribadong storage at nabubuksan lang gamit ang link na nag-e-expire pagkalipas ng ilang minuto.',
    keepTitle: 'Gaano katagal namin itinatago',
    keep: (days: number) =>
      `Binubura namin ang inyong mga file 7 araw matapos ninyong kunin ang order, o ${days} araw matapos itong maging handa kung hindi ito nakuha. Itinatago namin ang record ng order (walang file) para sa aming talaan.`,
    rightsTitle: 'Ang inyong mga karapatan',
    rights: (email: string, phone: string) =>
      `Ayon sa Data Privacy Act of 2012, maaari ninyong hilinging makita, itama o burahin ang inyong impormasyon. Mag-email sa ${email} o tumawag sa ${phone}.`,
  },

  bits: {
    filesLabel: 'Mga file',
  },
};
