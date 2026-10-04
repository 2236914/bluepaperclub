/* Messages for the track area. Same rules as common.ts: `fil` must match `en` key for key. */
export const en = {
  title: 'Track your order',
  intro: 'Use the order ID from your confirmation email.',
  formTitle: 'Find an order',
  otherFormTitle: 'Track another order',
  orderIdLabel: 'Order ID',
  emailLabel: 'Email',
  emailPlaceholder: 'you@email.com',
  submit: 'Track order',
  errors: {
    enterCode: 'Enter your order ID.',
    badCode: 'Order IDs look like PRT-7K3QM.',
    enterEmail: 'Enter the email you used for this order.',
  },
  idle: 'Your order ID starts with PRT- and is in the email we sent when you submitted your files.',
  missingTitle: 'No order found',
  missingBody: (phone: string) =>
    `Check the order ID in your email, and use the same email address you sent the files from. Walk-in orders without an email can't be tracked online; call us at ${phone}.`,
  errorTitle: "We couldn't check your order",
  /** for screen readers when a result comes in */
  announce: {
    loading: 'Looking for your order',
    found: (code: string, status: string) => `Found ${code}. Status: ${status}.`,
    changed: (code: string, status: string) => `${code} has a new status: ${status}.`,
    missing: 'No order found.',
  },

  result: {
    submitted: (when: string, summary: string) => `Sent ${when} · ${summary}`,
    readyTitle: 'Ready at the counter',
    pickupTitle: 'Pickup details',
    address: 'Address',
    hours: 'Hours',
    payNote: 'Show your order ID at the counter. You pay when you claim.',
    yourOrder: 'Your order',
    problem: (phone: string) => `Something wrong with your order? Call us at ${phone} and mention your order ID.`,
  },

  /** "Your orders on this phone" (remember me) */
  recent: {
    title: 'Your orders on this phone',
    intro: 'Choose an order to see its status.',
    rememberedAs: (name: string) => `This phone remembers you as ${name}.`,
    sent: (when: string) => `Sent ${when}`,
    view: 'View',
    viewLabel: (code: string) => `View ${code}`,
    forget: 'Forget me on this phone',
    forgetTitle: 'Forget me on this phone?',
    forgetBody:
      'This removes your name, email, mobile number and order list from this phone. Your orders stay with the shop and are not cancelled.',
    forgetConfirm: 'Forget me',
    forgotten: 'Done. This phone no longer remembers you.',
  },

  /** Progress steps: Received → Printing → Ready → Claimed */
  steps: {
    label: 'Order progress',
    now: 'Now',
    notYet: 'Not yet',
    received: {
      done: 'We have your files.',
      current: 'We have your files and will print them soon.',
      todo: '',
    },
    printing: {
      done: 'Printed.',
      current: 'Your order is on the printer.',
      todo: "We'll start soon.",
    },
    ready: {
      done: 'Your order was ready at the counter.',
      current: 'Come to the counter with your order ID. You pay when you claim.',
      todo: "We'll email you as soon as it's ready.",
    },
    claimed: {
      done: 'Picked up. Thanks for printing with us.',
      current: '',
      todo: '',
    },
    onHold: 'On hold: a problem with a file',
    issueHelp: (phone: string) => `Reply to our email or call ${phone}. We'll continue as soon as it's fixed.`,
  },
};

export const fil: typeof en = {
  title: 'Tingnan ang status ng order',
  intro: 'Gamitin ang order ID na nasa email na ipinadala namin.',
  formTitle: 'Hanapin ang order',
  otherFormTitle: 'Tingnan ang ibang order',
  orderIdLabel: 'Order ID',
  emailLabel: 'Email',
  emailPlaceholder: 'pangalan@email.com',
  submit: 'Tingnan ang order',
  errors: {
    enterCode: 'Ilagay ang order ID.',
    badCode: 'Ganito ang itsura ng order ID: PRT-7K3QM.',
    enterEmail: 'Ilagay ang email na ginamit ninyo sa order na ito.',
  },
  idle: 'Nagsisimula sa PRT- ang order ID. Nasa email ito na ipinadala namin nang ipadala ninyo ang mga file.',
  missingTitle: 'Walang nahanap na order',
  missingBody: (phone: string) =>
    `Tingnan ulit ang order ID sa inyong email, at gamitin ang parehong email na ginamit ninyo sa pagpapadala ng file. Hindi makikita online ang walk-in na order na walang email; tawagan kami sa ${phone}.`,
  errorTitle: 'Hindi namin matingnan ang order ninyo',
  announce: {
    loading: 'Hinahanap ang inyong order',
    found: (code: string, status: string) => `Nahanap ang ${code}. Status: ${status}.`,
    changed: (code: string, status: string) => `May bagong status ang ${code}: ${status}.`,
    missing: 'Walang nahanap na order.',
  },

  result: {
    submitted: (when: string, summary: string) => `Ipinadala ${when} · ${summary}`,
    readyTitle: 'Handa na sa counter',
    pickupTitle: 'Saan kukunin',
    address: 'Address',
    hours: 'Oras ng bukas',
    payNote: 'Ipakita ang order ID sa counter. Magbayad pagkuha ng order.',
    yourOrder: 'Ang inyong order',
    problem: (phone: string) => `May mali ba sa order? Tawagan kami sa ${phone} at sabihin ang order ID.`,
  },

  recent: {
    title: 'Mga order ninyo sa phone na ito',
    intro: 'Pumili ng order para makita ang status nito.',
    rememberedAs: (name: string) => `Tanda kayo ng phone na ito bilang ${name}.`,
    sent: (when: string) => `Ipinadala ${when}`,
    view: 'Tingnan',
    viewLabel: (code: string) => `Tingnan ang ${code}`,
    forget: 'Kalimutan ako sa phone na ito',
    forgetTitle: 'Kalimutan ako sa phone na ito?',
    forgetBody:
      'Buburahin sa phone na ito ang inyong pangalan, email, numero ng cellphone at listahan ng order. Nasa shop pa rin ang inyong mga order at hindi ito makakansela.',
    forgetConfirm: 'Oo, kalimutan ako',
    forgotten: 'Tapos na. Hindi na kayo tanda ng phone na ito.',
  },

  steps: {
    label: 'Takbo ng order',
    now: 'Ngayon',
    notYet: 'Hindi pa',
    received: {
      done: 'Natanggap na namin ang inyong mga file.',
      current: 'Natanggap na namin ang inyong mga file. Ipi-print namin agad ang mga ito.',
      todo: '',
    },
    printing: {
      done: 'Na-print na.',
      current: 'Pinipi-print na ang inyong order.',
      todo: 'Sisimulan namin agad.',
    },
    ready: {
      done: 'Naihanda na ang order sa counter.',
      current: 'Pumunta sa counter dala ang order ID. Magbayad pagkuha ng order.',
      todo: 'Ie-email namin kayo kapag handa na.',
    },
    claimed: {
      done: 'Nakuha na. Salamat po sa pagpapa-print sa amin.',
      current: '',
      todo: '',
    },
    onHold: 'Nakahinto: may problema sa isang file',
    issueHelp: (phone: string) => `Sagutin ang aming email o tumawag sa ${phone}. Itutuloy namin agad kapag naayos na.`,
  },
};
