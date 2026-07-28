"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

/**
 * The expanding-circle wipe Typeform plays when moving between form sections.
 *
 * Runs on *arrival* rather than on departure. A leaving animation would have to
 * hold the navigation open while it played, which delays the new page and breaks
 * the back button; revealing on arrival looks the same and costs nothing.
 *
 * Unmounted from `onAnimationComplete` — a callback, not an effect body — so no
 * timer needs cleaning up and no state is set synchronously during an effect.
 */
export function RouteReveal({ children }: { children?: React.ReactNode }) {
  const [playing, setPlaying] = useState(true);

  return (
    <AnimatePresence>
      {playing && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.42, delay: 0.28, ease: "easeInOut" }}
          onAnimationComplete={() => setPlaying(false)}
          style={{ background: "rgba(196, 132, 220, 0.30)" }}
          aria-hidden="true"
        >
          <motion.span
            className="flex items-center justify-center rounded-full text-white"
            style={{
              width: 190,
              height: 190,
              background: "linear-gradient(140deg,#cf8ee4,#b062d6)",
            }}
            initial={{ scale: 0.55, opacity: 0.95 }}
            animate={{ scale: 1.18, opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {children ?? (
              <svg width="76" height="76" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M6 9.8l6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
