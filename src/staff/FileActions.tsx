import { Download, Eye, FileUp, MoreHorizontal, Printer, Smartphone, Trash2 } from 'lucide-react';
import type { OrderFile } from '../api';
import { Button } from '../design/components';
import { Menu, type MenuItem } from '../design/components/Menu';
import { useI18n } from '../i18n';
import { canPrintOnThisPhone } from '../lib/share';

export interface FileActionsProps {
  file: OrderFile;
  /** false while a Word file is still converting */
  ready: boolean;
  printing: boolean;
  /** why the file can't be replaced or removed (claimed order, upload running), or null */
  lockedReason: string | null;
  /** why this one file can't be removed (it's the only one), or null */
  removeReason: string | null;
  onPrint: () => void;
  onPreview: () => void;
  onDownload: () => void;
  onPrintOnPhone: () => void;
  onReplace: () => void;
  onRemove: () => void;
}

/** One file row's actions: a labelled Print button and a "More" menu with the rest. */
export function FileActions(p: FileActionsProps) {
  const { m } = useI18n();
  const t = m.staffOrder.files;
  const name = p.file.originalName;

  const items: MenuItem[] = [
    { id: 'preview', label: t.preview, icon: Eye, onSelect: p.onPreview, disabled: !p.ready, hint: p.ready ? undefined : t.converting },
    { id: 'download', label: t.download, icon: Download, onSelect: p.onDownload },
  ];
  if (canPrintOnThisPhone()) {
    items.push({
      id: 'phone',
      label: t.printOnPhone,
      icon: Smartphone,
      onSelect: p.onPrintOnPhone,
      disabled: !p.ready,
      hint: p.ready ? undefined : t.converting,
    });
  }
  items.push(
    {
      id: 'replace',
      label: t.replace,
      icon: FileUp,
      onSelect: p.onReplace,
      disabled: Boolean(p.lockedReason),
      hint: p.lockedReason ?? undefined,
      separatorBefore: true,
    },
    {
      id: 'remove',
      label: t.remove,
      icon: Trash2,
      onSelect: p.onRemove,
      disabled: Boolean(p.lockedReason || p.removeReason),
      hint: p.lockedReason ?? p.removeReason ?? undefined,
    },
  );

  return (
    <div className="so-file-actions">
      <Button
        size="sm"
        icon={Printer}
        aria-label={t.printAria(name)}
        disabled={!p.ready}
        loading={p.printing}
        onClick={p.onPrint}
      >
        {t.print}
      </Button>
      <Menu size="sm" label={t.more} ariaLabel={t.moreAria(name)} icon={MoreHorizontal} items={items} align="end" />
    </div>
  );
}
