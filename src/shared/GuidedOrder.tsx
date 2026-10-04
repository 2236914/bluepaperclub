/*
 * Step-by-step order for people who find the full form a lot at once: one
 * question per screen, big targets, plain words. Same props and the same
 * draft (useOrderDraft) as OrderForm, so switching between the two keeps the
 * files and everything typed.
 */
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, ExternalLink, Minus, Plus, Send, ShieldCheck, Trash2 } from 'lucide-react';
import { isMock, type ColorMode, type PaperSize, type Sides } from '../api';
import {
  Alert,
  Button,
  ButtonAnchor,
  Checkbox,
  Dialog,
  Field,
  Icon,
  IconButton,
  Progress,
  TextAreaField,
  UploadZone,
  cx,
} from '../design/components';
import { useI18n } from '../i18n';
import { ACCEPT_ATTR, MAX_FILES, extensionOf, fileKind } from '../lib/files';
import { fileProblemWords, type OrderFormProps, type SubmittedOrder } from './OrderForm';
import { usePreferences, useReducedMotion } from './Preferences';
import { PrivacyNotice } from './PrivacyNotice';
import { ReadAloudButton } from './ReadAloudButton';
import { FIELD_ORDER, cleanCopies, stepCopies, useOrderDraft, type DraftField, type OrderMode, type PickedFile } from './useOrderDraft';

export const GUIDED_STEPS = ['files', 'paper', 'print', 'about', 'review'] as const;
export type GuidedStep = (typeof GUIDED_STEPS)[number];

/** The fields each step checks before moving on. */
export const STEP_FIELDS: Record<GuidedStep, DraftField[]> = {
  files: ['files'],
  paper: [],
  print: ['copies'],
  about: ['name', 'email', 'phone', 'consent'],
  review: [],
};

/** The step that holds a field, to jump back to it when the final check finds something missing. */
export function stepForField(field: DraftField): GuidedStep {
  return GUIDED_STEPS.find((s) => STEP_FIELDS[s].includes(field)) ?? 'files';
}

/** Where each mode's wizard was, so switching to the full form and back returns to the same step. */
const savedStep: Record<OrderMode, number> = { customer: 0, walk_in: 0 };

const PAPERS: PaperSize[] = ['short', 'a4', 'long'];

/** Object URLs for "Open to check", revoked when a file goes away or the wizard closes. */
function useObjectUrls(files: PickedFile[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const filesRef = useRef(files);
  filesRef.current = files;
  const keys = files.map((f) => f.key).join(',');
  useEffect(() => {
    const made: Record<string, string> = {};
    for (const f of filesRef.current) made[f.key] = URL.createObjectURL(f.file);
    setUrls(made);
    return () => Object.values(made).forEach((u) => URL.revokeObjectURL(u));
  }, [keys]);
  return urls;
}

/** A big card that is a real radio button; the whole card is the label. */
function ChoiceCard<V extends string>({
  name,
  value,
  checked,
  onPick,
  title,
  sub,
  hint,
  art,
  selectedWord,
}: {
  name: string;
  value: V;
  checked: boolean;
  onPick: (value: V) => void;
  title: ReactNode;
  sub?: ReactNode;
  hint?: ReactNode;
  art?: ReactNode;
  selectedWord: string;
}) {
  return (
    <label className={cx('fm-choice', checked && 'is-on')}>
      <input type="radio" className="fm-choice-input" name={name} value={value} checked={checked} onChange={() => onPick(value)} />
      <span className="fm-choice-mark" aria-hidden="true">
        <Icon icon={Check} />
      </span>
      {art && (
        <span className="fm-choice-art" aria-hidden="true">
          {art}
        </span>
      )}
      <span className="fm-choice-text">
        <span className="fm-choice-title">
          {title}
          {checked && (
            <span className="fm-choice-tag" aria-hidden="true">
              <Icon icon={Check} size={12} />
              {selectedWord}
            </span>
          )}
        </span>
        {sub && <span className="fm-choice-sub">{sub}</span>}
        {hint && <span className="fm-choice-hint">{hint}</span>}
      </span>
    </label>
  );
}

/** A sheet of paper drawn in CSS at the size's real proportions. */
function PaperArt({ size }: { size: PaperSize }) {
  return (
    <span className={`fm-paper fm-paper-${size}`}>
      <span className="fm-paper-lines" />
    </span>
  );
}

function ColorArt({ color }: { color: ColorMode }) {
  return (
    <span className="fm-paper fm-paper-mini">
      <span className={cx('fm-paper-pic', color === 'color' && 'is-color')} />
      <span className="fm-paper-lines" />
    </span>
  );
}

function SidesArt({ sides }: { sides: Sides }) {
  return (
    <span className={cx('fm-sides', sides === 'two' && 'is-two')}>
      {sides === 'two' && <span className="fm-paper fm-paper-mini fm-sides-back"><span className="fm-paper-lines" /></span>}
      <span className="fm-paper fm-paper-mini fm-sides-front"><span className="fm-paper-lines" /></span>
    </span>
  );
}

export function GuidedOrder({ mode, onSubmitted }: OrderFormProps) {
  const { m, fmt } = useI18n();
  const g = m.guided;
  const t = m.form;
  const c = m.common;
  const { setPref } = usePreferences();
  const reduced = useReducedMotion();
  const o = useOrderDraft(mode);
  const { walkIn, draft: d, set, errors, submitting, goodFiles, pageTotal, overall, copiesNum } = o;
  const uid = useId();
  const urls = useObjectUrls(d.files);

  const [stepIndex, setStepIndex] = useState(() => (d.files.length && !d.sent ? savedStep[mode] : 0));
  const [fromReview, setFromReview] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [announce, setAnnounce] = useState('');
  const pendingFocus = useRef<DraftField | null>(null);
  const pendingSummary = useRef(false);
  const firstRender = useRef(true);

  const rootRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const filesRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const copiesRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);
  const elFor = (k: DraftField): HTMLElement | null =>
    ({ files: filesRef, name: nameRef, email: emailRef, phone: phoneRef, copies: copiesRef, consent: consentRef })[k].current;

  const step = GUIDED_STEPS[stepIndex];
  const total = GUIDED_STEPS.length;
  const titles: Record<GuidedStep, string> = {
    files: g.files.title,
    paper: g.paper.title,
    print: g.print.title,
    about: walkIn ? g.about.titleWalkIn : g.about.title,
    review: g.review.title,
  };
  const intros: Record<GuidedStep, string> = {
    files: g.files.intro,
    paper: g.paper.intro,
    print: g.print.intro,
    about: walkIn ? g.about.introWalkIn : g.about.intro,
    review: g.review.intro,
  };

  useEffect(() => {
    savedStep[mode] = stepIndex;
  }, [mode, stepIndex]);

  // On every step change (not the first screen): move focus to the step's heading, or to the
  // field that needs fixing, bring the wizard into view and say where we are.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const field = pendingFocus.current;
    pendingFocus.current = null;
    const target = (field && elFor(field)) || headingRef.current;
    rootRef.current?.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
    target?.focus({ preventScroll: true });
    setAnnounce(g.announce(stepIndex + 1, total, titles[step]));
    setShowSummary(pendingSummary.current);
    pendingSummary.current = false;
  }, [stepIndex]);

  const goTo = (i: number) => {
    setStepIndex(Math.max(0, Math.min(total - 1, i)));
  };

  const stepErrors = STEP_FIELDS[step].filter((f) => errors[f]);

  const next = () => {
    const found = o.validate(STEP_FIELDS[step]);
    const first = FIELD_ORDER.find((f) => found[f]);
    if (first) {
      setShowSummary(true);
      elFor(first)?.focus();
      return;
    }
    setShowSummary(false);
    if (fromReview) {
      setFromReview(false);
      goTo(total - 1);
    } else {
      goTo(stepIndex + 1);
    }
  };

  const back = () => goTo(stepIndex - 1);

  const change = (target: GuidedStep) => {
    setFromReview(true);
    goTo(GUIDED_STEPS.indexOf(target));
  };

  const send = async () => {
    const found = await o.submit((result: SubmittedOrder) => {
      savedStep[mode] = 0;
      onSubmitted(result);
    });
    if (!found) return;
    const first = FIELD_ORDER.find((f) => found[f]);
    if (!first) return;
    pendingFocus.current = first;
    pendingSummary.current = true;
    setFromReview(true);
    goTo(GUIDED_STEPS.indexOf(stepForField(first)));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (step === 'review') void send();
    else next();
  };

  const removeFile = (f: PickedFile) => {
    o.removeFile(f.key);
    setAnnounce(t.files.removed(f.file.name));
    filesRef.current?.focus();
  };

  const forget = () => {
    o.forget();
    setAnnounce(t.details.forgotten);
    nameRef.current?.focus();
  };

  const err = (k: DraftField) => (errors[k] ? t.errors[errors[k]!] : undefined);

  const pagesWords = (f: PickedFile) => {
    if (fileKind(f.file.name) === 'word') return g.files.pagesWord;
    if (f.pages === undefined) return g.files.pagesCounting;
    if (f.pages === null) return g.files.pagesLater;
    return c.pages(f.pages);
  };
  const kindWords = (name: string) => {
    const kind = fileKind(name);
    if (kind) return g.files.kinds[kind];
    const ext = extensionOf(name);
    return ext ? g.files.kindOther(ext.toUpperCase()) : g.files.kinds.other;
  };

  const filesLine = [c.files(goodFiles.length), pageTotal != null ? c.pages(pageTotal) : null].filter(Boolean).join(' · ');
  const copiesSafe = Number.isInteger(copiesNum) && copiesNum > 0 ? copiesNum : 1;
  const printLine = [c.color[d.color], c.sides[d.sides], c.copies(copiesSafe)].join(' · ');

  const readText: Record<GuidedStep, string> = {
    files: [g.files.title, g.files.intro, ...g.files.how].join(' '),
    paper: [g.paper.title, g.paper.intro, ...PAPERS.map((p) => `${c.paper[p]}, ${c.paperDims[p]}: ${g.paper.uses[p]}.`)].join(' '),
    print: [g.print.title, g.print.intro, `${c.color[d.color]}. ${c.sides[d.sides]}. ${c.copies(copiesSafe)}.`].join(' '),
    about: [titles.about, intros.about].join(' '),
    review: g.review.readAloud(filesLine, `${c.paper[d.paper]}, ${c.paperDims[d.paper]}`, printLine, d.name.trim() || '—'),
  };

  /* ---------- steps ---------- */

  const filesStep = (
    <div className="pp-stack">
      <div className="fm-g-how">
        <h3 className="fm-g-h3">{g.files.howTitle}</h3>
        <ol className="fm-g-howlist">
          {g.files.how.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
      </div>
      <div ref={filesRef} tabIndex={-1} className="pp-stack fm-focus-target">
        <UploadZone
          onFiles={(files) => {
            o.addFiles(files);
          }}
          accept={ACCEPT_ATTR}
          compact={d.files.length > 0}
          className="fm-g-upload"
          disabled={submitting || d.files.length >= MAX_FILES}
          title={d.files.length >= MAX_FILES ? t.files.zoneFull(MAX_FILES) : d.files.length ? g.files.zoneMore : g.files.zone}
          hint={g.files.zoneHint}
          describedBy={errors.files ? `${uid}-files-error` : undefined}
        />
        {d.skipped > 0 && (
          <Alert tone="warning" onClose={() => set({ skipped: 0 })}>
            {t.files.skipped(MAX_FILES, c.files(d.skipped))}
          </Alert>
        )}
        {errors.files && (
          <p className="fm-error-text" id={`${uid}-files-error`}>
            {fmt.error(err('files')!)}
          </p>
        )}
      </div>
      {d.files.length > 0 && (
        <div className="pp-stack">
          <div className="pp-stack-2">
            <h3 className="fm-g-h3">{g.files.checkTitle}</h3>
            <p className="t-ink-2">{g.files.checkIntro}</p>
          </div>
          <ul className="fm-g-files" aria-label={t.files.listLabel}>
            {d.files.map((f, i) => {
              const problem = f.problem ? fileProblemWords(t, f.problem, f.file.name) : null;
              return (
                <li key={f.key} className={cx('fm-g-file', problem && 'is-error')}>
                  <span className="t-label">{g.files.fileOf(i + 1, d.files.length)}</span>
                  <span className="fm-g-file-name">{f.file.name}</span>
                  <dl className="fm-g-facts">
                    <div>
                      <dt>{g.files.type}</dt>
                      <dd>{kindWords(f.file.name)}</dd>
                    </div>
                    {!problem && (
                      <div>
                        <dt>{g.files.pages}</dt>
                        <dd>{pagesWords(f)}</dd>
                      </div>
                    )}
                    <div>
                      <dt>{g.files.size}</dt>
                      <dd>{fmt.bytes(f.file.size)}</dd>
                    </div>
                  </dl>
                  {problem && (
                    <Alert tone="error" title={g.files.problemTitle} role="status">
                      <p>{problem.what}</p>
                      <p>
                        <strong>{g.files.fixLabel}</strong> {problem.fix}
                      </p>
                    </Alert>
                  )}
                  {f.progress != null && <Progress value={f.progress} label={t.files.uploading(f.file.name)} />}
                  <div className="fm-g-file-actions">
                    {urls[f.key] && f.file.size > 0 && (
                      <ButtonAnchor
                        href={urls[f.key]}
                        target="_blank"
                        rel="noopener"
                        size="lg"
                        icon={ExternalLink}
                        aria-label={g.files.openLabel(f.file.name)}
                      >
                        {g.files.open}
                      </ButtonAnchor>
                    )}
                    <Button size="lg" icon={Trash2} onClick={() => removeFile(f)} disabled={submitting} aria-label={t.files.removeFile(f.file.name)}>
                      {c.remove}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <p className="t-small">{t.files.privacy[mode]}</p>
    </div>
  );

  const paperStep = (
    <div className="fm-choices fm-choices-3" role="radiogroup" aria-labelledby={`${uid}-title`}>
      {PAPERS.map((p) => (
        <ChoiceCard<PaperSize>
          key={p}
          name={`${uid}-paper`}
          value={p}
          checked={d.paper === p}
          onPick={(paper) => set({ paper })}
          title={c.paper[p]}
          sub={c.paperDims[p]}
          hint={g.paper.uses[p]}
          art={<PaperArt size={p} />}
          selectedWord={g.paper.selected}
        />
      ))}
    </div>
  );

  const printStep = (
    <div className="pp-stack-6">
      <div className="pp-stack-2">
        <h3 className="fm-g-h3" id={`${uid}-color`}>{g.print.colorTitle}</h3>
        <div className="fm-choices fm-choices-2" role="radiogroup" aria-labelledby={`${uid}-color`}>
          {(['bw', 'color'] as ColorMode[]).map((v) => (
            <ChoiceCard<ColorMode>
              key={v}
              name={`${uid}-colorpick`}
              value={v}
              checked={d.color === v}
              onPick={(color) => set({ color })}
              title={c.color[v]}
              hint={g.print.colorHint[v]}
              art={<ColorArt color={v} />}
              selectedWord={g.paper.selected}
            />
          ))}
        </div>
      </div>
      <div className="pp-stack-2">
        <h3 className="fm-g-h3" id={`${uid}-sides`}>{g.print.sidesTitle}</h3>
        <div className="fm-choices fm-choices-2" role="radiogroup" aria-labelledby={`${uid}-sides`}>
          {(['one', 'two'] as Sides[]).map((v) => (
            <ChoiceCard<Sides>
              key={v}
              name={`${uid}-sidespick`}
              value={v}
              checked={d.sides === v}
              onPick={(sides) => set({ sides })}
              title={c.sides[v]}
              hint={g.print.sidesHint[v]}
              art={<SidesArt sides={v} />}
              selectedWord={g.paper.selected}
            />
          ))}
        </div>
      </div>
      <div className={cx('pp-stack-2', errors.copies && 'mn-field-error')}>
        <h3 className="fm-g-h3">
          <label htmlFor={`${uid}-copies`}>{g.print.copiesTitle}</label>
        </h3>
        <div className="fm-g-stepper">
          <IconButton
            icon={Minus}
            label={t.settings.fewer}
            size="lg"
            className="fm-g-step-btn"
            disabled={!(copiesNum > 1)}
            onClick={() => set({ copies: stepCopies(d.copies, -1) })}
          />
          <input
            ref={copiesRef}
            id={`${uid}-copies`}
            inputMode="numeric"
            value={d.copies}
            aria-invalid={errors.copies ? true : undefined}
            aria-describedby={`${uid}-copies-hint`}
            onChange={(e) => set({ copies: cleanCopies(e.target.value) })}
          />
          <IconButton
            icon={Plus}
            label={t.settings.more}
            size="lg"
            className="fm-g-step-btn"
            disabled={copiesNum >= 999}
            onClick={() => set({ copies: stepCopies(d.copies, 1) })}
          />
        </div>
        <span className={cx('mn-field-hint', errors.copies && 'fm-error-text')} id={`${uid}-copies-hint`}>
          {errors.copies ? fmt.error(err('copies')!) : g.print.copiesHint}
        </span>
      </div>
      <TextAreaField
        label={g.print.notesTitle}
        className="fm-g-notes"
        placeholder={t.settings.notesPlaceholder}
        hint={g.print.notesHint}
        value={d.notes}
        maxLength={1000}
        onChange={(e) => set({ notes: e.target.value })}
      />
    </div>
  );

  const aboutStep = (
    <div className="pp-stack">
      {!walkIn && d.welcomeName && (
        <div className="fm-welcome">
          <p>{t.details.welcomeBack(d.welcomeName)}</p>
          <Button onClick={forget} disabled={submitting}>{t.details.forget}</Button>
          <span className="t-small">{t.details.forgetHint}</span>
        </div>
      )}
      <Field
        ref={nameRef}
        label={t.details.name}
        autoComplete={walkIn ? 'off' : 'name'}
        value={d.name}
        error={err('name')}
        onChange={(e) => set({ name: e.target.value })}
      />
      <Field
        ref={emailRef}
        label={t.details.email}
        type="email"
        inputMode="email"
        autoComplete={walkIn ? 'off' : 'email'}
        value={d.email}
        error={err('email')}
        hint={t.details.emailHint[mode]}
        onChange={(e) => set({ email: e.target.value })}
      />
      {!walkIn && <p className="t-small fm-messenger-line">{t.details.messenger}</p>}
      <Field
        ref={phoneRef}
        label={t.details.phone}
        type="tel"
        inputMode="tel"
        autoComplete={walkIn ? 'off' : 'tel'}
        placeholder={t.details.phonePlaceholder}
        value={d.phone}
        error={err('phone')}
        hint={t.details.phoneHint[mode]}
        onChange={(e) => set({ phone: e.target.value })}
      />
      {!walkIn && (
        <div className={errors.consent ? 'mn-field mn-field-error fm-g-consent' : 'mn-field fm-g-consent'}>
          <Checkbox
            ref={consentRef}
            checked={d.consent}
            onChange={(e) => set({ consent: e.target.checked })}
            aria-describedby={errors.consent ? `${uid}-consent-hint` : undefined}
            label={
              <>
                {t.details.consentBefore}
                <button type="button" className="pp-linkbtn" onClick={() => setPrivacyOpen(true)}>
                  {t.details.consentLink}
                </button>
                {t.details.consentAfter}
              </>
            }
          />
          {errors.consent && (
            <span className="mn-field-hint" id={`${uid}-consent-hint`}>{fmt.error(err('consent')!)}</span>
          )}
        </div>
      )}
      {!walkIn && (
        <div className="pp-turnstile" role="group" aria-label={t.details.spamLabel}>
          <Icon icon={ShieldCheck} />
          <span>{isMock ? t.details.spamMock : t.details.spamLive}</span>
        </div>
      )}
    </div>
  );

  const section = (id: GuidedStep, heading: string, body: ReactNode) => (
    <section className="fm-g-sum" aria-labelledby={`${uid}-sum-${id}`}>
      <div className="fm-g-sum-head">
        <h3 className="fm-g-h3" id={`${uid}-sum-${id}`}>{heading}</h3>
        <Button onClick={() => change(id)} disabled={submitting} aria-label={g.review.changeLabel(heading)}>
          {c.change}
        </Button>
      </div>
      {body}
    </section>
  );

  const reviewStep = (
    <div className="pp-stack">
      {section(
        'files',
        g.review.filesSection,
        <>
          <p className="t-ink-2">{filesLine}</p>
          <ul className="fm-g-sum-files">
            {goodFiles.map((f) => (
              <li key={f.key}>
                <span className="fm-g-sum-file-name">{f.file.name}</span>
                <span className="t-meta">{pagesWords(f)}</span>
                {f.progress != null && <Progress value={f.progress} label={t.files.uploading(f.file.name)} />}
              </li>
            ))}
          </ul>
        </>,
      )}
      {section(
        'paper',
        g.review.paperSection,
        <p>
          <strong>{c.paper[d.paper]}</strong> · {c.paperDims[d.paper]}
        </p>,
      )}
      {section(
        'print',
        g.review.printSection,
        <>
          <p>{printLine}</p>
          <p className="t-ink-2">{d.notes.trim() ? `${g.print.notesTitle}: ${d.notes.trim()}` : g.review.noNotes}</p>
        </>,
      )}
      {section(
        'about',
        walkIn ? g.about.titleWalkIn : g.review.aboutSection,
        <>
          <p>
            <strong>{d.name.trim()}</strong>
          </p>
          <p className="fm-g-break">{d.email.trim() || g.review.noEmail}</p>
          <p className="t-ink-2">{d.phone.trim() || g.review.noPhone}</p>
        </>,
      )}
      {o.submitError && (
        <Alert tone="error" title={t.submit.failedTitle[mode]}>
          {o.submitError}
        </Alert>
      )}
      {submitting && (
        <Progress
          showLabel
          label={overall >= 100 ? t.submit.creating : `${g.review.overall} · ${t.submit.uploadingN(c.files(goodFiles.length))}`}
          value={overall}
        />
      )}
      <p className="t-small">{t.submit.footnote[mode]}</p>
    </div>
  );

  const body: Record<GuidedStep, ReactNode> = {
    files: filesStep,
    paper: paperStep,
    print: printStep,
    about: aboutStep,
    review: reviewStep,
  };

  const isLast = step === 'review';
  const nextLabel = fromReview ? g.backToSummary : step === 'files' && d.files.length > 0 ? g.files.confirm : c.next;

  return (
    <section ref={rootRef} className="fm-guided" data-tour="guided" aria-label={g.rootLabel} aria-busy={submitting}>
      <div className="fm-g-progress">
        <p className="fm-g-count">{g.stepOf(stepIndex + 1, total)}</p>
        <Progress value={((stepIndex + 1) / total) * 100} label={g.stepOf(stepIndex + 1, total)} />
      </div>
      <p className="mn-sr" aria-live="polite" aria-atomic="true">
        {announce}
      </p>

      <form className="fm-g-form" onSubmit={onSubmit} noValidate>
        <div className="mn-card fm-g-card">
          <div className="fm-g-titlebar">
            <h2 ref={headingRef} tabIndex={-1} id={`${uid}-title`} className="fm-g-title fm-focus-target">
              {titles[step]}
            </h2>
            <ReadAloudButton text={readText[step]} />
          </div>
          <p className="fm-g-intro">{intros[step]}</p>

          {showSummary && stepErrors.length > 0 && (
            <Alert tone="error" title={g.missingTitle}>
              <ul className="fm-g-missing">
                {stepErrors.map((f) => (
                  <li key={f}>{t.errors[errors[f]!]}</li>
                ))}
              </ul>
            </Alert>
          )}

          {body[step]}
        </div>

        <div className="fm-g-nav">
          {stepIndex > 0 ? (
            <Button size="lg" icon={ArrowLeft} onClick={back} disabled={submitting} className="fm-g-back">
              {c.back}
            </Button>
          ) : (
            <span className="fm-g-nav-spacer" />
          )}
          {isLast ? (
            <Button type="submit" variant="primary" size="lg" icon={Send} loading={submitting} className="fm-g-next">
              {submitting ? g.review.sending : walkIn ? g.review.sendWalkIn : g.review.send}
            </Button>
          ) : (
            <Button type="submit" variant="primary" size="lg" iconEnd={ArrowRight} className="fm-g-next">
              {nextLabel}
            </Button>
          )}
        </div>
      </form>

      <p className="fm-g-showall">
        <button type="button" className="pp-linkbtn" onClick={() => setPref('guided', false)} disabled={submitting}>
          {g.showAll}
        </button>
      </p>

      <Dialog
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        title={t.privacyTitle}
        footer={
          <Button
            variant="primary"
            onClick={() => {
              set({ consent: true });
              setPrivacyOpen(false);
            }}
          >
            {t.agree}
          </Button>
        }
      >
        <PrivacyNotice />
      </Dialog>
    </section>
  );
}
