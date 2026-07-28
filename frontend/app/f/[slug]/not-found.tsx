import Link from "next/link";

/**
 * Shown for an unknown slug *and* for an unpublished draft — the API returns 404
 * for both on purpose, so this copy must not imply the form exists.
 */
export default function FormNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-hover text-ink-soft">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 7.6v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="12" cy="16.2" r="1" fill="currentColor" />
        </svg>
      </span>

      <h1 className="mt-5 text-[24px] font-semibold tracking-[-0.01em] text-ink">
        This form isn’t available
      </h1>
      <p className="mt-2.5 max-w-sm text-[15px] leading-relaxed text-ink-soft">
        The link may be wrong, or the form may no longer be accepting responses.
      </p>

      <Link
        href="/"
        className="mt-7 inline-flex h-11 items-center rounded-[var(--radius-control)] bg-plum px-5 text-[15px] font-semibold text-white transition-colors hover:bg-plum-hover"
      >
        Create a typeform
      </Link>
    </main>
  );
}
