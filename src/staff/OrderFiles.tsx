import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FilePlus, FileUp, Lock, Trash2 } from 'lucide-react';
import { api, errorMessage, type Order, type OrderFile } from '../api';
import { Alert, Button, Dialog, Icon, Progress, toast } from '../design/components';
import { useI18n } from '../i18n';
import { ACCEPT_ATTR, MAX_FILES, extensionOf, fileProblem } from '../lib/files';
import { FileBadge } from '../shared/FileBadge';
import { FileActions } from './FileActions';

export interface OrderFilesProps {
  order: Order;
  canPrint: (file: OrderFile) => boolean;
  /** the print-job line under a file, or null */
  jobLine: (file: OrderFile) => ReactNode;
  /** id of the file being sent to the printer, if any */
  printingFileId: string | null;
  onPrint: (file: OrderFile) => void;
  onPreview: (file: OrderFile) => void;
  onDownload: (file: OrderFile) => void;
  onPrintOnPhone: (file: OrderFile) => void;
  /** "Back to Received" after a corrected file arrives for an order on hold */
  onBackToReceived: () => void;
}

interface Upload {
  name: string;
  pct: number;
}

/** The order's files: per-file actions, add, replace and remove, with upload progress. */
export function OrderFiles(p: OrderFilesProps) {
  const { order } = p;
  const { m, fmt } = useI18n();
  const t = m.staffOrder.files;

  const addInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const replaceTarget = useRef<OrderFile | null>(null);
  const focusHeadingNext = useRef(false);

  const [adding, setAdding] = useState<Upload[]>([]);
  const [replacing, setReplacing] = useState<Record<string, Upload>>({});
  const [problems, setProblems] = useState<string[]>([]);
  const [removeTarget, setRemoveTarget] = useState<OrderFile | null>(null);
  const [removing, setRemoving] = useState(false);

  const claimed = order.status === 'claimed';
  const lockedReason = claimed ? t.claimedReason : null;
  const onlyFile = order.files.length <= 1;

  // After a file is removed its row (and the button that opened the dialog) is gone: land on the Files heading.
  useEffect(() => {
    if (focusHeadingNext.current) {
      focusHeadingNext.current = false;
      heading.current?.focus();
    }
  }, [order.files.length]);

  const problemFor = (f: File): string | null => {
    const problem = fileProblem(f);
    if (!problem) return null;
    const words = problem === 'unsupported' ? t.problems.unsupported(extensionOf(f.name)) : t.problems[problem];
    return `${f.name}: ${words}`;
  };

  /* ---------- add ---------- */

  const addFiles = async (picked: File[]) => {
    setProblems([]);
    if (picked.length === 0) return;
    const bad: string[] = [];
    const good: File[] = [];
    for (const f of picked) {
      const problem = problemFor(f);
      if (problem) bad.push(problem);
      else good.push(f);
    }
    const room = MAX_FILES - order.files.length;
    if (good.length > room) {
      bad.push(t.problems.tooMany(MAX_FILES, order.files.length));
      good.splice(Math.max(0, room));
    }
    setProblems(bad);
    if (good.length === 0) return;
    setAdding(good.map((f) => ({ name: f.name, pct: 0 })));
    try {
      await api.addFiles(order.id, good, (i, pct) =>
        setAdding((list) => list.map((u, j) => (j === i ? { ...u, pct } : u))),
      );
      toast(t.added(good.length, good[0].name), { icon: FilePlus });
    } catch (err) {
      setProblems((list) => [...list, fmt.error(errorMessage(err))]);
    } finally {
      setAdding([]);
    }
  };

  /* ---------- replace ---------- */

  const startReplace = (file: OrderFile) => {
    replaceTarget.current = file;
    replaceInput.current?.click();
  };

  const replaceWith = async (picked: File | undefined) => {
    const old = replaceTarget.current;
    replaceTarget.current = null;
    if (!old || !picked) return;
    setProblems([]);
    const problem = problemFor(picked);
    if (problem) {
      setProblems([problem]);
      return;
    }
    setReplacing((r) => ({ ...r, [old.id]: { name: old.originalName, pct: 0 } }));
    try {
      const next = await api.replaceFile(old.id, picked, (pct) =>
        setReplacing((r) => ({ ...r, [old.id]: { name: old.originalName, pct } })),
      );
      if (next.status === 'file_issue') {
        toast(t.replacedOnHold(old.originalName), {
          icon: FileUp,
          action: { label: t.backToReceived, onClick: p.onBackToReceived },
        });
      } else {
        toast(t.replaced(old.originalName), { icon: FileUp });
      }
    } catch (err) {
      setProblems([fmt.error(errorMessage(err))]);
    } finally {
      setReplacing((r) => {
        const { [old.id]: _done, ...rest } = r;
        return rest;
      });
    }
  };

  /* ---------- remove ---------- */

  const confirmRemove = async () => {
    const file = removeTarget;
    if (!file) return;
    setRemoving(true);
    try {
      await api.removeFile(file.id);
      focusHeadingNext.current = true;
      setRemoveTarget(null);
      toast(t.removed(file.originalName), { icon: Trash2 });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="pp-panel-section">
      <div className="pp-row-between">
        <h3 className="t-label so-h" ref={heading} tabIndex={-1}>{t.label}</h3>
        <span className="t-meta">{fmt.filesSummary(order)}</span>
      </div>
      <ul className="pp-file-list" aria-label={t.listLabel}>
        {/* Keyed by position, not file id: a replaced file gets a new id, and keeping the row keeps keyboard focus on its buttons. */}
        {order.files.map((f, i) => {
          const rep = replacing[f.id];
          return (
            <li key={i} className="so-file-row">
              <FileBadge name={f.originalName} small />
              <div className="pp-file-info">
                <span className="pp-file-name" title={f.originalName}>{f.originalName}</span>
                <span className="t-meta">{fmt.fileLine(f)}</span>
                {p.jobLine(f)}
                {rep && <Progress className="so-progress" value={rep.pct} label={t.replacing(rep.name)} showLabel />}
              </div>
              <FileActions
                file={f}
                ready={p.canPrint(f)}
                printing={p.printingFileId === f.id}
                lockedReason={lockedReason ?? (rep ? t.replacing(rep.name) : null)}
                removeReason={onlyFile ? t.onlyFile : null}
                onPrint={() => p.onPrint(f)}
                onPreview={() => p.onPreview(f)}
                onDownload={() => p.onDownload(f)}
                onPrintOnPhone={() => p.onPrintOnPhone(f)}
                onReplace={() => startReplace(f)}
                onRemove={() => setRemoveTarget(f)}
              />
            </li>
          );
        })}
      </ul>

      {adding.length > 0 && (
        <div className="so-uploads">
          {adding.map((u, i) => (
            <Progress key={i} value={u.pct} label={t.uploading(u.name)} showLabel />
          ))}
        </div>
      )}
      <p className="so-sr-only" role="status">
        {adding.length > 0 ? t.uploadingCount(adding.length) : Object.values(replacing).map((r) => t.replacing(r.name)).join('. ')}
      </p>

      {problems.length > 0 && (
        <Alert tone="error" title={t.uploadProblem} onClose={() => setProblems([])}>
          <ul className="so-problems">
            {problems.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </Alert>
      )}

      {claimed ? (
        <p className="t-small so-locked">
          <Icon icon={Lock} size={14} />
          {t.claimedReason}
        </p>
      ) : (
        <div>
          <Button
            size="sm"
            icon={FilePlus}
            className="so-add"
            disabled={order.files.length >= MAX_FILES}
            loading={adding.length > 0}
            onClick={() => addInput.current?.click()}
          >
            {t.add}
          </Button>
          {order.files.length >= MAX_FILES && <p className="t-small">{t.problems.tooMany(MAX_FILES, order.files.length)}</p>}
        </div>
      )}

      <input
        ref={addInput}
        type="file"
        multiple
        accept={ACCEPT_ATTR}
        hidden
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          void addFiles(files);
        }}
      />
      <input
        ref={replaceInput}
        type="file"
        accept={ACCEPT_ATTR}
        hidden
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          void replaceWith(file);
        }}
      />

      <Dialog
        open={Boolean(removeTarget)}
        alert
        size="sm"
        onClose={() => !removing && setRemoveTarget(null)}
        title={removeTarget ? t.removeTitle(removeTarget.originalName) : ''}
        description={t.removeBody}
        footer={
          <>
            <Button variant="quiet" data-autofocus onClick={() => setRemoveTarget(null)} disabled={removing}>
              {m.common.cancel}
            </Button>
            <Button variant="primary" icon={Trash2} loading={removing} onClick={confirmRemove}>
              {t.removeConfirm}
            </Button>
          </>
        }
      />
    </div>
  );
}
