import TextField from '@mui/material/TextField';
import { type FormEvent, useId, useState } from 'react';

import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';

export interface UrlDialogValues {
  url: string;
  text: string;
}

interface UrlDialogProps {
  open: boolean;
  title: string;
  urlLabel: string;
  urlHelper: string;
  /** Second, optional field (link text or image alt text); hidden when omitted. */
  textLabel?: string;
  initial?: UrlDialogValues;
  confirmLabel: string;
  /** Returns an error message for an unacceptable URL, or null. */
  validate: (url: string) => string | null;
  onSubmit: (values: UrlDialogValues) => void;
  onClose: () => void;
}

/** Asks for a URL (and optional text) for a link or image in the rich text editor. */
export function UrlDialog({
  open,
  title,
  urlLabel,
  urlHelper,
  textLabel,
  initial = { url: '', text: '' },
  confirmLabel,
  validate,
  onSubmit,
  onClose,
}: UrlDialogProps) {
  const formId = useId();
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const url = values.url.trim();
    const problem = url ? validate(url) : 'Enter a URL';
    if (problem) {
      setError(problem);
      return;
    }
    onSubmit({ url, text: values.text.trim() });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="xs"
      fullWidth
      actions={
        <>
          <Button variant="text" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 pt-1">
        <TextField
          label={urlLabel}
          value={values.url}
          onChange={(event) => {
            setValues((current) => ({ ...current, url: event.target.value }));
            setError(null);
          }}
          error={error !== null}
          helperText={error ?? urlHelper}
          type="url"
          fullWidth
        />
        {textLabel && (
          <TextField
            label={textLabel}
            value={values.text}
            onChange={(event) => setValues((current) => ({ ...current, text: event.target.value }))}
            fullWidth
          />
        )}
      </form>
    </Modal>
  );
}
