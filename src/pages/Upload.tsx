import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatedPage } from '@/animations/presets';
import { DriveGate } from '@/components/dashboard/DriveGate';
import { UploadSuccess } from '@/components/dashboard/UploadSuccess';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useAuth } from '@/hooks/useAuth';
import { useDrive } from '@/hooks/useDrive';
import { useToast } from '@/hooks/useToast';
import { addUploadRecord } from '@/services/firestoreService';
import { getErrorMessage } from '@/services/api';
import { uploadFileToDrive } from '@/services/uploadService';
import { MAX_FILE_SIZE_BYTES, ACCEPTED_FILE_TYPES } from '@/config/constants';
import { cn } from '@/utils/cn';
import { formatBytes, getFileExtension } from '@/utils/format';
import { isAcceptedFileType } from '@/utils/fileValidation';
import type { UploadRecord } from '@/types/upload';
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  getFileTypeIcon,
  RefreshCwIcon,
  TrashIcon,
  UploadCloudIcon,
} from '@/components/ui/Icon';

type UploadPhase = 'idle' | 'uploading' | 'success' | 'error';

export default function Upload() {
  const { user, profile } = useAuth();
  const { getAccessToken } = useDrive();
  const { success: showSuccess, error: showError } = useToast();
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [record, setRecord] = useState<UploadRecord | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (candidate: File): string | null => {
    if (candidate.size > MAX_FILE_SIZE_BYTES) {
      return `File is ${formatBytes(candidate.size)}. The maximum allowed size is ${formatBytes(MAX_FILE_SIZE_BYTES)}.`;
    }
    if (candidate.size === 0) {
      return 'This file is empty. Please choose a different file.';
    }
    if (!isAcceptedFileType(candidate)) {
      return `The file type "${candidate.type || getFileExtension(candidate.name)}" is not supported. Allowed: images, videos, audio, PDFs, documents, archives, code and more.`;
    }
    return null;
  };

  const handleFile = useCallback((candidate: File) => {
    const validationError = validateFile(candidate);
    if (validationError) {
      setErrorMessage(validationError);
      setPhase('error');
      setFile(null);
      return;
    }
    setErrorMessage(null);
    setProgress(0);
    setRecord(null);
    setPhase('idle');
    setFile(candidate);
  }, []);

  const reset = useCallback(() => {
    setFile(null);
    setProgress(0);
    setErrorMessage(null);
    setRecord(null);
    setPhase('idle');
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file || !user || !profile) return;

    setPhase('uploading');
    setProgress(0);
    setErrorMessage(null);

    try {
      const accessToken = await getAccessToken();
      const { response } = await uploadFileToDrive({
        file,
        accessToken,
        userId: user.uid,
        onProgress: setProgress,
      });

      if (!response.success) {
        throw new Error(
          response.error ||
            response.message ||
            'Upload was not acknowledged by Google Drive.',
        );
      }

      const extension = getFileExtension(file.name);
      const newRecord: UploadRecord = {
        id: '',
        userId: user.uid,
        email: profile.email,
        fileName: response.fileName || file.name,
        fileSize: file.size,
        fileType: extension === 'unknown' ? file.type || 'other' : extension,
        driveLink: response.driveLink || '',
        status: 'success',
        uploadedAt: response.uploadedAt || new Date().toISOString(),
      };

      const saved = await addUploadRecord(newRecord);
      setRecord(saved);
      setProgress(100);
      setPhase('success');
      showSuccess('Upload complete', `${file.name} saved to your Google Drive.`);
    } catch (err) {
      const message = getErrorMessage(err);
      setErrorMessage(message);
      setPhase('error');
      showError('Upload failed', message);
    }
  }, [file, user, profile, showSuccess, showError]);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragActive(false);
      const dropped = event.dataTransfer.files?.[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile],
  );

  const FileIcon = file ? getFileTypeIcon(file.type, file.name) : UploadCloudIcon;

  const closeError = () => {
    setErrorMessage(null);
    setPhase('idle');
  };

  return (
    <DriveGate>
      <AnimatedPage className="mx-auto max-w-3xl">
      <div className="mb-8 text-center">
        <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Upload to Google Drive</h1>
        <p className="mt-2 text-sm text-slate-400">
          Drag and drop a file or browse from your device. DriveFlow uploads it straight into your own Google Drive.
        </p>
      </div>

      {phase === 'success' && record ? (
        <UploadSuccess
          record={record}
          onClose={() => navigate('/dashboard')}
          onUploadAnother={reset}
        />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="space-y-6"
          >
            <motion.div
              animate={{ scale: dragActive ? 1.02 : 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={(e) => {
                e.preventDefault();
                if (e.currentTarget === e.target) setDragActive(false);
              }}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Upload a file by dragging it here or clicking to browse"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              className={cn(
                'group relative flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-16 text-center transition-colors duration-300 sm:py-20',
                dragActive
                  ? 'border-electric bg-electric/10'
                  : 'border-white/20 bg-white/5 hover:border-electric/50 hover:bg-electric/5',
              )}
            >
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                className="sr-only"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) handleFile(selected);
                }}
              />
              <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-electric/5 to-grape/5 opacity-0 transition-opacity group-hover:opacity-100" />

              <motion.span
                animate={dragActive ? { y: [-6, 6, -6] } : { y: 0 }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-electric to-grape text-white shadow-glow"
              >
                <UploadCloudIcon size={36} />
              </motion.span>

              <h2 className="font-display relative mt-6 text-xl font-semibold text-white">
                {dragActive ? 'Drop it here!' : 'Drag & drop your file'}
              </h2>
              <p className="relative mt-2 text-sm text-slate-400">
                or <span className="font-semibold text-electric">browse files</span> from your device
              </p>
              <p className="relative mt-4 text-xs text-slate-500">
                Max {formatBytes(MAX_FILE_SIZE_BYTES)} · Images, videos, PDFs, documents & more
              </p>
            </motion.div>

            {file && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-electric/10 text-electric">
                    <FileIcon size={22} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white" title={file.name}>
                      {file.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {formatBytes(file.size)} · {file.type || 'unknown type'}
                    </p>
                  </div>
                  <button
                    onClick={reset}
                    aria-label="Remove selected file"
                    className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:border-rose-400/40 hover:text-rose-400"
                  >
                    <TrashIcon size={16} />
                  </button>
                </div>

                {phase === 'uploading' ? (
                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-slate-300">Uploading to your Google Drive…</span>
                      <span className="font-semibold text-electric">{progress}%</span>
                    </div>
                    <ProgressBar value={progress} className="h-3" ariaLabel={`Upload progress ${progress}%`} />
                  </div>
                ) : (
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      glow
                      disabled={Boolean(errorMessage)}
                      onClick={handleUpload}
                    >
                      <UploadCloudIcon size={18} />
                      Upload to Google Drive
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {phase === 'success' && !record && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm font-medium text-emerald-300"
              >
                <CheckCircleIcon size={18} />
                File uploaded successfully.
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      <Modal
        open={phase === 'error' && Boolean(errorMessage)}
        onClose={closeError}
        title="Upload failed"
        description="The file could not be sent to Google Drive."
        footer={
          <>
            <Button variant="ghost" onClick={closeError}>
              Dismiss
            </Button>
            <Button onClick={() => handleUpload()} disabled={!file}>
              <RefreshCwIcon size={16} />
              Retry upload
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/5 p-4">
          <AlertTriangleIcon size={20} className="mt-0.5 shrink-0 text-rose-400" />
          <p className="text-sm leading-relaxed text-slate-300">{errorMessage}</p>
        </div>
      </Modal>
      </AnimatedPage>
    </DriveGate>
  );
}
