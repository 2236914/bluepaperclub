import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Minus, Plus, Send, ShieldCheck, X } from 'lucide-react';
import { api, errorMessage, isMock, type ColorMode, type PaperSize, type Sides } from '../api';
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
import { ACCEPT_ATTR, MAX_FILES, countPages, fileKind, validateFile } from '../lib/files';
import { COLOR_LABEL, PAPER_HINT, PAPER_LABEL, SIDES_LABEL, formatBytes, isEmail, plural, settingsSummary } from '../lib/format';
import { FileBadge } from './FileBadge';
import { PrivacyNotice } from './PrivacyNotice';

interface PickedFile {
  key: string;
  file: File;
  /** undefined while counting */
  pages: number | null | undefined;
  error: string | null;
  progress: number | null;
}

type FieldName = 'files' | 'name' | 'email' | 'phone' | 'copies' | 'consent';

export interface OrderFormProps {
  mode: 'customer' | 'walk_in';
  onSubmitted: (result: { code: string; email: string | null; name: string }) => void;
}

let keySeq = 0;

/** Upload + print settings + details. The customer site and the walk-in screen share it. */
export function OrderForm({ mode, onSubmitted }: OrderFormProps) {
  const walkIn = mode === 'walk_in';
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [paper, setPaper] = useState<PaperSize>('short');
  const [color, setColor] = useState<ColorMode>('bw');
  const [sides, setSides] = useState<Sides>('one');
  const [copies, setCopies] = useState('1');
  const [notes, setNotes] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const refs = {
    files: useRef<HTMLDivElement>(null),
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
    copies: useRef<HTMLInputElement>(null),
    consent: useRef<HTMLInputElement>(null),
  };

  const goodFiles = files.filter((f) => !f.error);
  const pageTotal = useMemo(() => {
    let sum = 0;
    for (const f of goodFiles) {
      if (f.pages == null) return null;
      sum += f.pages;
    }
    return sum;
  }, [goodFiles]);
  const sizeTotal = goodFiles.reduce((s, f) => s + f.file.size, 0);
  const copiesNum = Number.parseInt(copies, 10);
  const overall = goodFiles.length ? goodFiles.reduce((sum, f) => sum + (f.progress ?? 0), 0) / goodFiles.length : 0;

  const addFiles = (incoming: File[]) => {
    const room = MAX_FILES - files.length;
    const accepted = incoming.slice(0, Math.max(0, room));
    setSkipped(incoming.length - accepted.length);
    const picked: PickedFile[] = accepted.map((file) => ({
      key: `f${++keySeq}`,
      file,
      pages: undefined,
      error: validateFile(file),
      progress: null,
    }));
    setFiles((prev) => [...prev, ...picked]);
    setErrors((e) => ({ ...e, files: undefined }));
    picked.forEach((p) => {
      if (p.error) return;
      countPages(p.file).then((pages) => {
        setFiles((prev) => prev.map((f) => (f.key === p.key ? { ...f, pages } : f)));
      });
    });
  };

  const removeFile = (key: string) => {
    setFiles((prev) => prev.filter((f) => f.key !== key));
    setSkipped(0);
  };

  const validate = (): Partial<Record<FieldName, string>> => {
    const e: Partial<Record<FieldName, string>> = {};
    if (goodFiles.length === 0) e.files = 'Add at least one file to print.';
    else if (files.some((f) => f.error)) e.files = "Remove the files we can't print first.";
    if (!name.trim()) e.name = walkIn ? 'Enter the customer name.' : 'Enter your name.';
    if (!walkIn && !email.trim()) e.email = 'Enter your email so we can send your order ID.';
    else if (email.trim() && !isEmail(email)) e.email = 'Enter a valid email address, like juan@gmail.com.';
    if (phone.trim() && phone.replace(/\D/g, '').length < 7) e.phone = 'Enter a full mobile number, or leave it blank.';
    if (!Number.isInteger(copiesNum) || copiesNum < 1 || copiesNum > 999) e.copies = 'Enter 1 to 999 copies.';
    if (!walkIn && !consent) e.consent = 'Tick the box to agree to the privacy notice.';
    return e;
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setSubmitError(null);
    const e = validate();
    setErrors(e);
    const first = (['files', 'name', 'email', 'phone', 'copies', 'consent'] as FieldName[]).find((k) => e[k]);
    if (first) {
      const el = refs[first].current;
      el?.focus();
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    setSubmitting(true);
    setFiles((prev) => prev.map((f) => ({ ...f, progress: 0 })));
    const toSend = files.filter((f) => !f.error);
    try {
      const { code } = await api.submitOrder(
        {
          customerName: name,
          email: email.trim() || null,
          phone: phone.trim() || null,
          paper,
          color,
          sides,
          copies: copiesNum,
          notes: notes.trim() || null,
          files: toSend.map((f) => f.file),
          source: walkIn ? 'walk_in' : 'online',
          turnstileToken: walkIn ? null : 'mock-token',
        },
        (index, pct) => {
          const key = toSend[index]?.key;
          setFiles((prev) => prev.map((f) => (f.key === key ? { ...f, progress: pct } : f)));
        },
      );
      onSubmitted({ code, email: email.trim() || null, name: name.trim() });
    } catch (err) {
      setSubmitError(errorMessage(err));
      setFiles((prev) => prev.map((f) => ({ ...f, progress: null })));
      setSubmitting(false);
    }
  };

  const fileMeta = (f: PickedFile) => {
    if (f.error) return `Error: ${f.error}`;
    const size = formatBytes(f.file.size);
    if (fileKind(f.file.name) === 'word') return `${size} · Pages counted after we convert it to PDF`;
    if (f.pages === undefined) return `${size} · Counting pages…`;
    if (f.pages === null) return `${size} · We'll count the pages`;
    return `${plural(f.pages, 'page')} · ${size}`;
  };

  const filesMeta = goodFiles.length
    ? [plural(goodFiles.length, 'file'), pageTotal != null ? plural(pageTotal, 'page') : null, formatBytes(sizeTotal)].filter(Boolean).join(' · ')
    : `Up to ${MAX_FILES} files, 20 MB each`;

  return (
    <form className="pp-two-col" onSubmit={onSubmit} noValidate aria-busy={submitting}>
      <Card title={walkIn ? '1. Files' : '1. Your files'} meta={filesMeta} className="pp-stack">
        <div ref={refs.files} tabIndex={-1} className="pp-stack" style={{ outline: 'none' }}>
          <UploadZone
            onFiles={addFiles}
            accept={ACCEPT_ATTR}
            compact={files.length > 0}
            disabled={submitting || files.length >= MAX_FILES}
            title={files.length >= MAX_FILES ? 'You have added 10 files' : files.length ? 'Add more files' : 'Drag your files here, or choose them'}
            hint="PDF, Word, JPG or PNG · up to 20 MB each"
            describedBy={errors.files ? 'files-error' : undefined}
          />
          {skipped > 0 && (
            <Alert tone="warning" onClose={() => setSkipped(0)}>
              You can send up to {MAX_FILES} files per order. We left out {plural(skipped, 'file')}. Send them in a second order.
            </Alert>
          )}
          {errors.files && (
            <p className="t-small" id="files-error" style={{ color: 'var(--ink)' }}>
              Error: {errors.files}
            </p>
          )}
          {files.length > 0 && (
            <ul className="pp-file-list" aria-label="Files to print">
              {files.map((f) => (
                <li key={f.key} className={f.error ? 'pp-file-row is-error' : 'pp-file-row'}>
                  <FileBadge name={f.file.name} />
                  <div className="pp-file-info">
                    <span className="pp-file-name" title={f.file.name}>{f.file.name}</span>
                    <span className="t-meta" style={f.error ? { color: 'var(--ink)' } : undefined}>{fileMeta(f)}</span>
                    {f.progress != null && <Progress value={f.progress} label={`Uploading ${f.file.name}`} />}
                  </div>
                  <IconButton icon={X} label={`Remove ${f.file.name}`} disabled={submitting} onClick={() => removeFile(f.key)} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="t-small">
          {walkIn
            ? 'Files are deleted 7 days after the order is claimed.'
            : 'Your files stay private. We delete them 7 days after you claim your order.'}
        </p>
      </Card>

      <div className="pp-stack-6">
        <Card title="2. Print settings" meta={`Applies to all ${goodFiles.length > 1 ? plural(goodFiles.length, 'file') : 'files'}`} className="pp-stack">
          <div className="mn-field">
            <span className="mn-field-label" id={`${mode}-paper`}>Paper size</span>
            <Segmented<PaperSize>
              labelledBy={`${mode}-paper`}
              value={paper}
              onChange={setPaper}
              options={(['short', 'a4', 'long'] as PaperSize[]).map((p) => ({ value: p, label: PAPER_LABEL[p] }))}
            />
            <span className="mn-field-hint">
              {PAPER_LABEL[paper]} is {PAPER_HINT[paper]}
            </span>
          </div>
          <div className="mn-field">
            <span className="mn-field-label" id={`${mode}-color`}>Color</span>
            <Segmented<ColorMode>
              labelledBy={`${mode}-color`}
              value={color}
              onChange={setColor}
              options={(['bw', 'color'] as ColorMode[]).map((c) => ({ value: c, label: COLOR_LABEL[c] }))}
            />
          </div>
          <div className="pp-row" style={{ alignItems: 'flex-start', gap: 24 }}>
            <div className="mn-field">
              <span className="mn-field-label" id={`${mode}-sides`}>Sides</span>
              <Segmented<Sides>
                labelledBy={`${mode}-sides`}
                value={sides}
                onChange={setSides}
                options={(['one', 'two'] as Sides[]).map((s) => ({ value: s, label: SIDES_LABEL[s] }))}
              />
            </div>
            <div className={errors.copies ? 'mn-field mn-field-error' : 'mn-field'}>
              <label className="mn-field-label" htmlFor={`${mode}-copies`}>Copies</label>
              <div className="pp-stepper">
                <IconButton
                  icon={Minus}
                  label="Fewer copies"
                  variant="quiet"
                  disabled={!(copiesNum > 1)}
                  onClick={() => setCopies(String(Math.max(1, (copiesNum || 1) - 1)))}
                />
                <input
                  ref={refs.copies}
                  id={`${mode}-copies`}
                  inputMode="numeric"
                  value={copies}
                  aria-invalid={errors.copies ? true : undefined}
                  aria-describedby={errors.copies ? `${mode}-copies-hint` : undefined}
                  onChange={(e) => setCopies(e.target.value.replace(/\D/g, '').slice(0, 3))}
                />
                <IconButton
                  icon={Plus}
                  label="More copies"
                  variant="quiet"
                  disabled={copiesNum >= 999}
                  onClick={() => setCopies(String(Math.min(999, (copiesNum || 0) + 1)))}
                />
              </div>
              {errors.copies && <span className="mn-field-hint" id={`${mode}-copies-hint`}>Error: {errors.copies}</span>}
            </div>
          </div>
          <TextAreaField
            label="Notes"
            placeholder="Anything we should know"
            hint="For example: staple each chapter, or print page 3 in color only."
            value={notes}
            maxLength={1000}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Card>

        <Card title={walkIn ? '3. Customer' : '3. Your details'} className="pp-stack">
          <Field
            ref={refs.name}
            label="Full name"
            autoComplete={walkIn ? 'off' : 'name'}
            value={name}
            error={errors.name}
            onChange={(e) => setName(e.target.value)}
          />
          <Field
            ref={refs.email}
            label="Email"
            type="email"
            inputMode="email"
            autoComplete={walkIn ? 'off' : 'email'}
            value={email}
            error={errors.email}
            hint={walkIn ? "Optional. We'll email the order ID and when it's ready." : "We'll send your order ID here."}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Field
            ref={refs.phone}
            label="Mobile number"
            type="tel"
            inputMode="tel"
            autoComplete={walkIn ? 'off' : 'tel'}
            placeholder="0917 123 4567"
            value={phone}
            error={errors.phone}
            hint={walkIn ? 'Optional. For orders without an email.' : "Optional. We'll call only if there's a problem with your files."}
            onChange={(e) => setPhone(e.target.value)}
          />

          {!walkIn && (
            <div className={errors.consent ? 'mn-field mn-field-error' : 'mn-field'}>
              <Checkbox
                ref={refs.consent}
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                aria-describedby={errors.consent ? 'consent-hint' : undefined}
                label={
                  <>
                    I agree to the{' '}
                    <button type="button" className="pp-linkbtn" onClick={() => setPrivacyOpen(true)}>
                      privacy notice
                    </button>
                    . You use my files only to print this order.
                  </>
                }
              />
              {errors.consent && <span className="mn-field-hint" id="consent-hint">Error: {errors.consent}</span>}
            </div>
          )}

          {!walkIn && (
            <div className="pp-turnstile" aria-label="Spam check">
              <Icon icon={ShieldCheck} />
              <span>{isMock ? 'Spam check (Cloudflare Turnstile) goes here' : 'Checking you are human…'}</span>
            </div>
          )}

          {submitError && (
            <Alert tone="error" title="We couldn't send your order">
              {submitError}
            </Alert>
          )}

          <div className="pp-stack-2">
            {goodFiles.length > 0 && (
              <p className="t-meta">
                {[filesMeta, settingsSummary({ paper, color, sides, copies: Number.isInteger(copiesNum) && copiesNum > 0 ? copiesNum : 1 })].join(' · ')}
              </p>
            )}
            <Button type="submit" variant="primary" size="lg" fullWidth icon={Send} loading={submitting}>
              {submitting ? 'Sending files' : walkIn ? 'Add order' : 'Submit order'}
            </Button>
            {submitting && (
              <Progress
                showLabel
                label={overall >= 100 ? 'Creating your order' : `Uploading ${plural(goodFiles.length, 'file')}`}
                value={overall}
              />
            )}
            <p className="t-small">
              {walkIn ? 'The order shows up on the dashboard as Received.' : 'Pickup only. You pay at the counter when you claim your order.'}
            </p>
          </div>
        </Card>
      </div>
      <Dialog
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        title="Privacy notice"
        footer={
          <Button
            variant="primary"
            onClick={() => {
              setConsent(true);
              setPrivacyOpen(false);
            }}
          >
            I agree
          </Button>
        }
      >
        <PrivacyNotice />
      </Dialog>
    </form>
  );
}
