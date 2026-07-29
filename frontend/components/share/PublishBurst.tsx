"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

export function PublishBurst({ onDone }: { onDone?: () => void }) {
  const [beat, setBeat] = useState<"tick" | "arrow" | "done">("tick");

  if (beat === "done") return null;

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[210] flex items-center justify-center"
      initial={{ opacity: 1 }}
      animate={{ opacity: beat === "arrow" ? 0 : 1 }}
      transition={{ duration: 0.4, delay: beat === "arrow" ? 0.25 : 0 }}
      style={{ background: "rgba(196, 132, 220, 0.32)" }}
      role="status"
      aria-live="polite"
      aria-label="Form published"
    >
      <span
        className="flex h-[190px] w-[190px] items-center justify-center rounded-full text-white"
        style={{ background: "linear-gradient(140deg,#cf8ee4,#b062d6)" }}
      >
        <AnimatePresence mode="wait">
          {beat === "tick" ? (
            <motion.svg
              key="tick"
              width="82"
              height="82"
              viewBox="0 0 24 24"
              fill="none"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
              onAnimationComplete={() => setBeat("arrow")}
            >
              <motion.path
                d="M5 12.6l4.6 4.6L19 6.6"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </motion.svg>
          ) : (
            <motion.svg
              key="arrow"
              width="82"
              height="82"
              viewBox="0 0 24 24"
              fill="none"
              initial={{ x: 0, opacity: 1 }}
              animate={{ x: 150, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.6, 1] }}
              onAnimationComplete={() => {
                setBeat("done");
                onDone?.();
              }}
            >
              <path
                d="M5.6 4.2l13.6 7.8-13.6 7.8V4.2z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </span>
    </motion.div>
  );
}
