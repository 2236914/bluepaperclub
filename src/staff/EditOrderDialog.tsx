import { useEffect, useId, useRef, useState } from 'react';
import { Mail, Minus, Phone, Plus, Save } from 'lucide-react';
import { api, errorMessage, type ColorMode, type Order, type OrderPatch, type PaperSize, type Sides } from '../api';
import { Alert, Button, Dialog, Field, IconButton, Segmented, TextAreaField, toast } from '../design/components';
import { useI18n } from '../i18n';
import { isEmail } from '../lib/format';

interface Form {
  customerName: string;
  email: string;
  phone: string;
  paper: PaperSize;
  color: ColorMode;
  sides: Sides;
  copies: string;
  notes: string;
}

type FieldKey = 'customerName' | 'email' | 'copies';
type Errors = Partial<Record<FieldKey, string>>;

const fromOrder = (o: Order): Form => ({
  customerName: o.customerName,
  email: o.email ?? '',
  phone: o.phone ?? '',
  paper: o.paper,
  color: o.color,
  sides: o.sides,
  copies: String(o.copies),
  notes: o.notes ?? '',
});

const MAX_COPIES = 999;

/** Staff change an order's customer details, print settings and customer note. */
export function EditOrderDialog({ order, open, onClose }: { order: Order; open: boolean; onClose: () => void }) {
  const { m, fmt } = useI18n();
  const t = m.staffOrder.edit;
  const c = m.common;
  const id = useId();
  const formId = `${id}-form`;
  const [form, setForm] = useState<Form>(() => fromOrder(order));
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const refs = {
    customerName: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    copies: useRef<HTMLInputElement>(null),
  };
  const alertRef = useRef<HTMLDivElement>(null);

  // Start from the order as it is now each time the dialog opens.
  useEffect(() => {
    if (open) {
      setForm(fromOrder(order));
      setErrors({});
      setServerError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const copiesNum = Number(form.copies);
  const copiesOk = /^\d+$/.test(form.copies.trim()) && copiesNum >= 1 && copiesNum <= MAX_COPIES;
  const step = (d: number) => {
    const base = copiesOk ? copiesNum : 1;
    set('copies', String(Math.max(1, Math.min(MAX_COPIES, base + d))));
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!form.customerName.trim()) e.customerName = t.errors.name;
    const email = form.email.trim();
    if (!email && order.source === 'online') e.email = t.errors.emailRequired;
    else if (email && !isEmail(email)) e.email = t.errors.email;
    if (!copiesOk) e.copies = t.errors.copies;
    return e;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setServerError(null);
    const e = validate();
    setErrors(e);
    const first = (['customerName', 'email', 'copies'] as FieldKey[]).find((k) => e[k]);
    if (first) {
      refs[first].current?.focus();
      return;
    }
    const patch: OrderPatch = {
      customerName: form.customerName.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      paper: form.paper,
      color: form.color,
      sides: form.sides,
      copies: copiesNum,
      notes: form.notes.trim() || null,
    };
    const changed = (Object.keys(patch) as Array<keyof OrderPatch>).some((k) => (order[k] ?? null) !== (patch[k] ?? null));
    if (!changed) {
      toast(t.noChanges);
      onClose();
      return;
    }
    setSaving(true);
    try {
      await api.updateOrder(order.id, patch);
      toast(t.saved(order.code), { icon: Save });
      onClose();
    } catch (err) {
      setServerError(fmt.error(errorMessage(err)));
      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      setSaving(false);
    }
  };

  const paperId = `${id}-paper`;
  const colorId = `${id}-color`;
  const sidesId = `${id}-sides`;
  const copiesId = `${id}-copies`;

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      title={t.title(order.code)}
      description={t.description}
      footer={
        <>
          <Button variant="quiet" onClick={onClose} disabled={saving}>{c.cancel}</Button>
          <Button variant="primary" type="submit" form={formId} icon={Save} loading={saving}>{t.save}</Button>
        </>
      }
    >
      <form id={formId} className="so-edit" noValidate onSubmit={submit}>
        {serverError && (
          <div ref={alertRef} tabIndex={-1} className="so-focus-target">
            <Alert tone="error" title={t.couldntSave}>{serverError}</Alert>
          </div>
        )}

        <fieldset className="so-fieldset">
          <legend className="t-label">{t.customer}</legend>
          <Field
            ref={refs.customerName}
            label={t.name}
            autoComplete="off"
            value={form.customerName}
            error={errors.customerName}
            data-autofocus
            onChange={(e) => set('customerName', e.target.value)}
          />
          <Field
            ref={refs.email}
            label={t.email}
            type="email"
            inputMode="email"
            autoComplete="off"
            icon={Mail}
            value={form.email}
            error={errors.email}
            hint={order.source === 'online' ? t.emailHintOnline : t.emailHintWalkIn}
            onChange={(e) => set('email', e.target.value)}
          />
          <Field
            label={t.phone}
            type="tel"
            inputMode="tel"
            autoComplete="off"
            icon={Phone}
            value={form.phone}
            hint={t.phoneHint}
            onChange={(e) => set('phone', e.target.value)}
          />
        </fieldset>

        <fieldset className="so-fieldset">
          <legend className="t-label">{t.settings}</legend>
          <div className="mn-field">
            <span className="mn-field-label" id={paperId}>{t.paper}</span>
            <Segmented<PaperSize>
              labelledBy={paperId}
              size="md"
              value={form.paper}
              onChange={(v) => set('paper', v)}
              options={(['short', 'a4', 'long'] as PaperSize[]).map((v) => ({ value: v, label: c.paper[v] }))}
            />
          </div>
          <div className="mn-field">
            <span className="mn-field-label" id={colorId}>{t.color}</span>
            <Segmented<ColorMode>
              labelledBy={colorId}
              size="md"
              value={form.color}
              onChange={(v) => set('color', v)}
              options={(['bw', 'color'] as ColorMode[]).map((v) => ({ value: v, label: c.color[v] }))}
            />
          </div>
          <div className="mn-field">
            <span className="mn-field-label" id={sidesId}>{t.sides}</span>
            <Segmented<Sides>
              labelledBy={sidesId}
              size="md"
              value={form.sides}
              onChange={(v) => set('sides', v)}
              options={(['one', 'two'] as Sides[]).map((v) => ({ value: v, label: c.sides[v] }))}
            />
          </div>
          <div className={errors.copies ? 'mn-field mn-field-error' : 'mn-field'}>
            <label className="mn-field-label" htmlFor={copiesId}>{t.copies}</label>
            <div className="so-stepper">
              <IconButton
                icon={Minus}
                variant="secondary"
                label={t.fewer}
                disabled={copiesOk && copiesNum <= 1}
                onClick={() => step(-1)}
              />
              <input
                ref={refs.copies}
                id={copiesId}
                className="mn-field-input so-stepper-input"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.copies}
                aria-invalid={errors.copies ? true : undefined}
                aria-describedby={errors.copies ? `${copiesId}-hint` : undefined}
                onChange={(e) => set('copies', e.target.value.replace(/[^\d]/g, '').slice(0, 3))}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    step(1);
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    step(-1);
                  }
                }}
              />
              <IconButton
                icon={Plus}
                variant="secondary"
                label={t.more}
                disabled={copiesOk && copiesNum >= MAX_COPIES}
                onClick={() => step(1)}
              />
            </div>
            {errors.copies && (
              <span className="mn-field-hint" id={`${copiesId}-hint`}>{fmt.error(errors.copies)}</span>
            )}
          </div>
        </fieldset>

        <TextAreaField
          label={t.note}
          hint={t.noteHint}
          value={form.notes}
          maxLength={2000}
          style={{ minHeight: 88 }}
          onChange={(e) => set('notes', e.target.value)}
        />
      </form>
    </Dialog>
  );
}
