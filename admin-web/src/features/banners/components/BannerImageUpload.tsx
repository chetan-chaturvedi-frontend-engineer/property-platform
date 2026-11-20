import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import SwapHoriz from '@mui/icons-material/SwapHoriz';
import Alert from '@mui/material/Alert';
import FormHelperText from '@mui/material/FormHelperText';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { type ChangeEvent, type DragEvent, useId, useRef, useState } from 'react';

import { Button } from '@/components/common/Button';
import { formatBytes } from '@/utils/formatters';
import { cn } from '@/utils/helpers';

import type { ImageDimensions } from '../types/banner.types';

import { BannerThumbnail } from './BannerThumbnail';

interface BannerImageUploadProps {
  label: string;
  /** Local preview (`data:`) of the picked file, or the saved image's API path. */
  previewSrc: string | null;
  /** Name and size of the picked file, when it is a new one. */
  fileInfo?: { name: string; size: number } | null;
  dimensions?: ImageDimensions | null;
  /** Recommended (not enforced) size. */
  recommended: ImageDimensions;
  /** Upload limit shown to the user, e.g. "10 MB". */
  maxSizeLabel: string;
  /** `accept` attribute of the file input. */
  accept: string;
  /** Called with the dropped or chosen file; the parent validates it. */
  onSelect: (file: File) => void;
  /** Removes the picked file (shown only when there is one to remove). */
  onRemove?: () => void;
  error?: string;
  /** 0-100 while uploading. */
  progress?: number | null;
  required?: boolean;
  disabled?: boolean;
}

/** Drag-and-drop or "Choose file" image picker with preview, replace, remove and progress. */
export function BannerImageUpload({
  label,
  previewSrc,
  fileInfo,
  dimensions,
  recommended,
  maxSizeLabel,
  accept,
  onSelect,
  onRemove,
  error,
  progress = null,
  required = false,
  disabled = false,
}: BannerImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const errorId = useId();
  const [dragging, setDragging] = useState(false);

  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (file && !disabled) onSelect(file);
  };
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    pick(event.target.files);
    // Choosing the same file again must still trigger a change.
    event.target.value = '';
  };
  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragging(false);
    pick(event.dataTransfer.files);
  };
  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    if (!disabled) setDragging(true);
  };
  const openPicker = () => inputRef.current?.click();

  const ratioOff =
    dimensions &&
    Math.abs(dimensions.width / dimensions.height - recommended.width / recommended.height) > 0.15;
  const tooSmall = dimensions && dimensions.width < recommended.width / 2;

  return (
    <div className="flex flex-col gap-2">
      <Typography component="label" htmlFor={inputId} variant="body2" fontWeight={600}>
        {label}
        {required && (
          <span aria-hidden className="text-[var(--mui-palette-error-main)]">
            {' '}
            *
          </span>
        )}
      </Typography>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={handleChange}
        disabled={disabled}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {previewSrc ? (
        <div
          role="group"
          aria-label="Selected banner image"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragging(false)}
          className={cn(
            'flex flex-col gap-3 rounded-xl border p-3',
            dragging && 'border-[var(--mui-palette-primary-main)] bg-primary-50/50',
          )}
        >
          <BannerThumbnail src={previewSrc} alt="Banner image preview" className="w-full" eager />
          <div className="flex flex-wrap items-center gap-2">
            <Typography variant="caption" color="text.secondary" className="mr-auto">
              {fileInfo ? `${fileInfo.name} · ${formatBytes(fileInfo.size)}` : 'Current image'}
              {dimensions ? ` · ${dimensions.width} × ${dimensions.height} px` : ''}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<SwapHoriz />}
              onClick={openPicker}
              disabled={disabled}
            >
              Replace
            </Button>
            {onRemove && (
              <Button
                size="small"
                variant="text"
                color="error"
                startIcon={<DeleteOutline />}
                onClick={onRemove}
                disabled={disabled}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragging(false)}
          className={cn(
            'flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors',
            'border-[rgba(var(--mui-palette-primary-mainChannel)/0.45)] bg-[rgba(var(--mui-palette-primary-mainChannel)/0.04)]',
            dragging && 'bg-[rgba(var(--mui-palette-primary-mainChannel)/0.12)]',
            error && 'border-[var(--mui-palette-error-main)]',
          )}
        >
          <div className="flex items-center gap-2">
            <CloudUploadOutlined color="primary" aria-hidden />
            <Typography variant="body2" fontWeight={600}>
              Upload banner image
            </Typography>
          </div>
          <Typography variant="caption" color="text.secondary">
            Drag and drop, or choose a file. Recommended size: {recommended.width} ×{' '}
            {recommended.height} px
            <br />
            JPG, PNG or WEBP · max file size: {maxSizeLabel}
          </Typography>
          <Button size="small" onClick={openPicker} disabled={disabled} className="mt-1">
            Choose file
          </Button>
        </div>
      )}
      {progress !== null && (
        <div className="flex items-center gap-2">
          <LinearProgress
            variant="determinate"
            value={progress}
            className="flex-1"
            aria-label="Upload progress"
          />
          <Typography variant="caption" color="text.secondary">
            {progress}%
          </Typography>
        </div>
      )}
      {(ratioOff || tooSmall) && !error && (
        <Alert severity="info" variant="outlined" className="py-0">
          {tooSmall
            ? `This image is small (${dimensions?.width ?? 0} px wide) and may look blurry on large screens.`
            : 'This image is not close to the recommended 1920 × 600 ratio, so it may be cropped on some screens.'}
        </Alert>
      )}
      {error && (
        <FormHelperText error id={errorId}>
          {error}
        </FormHelperText>
      )}
    </div>
  );
}
