// ── Timing ──────────────────────────────
export const DURATION = {
  instant:  0.08,   // 80ms  — tooltips, badges
  fast:     0.15,   // 150ms — buttons, hovers
  normal:   0.22,   // 220ms — modals, panels
  slow:     0.30,   // 300ms — page transitions
}

// ── Easing ──────────────────────────────
export const EASE = {
  out:    [0.0, 0.0, 0.2, 1.0],   // ease-out
  in:     [0.4, 0.0, 1.0, 1.0],   // ease-in
  inOut:  [0.4, 0.0, 0.2, 1.0],   // ease-in-out
  spring: { type: 'spring',
            stiffness: 400,
            damping: 30 },         // bouncy
  smoothSpring: { type: 'spring',
                  stiffness: 260,
                  damping: 24 },   // Linear-style
}

// ── Reusable Variants ────────────────────

// Fade in from nothing
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1,
    transition: { duration: DURATION.normal,
                  ease: EASE.out } },
  exit:    { opacity: 0,
    transition: { duration: DURATION.fast,
                  ease: EASE.in } },
}

// Slide up + fade in (modals, panels)
export const slideUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0,
    transition: { duration: DURATION.normal,
                  ease: EASE.out } },
  exit:    { opacity: 0, y: 8,
    transition: { duration: DURATION.fast,
                  ease: EASE.in } },
}

// Slide in from right (task detail panel)
export const slideRight = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0,
    transition: EASE.smoothSpring },
  exit:    { opacity: 0, x: 40,
    transition: { duration: DURATION.fast,
                  ease: EASE.in } },
}

// Slide in from left (sidebar)
export const slideLeft = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0,
    transition: EASE.smoothSpring },
  exit:    { opacity: 0, x: -10,
    transition: { duration: DURATION.fast } },
}

// Scale in (dropdowns, context menus)
export const scaleIn = {
  initial: { opacity: 0, scale: 0.95,
             transformOrigin: 'top left' },
  animate: { opacity: 1, scale: 1,
    transition: { duration: DURATION.fast,
                  ease: EASE.out } },
  exit:    { opacity: 0, scale: 0.95,
    transition: { duration: DURATION.instant,
                  ease: EASE.in } },
}

// Scale in from top right (dropdowns opening from right)
export const scaleInRight = {
  initial: { opacity: 0, scale: 0.95,
             transformOrigin: 'top right' },
  animate: { opacity: 1, scale: 1,
    transition: { duration: DURATION.fast,
                  ease: EASE.out } },
  exit:    { opacity: 0, scale: 0.95,
    transition: { duration: DURATION.instant } },
}

// Toast notification (bottom)
export const toastVariant = {
  initial: { opacity: 0, y: 20, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1,
    transition: EASE.smoothSpring },
  exit:    { opacity: 0, y: 10, scale: 0.96,
    transition: { duration: DURATION.fast,
                  ease: EASE.in } },
}

// Task card in list (stagger)
export const taskCardVariant = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0,
    transition: { duration: DURATION.fast,
                  ease: EASE.out } },
}

// Container for staggered children
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    }
  }
}

// Progress bar fill
export const progressFill = (width) => ({
  initial: { width: '0%' },
  animate: { width: `${width}%`,
    transition: { duration: 0.6,
                  ease: EASE.out,
                  delay: 0.1 } },
})

// Checkbox check mark
export const checkmark = {
  initial: { pathLength: 0, opacity: 0 },
  animate: { pathLength: 1, opacity: 1,
    transition: { duration: DURATION.fast,
                  ease: EASE.out } },
}

// Number counter (for stats)
export const counterVariant = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0,
    transition: { duration: DURATION.slow,
                  ease: EASE.out } },
}
