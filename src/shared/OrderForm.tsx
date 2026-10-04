import { useRef, useState, type FormEvent } from 'react';
import { Footprints, Minus, Plus, Send, ShieldCheck, X } from 'lucide-react';
import { isMock, type ColorMode, type PaperSize, type Sides } from '../api';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Dialog,
  Field,
  Icon,
  IconButton,
  Progress,
  Segmented,
  TextAreaField,
  UploadZone,
} from '../design/components';
import { useI18n, type Messages } from '../i18n';
import { ACCEPT_ATTR, MAX_FILES, extensionOf, fileKind, type FileProblem } from '../lib/files';
import { FileBadge } from './FileBadge';
import { usePreferences } from './Preferences';
import { PrivacyNotice } from './PrivacyNotice';
import { FIELD_ORDER, cleanCopies, stepCopies, useOrderDraft, type DraftField, type DraftErrors, type PickedFile } from './useOrderDraft';

/** What the form hands back after a successful submit. */
export interface SubmittedOrder {
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  /** true when this device already remembers the customer (details and the order were saved here) */
  remembered: boolean;
}

export interface OrderFormProps {
  mode: 'customer' | 'walk_in';
  onSubmitted: (result: SubmittedOrder) => void;
}

/** A file problem in words: what is wrong, and what to do. */
export function fileProblemWords(t: Messages['form'], problem: FileProblem, name: string): { what: string; fix: string } {
  const p = t.problems[problem];
  return { what: typeof p.what === 'function' ? p.what(extensionOf(name)) : p.what, fix: p.fix };
}

/** Upload + print settings + details. The customer site and the walk-in screen share it. */
export function OrderForm({ mode, onSubmitted }: OrderFormProps) {
  const { m, fmt } = useI18n();
  const t = m.form;
  const c = m.common;
  const { setPref } = usePreferences();
  const o = useOrderDraft(mode);
  const { walkIn, draft: d, set, errors, submitting, goodFiles, pageTotal, sizeTotal, overall, copiesNum } = o;
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [announce, setAnnounce] = useState('');
  const filesRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const copiesRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);
  const elFor = (k: DraftField): HTMLElement | null =>
    ({ files: filesRef, name: nameRef, email: emailRef, phone: phoneRef, copies: copiesRef, consent: consentRef })[k].current;

  const err = (k: DraftField, e: DraftErrors = errors) => (e[k] ? t.errors[e[k]!] : undefined);

  const focusFirst = (e: DraftErrors) => {
    const first = FIELD_ORDER.find((k) => e[k]);
    if (!first) return;
    const el = elFor(first);
    el?.focus();
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    const found = await o.submit(onSubmitted);
    if (found) focusFirst(found);
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

  const fileMeta = (f: PickedFile) => {
    if (f.problem) {
      const w = fileProblemWords(t, f.problem, f.file.name);
      return fmt.error(`${w.what} ${w.fix}`);
    }
    const size = fmt.bytes(f.file.size);
    if (fileKind(f.file.name) === 'word') return `${size} · ${t.files.wordPages}`;
    if (f.pages === undefined) return `${size} · ${t.files.counting}`;
    if (f.pages === null) return `${size} · ${t.files.countLater}`;
    return `${c.pages(f.pages)} · ${size}`;
  };

  const filesMeta = goodFiles.length
    ? [c.files(goodFiles.length), pageTotal != null ? c.pages(pageTotal) : null, fmt.bytes(sizeTotal)].filter(Boolean).join(' · ')
    : t.files.limits(MAX_FILES);

  const copiesSafe = Number.isInteger(copiesNum) && copiesNum > 0 ? copiesNum : 1;

  return (
    <div className="pp-stack fm-form">
      {!walkIn && (
        <div className="fm-switch">
          <Button variant="secondary" icon={Footprints} onClick={() => setPref('guided', true)} disabled={submitting}>
            {t.switchToGuided}
          </Button>
          <span className="t-small">{t.switchToGuidedHint}</span>
        </div>
      )}
      <p className="mn-sr" aria-live="polite">{announce}</p>

      <form className="pp-two-col" onSubmit={onSubmit} noValidate aria-busy={submitting}>
        <Card title={t.files.title[mode]} meta={filesMeta} className="pp-stack" data-tour="files">
          <div ref={filesRef} tabIndex={-1} className="pp-stack fm-focus-target">
            <UploadZone
              onFiles={o.addFiles}
              accept={ACCEPT_ATTR}
              compact={d.files.length > 0}
              disabled={submitting || d.files.length >= MAX_FILES}
              title={d.files.length >= MAX_FILES ? t.files.zoneFull(MAX_FILES) : d.files.length ? t.files.zoneMore : t.files.zoneEmpty}
              hint={t.files.zoneHint}
              describedBy={errors.files ? `${mode}-files-error` : undefined}
            />
            {d.skipped > 0 && (
              <Alert tone="warning" onClose={() => set({ skipped: 0 })}>
                {t.files.skipped(MAX_FILES, c.files(d.skipped))}
              </Alert>
            )}
            {errors.files && (
              <p className="t-small fm-error-text" id={`${mode}-files-error`}>
                {fmt.error(err('files')!)}
              </p>
            )}
            {d.files.length > 0 && (
              <ul className="pp-file-list" aria-label={t.files.listLabel}>
                {d.files.map((f) => (
                  <li key={f.key} className={f.problem ? 'pp-file-row is-error' : 'pp-file-row'}>
                    <FileBadge name={f.file.name} />
                    <div className="pp-file-info">
                      <span className="pp-file-name" title={f.file.name}>{f.file.name}</span>
                      <span className={f.problem ? 't-meta fm-error-text' : 't-meta'}>{fileMeta(f)}</span>
                      {f.progress != null && <Progress value={f.progress} label={t.files.uploading(f.file.name)} />}
                    </div>
                    <IconButton icon={X} label={t.files.removeFile(f.file.name)} disabled={submitting} onClick={() => removeFile(f)} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="t-small">{t.files.privacy[mode]}</p>
        </Card>

        <div className="pp-stack-6">
          <Card
            data-tour="settings"
            title={t.settings.title}
            meta={goodFiles.length > 1 ? t.settings.appliesN(goodFiles.length) : t.settings.appliesAll}
            className="pp-stack"
          >
            <div className="mn-field">
              <span className="mn-field-label" id={`${mode}-paper`}>{t.settings.paper}</span>
              <Segmented<PaperSize>
                labelledBy={`${mode}-paper`}
                value={d.paper}
                onChange={(paper) => set({ paper })}
                options={(['short', 'a4', 'long'] as PaperSize[]).map((p) => ({ value: p, label: c.paper[p] }))}
              />
              <span className="mn-field-hint">{t.settings.paperHint(c.paper[d.paper], c.paperDims[d.paper])}</span>
            </div>
            <div className="mn-field">
              <span className="mn-field-label" id={`${mode}-color`}>{t.settings.color}</span>
              <Segmented<ColorMode>
                labelledBy={`${mode}-color`}
                value={d.color}
                onChange={(color) => set({ color })}
                wrap
                options={(['bw', 'color'] as ColorMode[]).map((v) => ({ value: v, label: c.color[v] }))}
              />
            </div>
            <div className="pp-row fm-settings-row">
              <div className="mn-field">
                <span className="mn-field-label" id={`${mode}-sides`}>{t.settings.sides}</span>
                <Segmented<Sides>
                  labelledBy={`${mode}-sides`}
                  value={d.sides}
                  onChange={(sides) => set({ sides })}
                  wrap
                  options={(['one', 'two'] as Sides[]).map((s) => ({ value: s, label: c.sides[s] }))}
                />
              </div>
              <div className={errors.copies ? 'mn-field mn-field-error' : 'mn-field'}>
                <label className="mn-field-label" htmlFor={`${mode}-copies`}>{t.settings.copies}</label>
                <div className="pp-stepper">
                  <IconButton
                    icon={Minus}
                    label={t.settings.fewer}
                    variant="quiet"
                    disabled={!(copiesNum > 1)}
                    onClick={() => set({ copies: stepCopies(d.copies, -1) })}
                  />
                  <input
                    ref={copiesRef}
                    id={`${mode}-copies`}
                    inputMode="numeric"
                    value={d.copies}
                    aria-invalid={errors.copies ? true : undefined}
                    aria-describedby={errors.copies ? `${mode}-copies-hint` : undefined}
                    onChange={(e) => set({ copies: cleanCopies(e.target.value) })}
                  />
                  <IconButton
                    icon={Plus}
                    label={t.settings.more}
                    variant="quiet"
                    disabled={copiesNum >= 999}
                    onClick={() => set({ copies: stepCopies(d.copies, 1) })}
                  />
                </div>
                {errors.copies && <span className="mn-field-hint" id={`${mode}-copies-hint`}>{fmt.error(err('copies')!)}</span>}
              </div>
            </div>
            <TextAreaField
              label={t.settings.notes}
              placeholder={t.settings.notesPlaceholder}
              hint={t.settings.notesHint}
              value={d.notes}
              maxLength={1000}
              onChange={(e) => set({ notes: e.target.value })}
            />
          </Card>

          <Card title={t.details.title[mode]} className="pp-stack" data-tour="details">
            {!walkIn && d.welcomeName && (
              <div className="fm-welcome">
                <p>{t.details.welcomeBack(d.welcomeName)}</p>
                <Button size="sm" onClick={forget} disabled={submitting}>{t.details.forget}</Button>
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
              <div className={errors.consent ? 'mn-field mn-field-error' : 'mn-field'}>
                <Checkbox
                  ref={consentRef}
                  checked={d.consent}
                  onChange={(e) => set({ consent: e.target.checked })}
                  aria-describedby={errors.consent ? `${mode}-consent-hint` : undefined}
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
                  <span className="mn-field-hint" id={`${mode}-consent-hint`}>{fmt.error(err('consent')!)}</span>
                )}
              </div>
            )}

            {!walkIn && (
              <div className="pp-turnstile" role="group" aria-label={t.details.spamLabel}>
                <Icon icon={ShieldCheck} />
                <span>{isMock ? t.details.spamMock : t.details.spamLive}</span>
              </div>
            )}

            {o.submitError && (
              <Alert tone="error" title={t.submit.failedTitle[mode]}>
                {o.submitError}
              </Alert>
            )}

            <div className="pp-stack-2" data-tour="submit">
              {goodFiles.length > 0 && (
                <p className="t-meta">
                  {[filesMeta, fmt.settingsSummary({ paper: d.paper, color: d.color, sides: d.sides, copies: copiesSafe })].join(' · ')}
                </p>
              )}
              <Button type="submit" variant="primary" size="lg" fullWidth icon={Send} loading={submitting}>
                {submitting ? t.submit.sending : t.submit.button[mode]}
              </Button>
              {submitting && (
                <Progress
                  showLabel
                  label={overall >= 100 ? t.submit.creating : t.submit.uploadingN(c.files(goodFiles.length))}
                  value={overall}
                />
              )}
              <p className="t-small">{t.submit.footnote[mode]}</p>
            </div>
          </Card>
        </div>
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
      </form>
    </div>
  );
}
