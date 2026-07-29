"use client";

import { motion } from "motion/react";

import { Button } from "@/components/ui/Button";

const RESPONSE_LIMIT = 100;

export function ResponseMeter({
  used,
  onUpgrade,
}: {
  used: number;
  onUpgrade: () => void;
}) {
  const percentage = Math.min((used / RESPONSE_LIMIT) * 100, 100);

  return (
    <div className="border-t-[6px] border-canvas px-5 py-4">
      <p className="text-[14px] text-ink">Responses collected</p>

      <div
        className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-[#dedce2]"
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={RESPONSE_LIMIT}
        aria-label="Responses collected against your plan limit"
      >
        <motion.div
          className="h-full rounded-full bg-plum"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <p className="mt-2.5 text-[14px] text-ink-soft">
        <span className="font-semibold text-ink">{used}</span> / {RESPONSE_LIMIT}
      </p>

      <Button size="sm" className="mt-3 font-normal" onClick={onUpgrade}>
        Increase response limit
      </Button>
    </div>
  );
}
