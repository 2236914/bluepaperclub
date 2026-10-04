/* Messages for the form area. Same rules as common.ts: `fil` must match `en` key for key.
 * The full order form serves two audiences: customers online ('customer', polite) and
 * staff adding a walk-in order at the counter ('walk_in', plain). Where they differ the
 * key holds { customer, walk_in }. */
export const en = {
  switchToGuided: 'Guide me, one step at a time',
  switchToGuidedHint: 'One question per screen, with big buttons.',

  files: {
    title: { customer: '1. Your files', walk_in: '1. Files' },
    limits: (max: number) => `Up to ${max} files, 20 MB each`,
    zoneEmpty: 'Drag your files here, or choose them',
    zoneMore: 'Add more files',
    zoneFull: (max: number) => `You have added ${max} files`,
    zoneHint: 'PDF, Word, JPG or PNG · up to 20 MB each',
    skipped: (max: number, left: string) => `You can send up to ${max} files per order. We left out ${left}. Send them in a second order.`,
    listLabel: 'Files to print',
    wordPages: 'Pages counted after we convert it to PDF',
    counting: 'Counting pages…',
    countLater: "We'll count the pages",
    uploading: (name: string) => `Uploading ${name}`,
    removeFile: (name: string) => `Remove ${name}`,
    removed: (name: string) => `Removed ${name}.`,
    privacy: {
      customer: 'Your files stay private. We delete them 7 days after you claim your order.',
      walk_in: 'Files are deleted 7 days after the order is claimed.',
    },
  },

  /** Why a file can't be printed, and what to do about it */
  problems: {
    unsupported: { what: (ext: string) => `We can't print .${ext} files.`, fix: 'Save it as a PDF and try again.' },
    unknownType: { what: "We can't tell what kind of file this is.", fix: 'Upload a PDF, Word file, JPG or PNG.' },
    tooBig: { what: 'This file is over 20 MB.', fix: 'Try a smaller file or split it in two.' },
    empty: { what: 'This file is empty.', fix: 'Check that it opens on your phone or computer, then add it again.' },
  },

  settings: {
    title: '2. Print settings',
    appliesAll: 'Applies to all files',
    appliesN: (n: number) => `Applies to all ${n} files`,
    paper: 'Paper size',
    paperHint: (size: string, dims: string) => `${size} is ${dims}`,
    color: 'Color',
    sides: 'Sides',
    copies: 'Copies',
    fewer: 'Fewer copies',
    more: 'More copies',
    notes: 'Notes',
    notesPlaceholder: 'Anything we should know',
    notesHint: 'For example: staple each chapter, or print page 3 in color only.',
  },

  details: {
    title: { customer: '3. Your details', walk_in: '3. Customer' },
    name: 'Full name',
    email: 'Email',
    emailHint: {
      customer: "We'll send your order ID here.",
      walk_in: "Optional. We'll email the order ID and when it's ready.",
    },
    phone: 'Mobile number',
    phonePlaceholder: '0917 123 4567',
    phoneHint: {
      customer: "Optional. We'll call only if there's a problem with your files.",
      walk_in: 'Optional. For orders without an email.',
    },
    messenger: "Want updates on Messenger? After you send your order, there's a button for it.",
    welcomeBack: (name: string) => `Welcome back, ${name}. Not you?`,
    forget: 'Clear these details',
    forgetHint: 'This also clears the list of orders saved on this phone.',
    forgotten: 'Cleared. Type your details below.',
    consentBefore: 'I agree to the ',
    consentLink: 'privacy notice',
    consentAfter: '. You use my files only to print this order.',
    spamLabel: 'Spam check',
    spamMock: 'Spam check (Cloudflare Turnstile) goes here',
    spamLive: 'Checking you are human…',
  },

  submit: {
    sending: 'Sending files',
    button: { customer: 'Submit order', walk_in: 'Add order' },
    creating: 'Creating the order',
    uploadingN: (files: string) => `Uploading ${files}`,
    failedTitle: { customer: "We couldn't send your order", walk_in: "Couldn't add the order" },
    footnote: {
      customer: 'Pickup only. You pay at the counter when you claim your order.',
      walk_in: 'The order shows up on the dashboard as Received.',
    },
  },

  privacyTitle: 'Privacy notice',
  agree: 'I agree',

  /** Validation, by code from useOrderDraft */
  errors: {
    filesNone: 'Add at least one file to print.',
    filesBad: "Remove the files we can't print first.",
    nameMissing: 'Enter your name.',
    nameMissingWalkIn: 'Enter the customer name.',
    emailMissing: 'Enter your email so we can send your order ID.',
    emailInvalid: 'Enter a valid email address, like juan@gmail.com.',
    phoneShort: 'Enter a full mobile number, or leave it blank.',
    copiesRange: 'Enter 1 to 999 copies.',
    consentMissing: 'Tick the box to agree to the privacy notice.',
  },
};

export const fil: typeof en = {
  switchToGuided: 'Gabayan ako, isa-isang hakbang',
  switchToGuidedHint: 'Isang tanong bawat screen, may malalaking button.',

  files: {
    title: { customer: '1. Ang inyong mga file', walk_in: '1. Mga file' },
    limits: (max: number) => `Hanggang ${max} file, 20 MB bawat isa`,
    zoneEmpty: 'I-drag dito ang mga file, o pindutin para pumili',
    zoneMore: 'Magdagdag pa ng file',
    zoneFull: (max: number) => `Umabot na sa ${max} file`,
    zoneHint: 'PDF, Word, JPG o PNG · hanggang 20 MB bawat isa',
    skipped: (max: number, left: string) =>
      `Hanggang ${max} file lang bawat order. Hindi namin naisama ang ${left}. Ipadala ang mga ito sa isa pang order.`,
    listLabel: 'Mga file na ipi-print',
    wordPages: 'Bibilangin ang pahina kapag nagawa na itong PDF',
    counting: 'Binibilang ang pahina…',
    countLater: 'Kami na ang bibilang ng pahina',
    uploading: (name: string) => `Ina-upload ang ${name}`,
    removeFile: (name: string) => `Alisin ang ${name}`,
    removed: (name: string) => `Inalis ang ${name}.`,
    privacy: {
      customer: 'Pribado ang inyong mga file. Buburahin namin ang mga ito 7 araw matapos ninyong kunin ang order.',
      walk_in: 'Buburahin ang mga file 7 araw matapos makuha ang order.',
    },
  },

  problems: {
    unsupported: { what: (ext: string) => `Hindi namin ma-print ang .${ext} na file.`, fix: 'I-save ito bilang PDF at subukan ulit.' },
    unknownType: { what: 'Hindi namin matukoy kung anong klaseng file ito.', fix: 'Mag-upload ng PDF, Word, JPG o PNG.' },
    tooBig: { what: 'Lampas sa 20 MB ang file na ito.', fix: 'Gumamit ng mas maliit na file, o hatiin ito sa dalawa.' },
    empty: { what: 'Walang laman ang file na ito.', fix: 'Tingnan kung bumubukas ito sa phone o computer, saka idagdag ulit.' },
  },

  settings: {
    title: '2. Paano ipi-print',
    appliesAll: 'Para sa lahat ng file',
    appliesN: (n: number) => `Para sa lahat ng ${n} file`,
    paper: 'Laki ng papel',
    paperHint: (size: string, dims: string) => `Ang ${size} ay ${dims}`,
    color: 'Kulay',
    sides: 'Panig',
    copies: 'Kopya',
    fewer: 'Bawasan ang kopya',
    more: 'Dagdagan ang kopya',
    notes: 'Bilin',
    notesPlaceholder: 'Anumang dapat naming malaman',
    notesHint: 'Halimbawa: i-staple ang bawat kabanata, o pahina 3 lang ang may kulay.',
  },

  details: {
    title: { customer: '3. Ang inyong detalye', walk_in: '3. Customer' },
    name: 'Buong pangalan',
    email: 'Email',
    emailHint: {
      customer: 'Dito namin ipapadala ang inyong order ID.',
      walk_in: 'Hindi kailangan. Dito ipapadala ang order ID at ang abiso kapag handa na.',
    },
    phone: 'Numero ng cellphone',
    phonePlaceholder: '0917 123 4567',
    phoneHint: {
      customer: 'Hindi kailangan. Tatawag lang kami kung may problema sa inyong file.',
      walk_in: 'Hindi kailangan. Para sa order na walang email.',
    },
    messenger: 'Gusto ng update sa Messenger? Pagkatapos ninyong ipadala, may button para dito.',
    welcomeBack: (name: string) => `Maligayang pagbabalik po, ${name}. Hindi kayo ito?`,
    forget: 'Burahin ang mga detalyeng ito',
    forgetHint: 'Mabubura rin ang listahan ng mga order na naka-save sa phone na ito.',
    forgotten: 'Nabura na. Ilagay po ang inyong detalye sa ibaba.',
    consentBefore: 'Sumasang-ayon ako sa ',
    consentLink: 'abiso sa privacy',
    consentAfter: '. Gagamitin lang ninyo ang aking mga file para i-print ang order na ito.',
    spamLabel: 'Pagsusuri laban sa spam',
    spamMock: 'Dito ilalagay ang spam check (Cloudflare Turnstile)',
    spamLive: 'Tinitiyak na tao kayo…',
  },

  submit: {
    sending: 'Ipinapadala ang mga file',
    button: { customer: 'Ipadala ang order', walk_in: 'Idagdag ang order' },
    creating: 'Ginagawa ang order',
    uploadingN: (files: string) => `Ina-upload ang ${files}`,
    failedTitle: { customer: 'Hindi namin naipadala ang inyong order', walk_in: 'Hindi naidagdag ang order' },
    footnote: {
      customer: 'Kukunin ninyo ito sa shop. Magbabayad kayo sa counter kapag kinuha ninyo ang order.',
      walk_in: 'Lalabas ang order sa dashboard bilang Natanggap.',
    },
  },

  privacyTitle: 'Abiso sa privacy',
  agree: 'Sumasang-ayon ako',

  errors: {
    filesNone: 'Magdagdag ng kahit isang file na ipi-print.',
    filesBad: 'Alisin muna ang mga file na hindi namin ma-print.',
    nameMissing: 'Ilagay po ang inyong pangalan.',
    nameMissingWalkIn: 'Ilagay ang pangalan ng customer.',
    emailMissing: 'Ilagay po ang inyong email para maipadala namin ang order ID.',
    emailInvalid: 'Ilagay ang tamang email, halimbawa juan@gmail.com.',
    phoneShort: 'Ilagay ang buong numero ng cellphone, o iwanang blangko.',
    copiesRange: 'Maglagay ng 1 hanggang 999 na kopya.',
    consentMissing: 'Lagyan ng tsek ang kahon para sumang-ayon sa abiso sa privacy.',
  },
};
