"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";

import { Button, IconButton } from "@/components/ui/Button";
import { Close } from "@/components/ui/Icons";
import { cn } from "@/lib/format";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 460,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#1a1822]/45 backdrop-blur-[2px]"
          />

          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ width }}
            className={cn(
              "relative max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl bg-canvas p-6 outline-none",
              "shadow-[0_24px_60px_-12px_rgba(24,22,30,0.28)]",
            )}
          >
            <IconButton
              label="Close"
              onClick={onClose}
              className="absolute top-4 right-4"
            >
              <Close size={18} />
            </IconButton>

            <h2 className="pr-8 text-[19px] font-semibold tracking-[-0.01em] text-ink">
              {title}
            </h2>
            {description && (
              <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{description}</p>
            )}

            {children && <div className="mt-5">{children}</div>}
            {footer && <div className="mt-6 flex justify-end gap-2.5">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = false,
  loading = false,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}

export function ComingSoonModal({
  open,
  onClose,
  feature,
}: {
  open: boolean;
  onClose: () => void;
  feature: string;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${feature} — coming soon`}
      description={`${feature} isn't part of this build yet. The surface is here so the navigation matches the real app.`}
      footer={
        <Button variant="primary" onClick={onClose}>
          Got it
        </Button>
      }
    />
  );
}
