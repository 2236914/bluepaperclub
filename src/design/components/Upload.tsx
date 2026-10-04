import { useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Upload as UploadIcon } from 'lucide-react';
import { Icon } from './Icon';
import { cx } from './cx';

export interface UploadZoneProps {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  title?: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
  /** a row instead of the tall zone (once files are added) */
  compact?: boolean;
  className?: string;
  describedBy?: string;
}

/** Dashed drop zone; acts as a button (Enter/Space opens the picker). Solid 2px edge while dragging. */
export function UploadZone({ onFiles, accept, multiple = true, title = 'Drag your files here', hint, disabled, compact, className, describedBy }: UploadZoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const open = () => !disabled && input.current?.click();
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  };
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      aria-describedby={describedBy}
      className={cx('mn-upload', compact && 'mn-upload-compact', drag && 'mn-is-drag', disabled && 'mn-is-disabled', className)}
      onClick={open}
      onKeyDown={onKey}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
    >
      <span className="mn-upload-icon"><Icon icon={UploadIcon} size={20} /></span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: compact ? 'flex-start' : 'center', textAlign: compact ? 'left' : 'center' }}>
        <span className="mn-upload-title">{title}</span>
        {hint && <span className="mn-upload-hint">{hint}</span>}
      </span>
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        tabIndex={-1}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (files.length) onFiles(files);
        }}
      />
    </div>
  );
}
