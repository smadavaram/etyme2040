/**
 * The two-ink mural, as page furniture.
 *
 * Navy on canvas, so it sits inside the page's own weight rather than on top
 * of it. The artwork carries no words: every headline on this site stays in
 * HTML, where it can be selected, translated and read out.
 */

/**
 * A band between sections, in place of a bare 1px rule.
 *
 * Both files are sized so the whole artwork fits the slot at `h-auto`. Nothing
 * is cropped, so no shape is ever cut in half: the phone gets a narrower
 * composition rather than a squeezed version of the wide one.
 */
export function MuralDivider({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`border-y border-etyme-rule bg-etyme-canvas ${className}`}
    >
      <img
        src="/brand/etyme-section-divider-narrow-navy.svg"
        alt=""
        className="block h-auto w-full md:hidden"
      />
      <img
        src="/brand/etyme-section-divider-navy.svg"
        alt=""
        className="hidden h-auto w-full md:block"
      />
    </div>
  )
}

/**
 * The hero graphic on phones.
 *
 * The desktop screenshots are 1440 wide. At 390 they are shrunk 3.7x and
 * nothing in them can be read, so on a phone the page shows the mural and
 * keeps the real screen for the width that can carry it.
 */
export function MuralHeroMobile({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`overflow-hidden rounded-xl border border-etyme-rule bg-etyme-canvas ${className}`}
    >
      <img
        src="/brand/etyme-mural-master-block-navy.svg"
        alt=""
        className="block aspect-[4/3] w-full object-cover"
      />
    </div>
  )
}
