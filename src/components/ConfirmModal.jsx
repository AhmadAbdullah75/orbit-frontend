import { useState } from 'react'
import { motion } from 'framer-motion'
import { scaleIn } from '../utils/animations'

export default function ConfirmModal({
  isDark, title, message,
  confirmText = 'Confirm',
  confirmColor = 'bg-red-600 hover:bg-red-700',
  icon = 'delete',
  iconBg = 'bg-red-500/10',
  iconColor = 'text-red-500',
  onConfirm, onCancel,
  narrow = false
}) {
  const [loading, setLoading] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60
      backdrop-blur-sm z-[200]
      flex items-center justify-center px-4"
    >
      <motion.div
        variants={scaleIn}
        initial="initial"
        animate="animate"
        exit="exit"
        className={`w-full ${narrow ? 'max-w-[280px]' : 'max-w-sm'} rounded-2xl
        shadow-2xl ${narrow ? 'p-5' : 'p-6'}
        ${isDark
          ? 'bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)]'
          : 'bg-white border border-slate-200'
        }`}
      >
        <div className={`size-12 rounded-full
          flex items-center justify-center mb-4
          ${iconBg}`}>
          <span className={`material-symbols-outlined
            text-[24px] ${iconColor}`}>
            {icon}
          </span>
        </div>
        <h3 className={`text-base font-semibold mb-2
          ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {title}
        </h3>
        <p className={`text-sm mb-6
          ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {message}
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl
              text-sm font-semibold border
              transition-colors cursor-pointer
              ${isDark
                ? 'border-[rgba(255,255,255,0.08)] text-slate-400 hover:bg-[rgba(255,255,255,0.06)]'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
            Cancel
          </button>
  <button
    disabled={loading}
    onClick={() => {
      // Don't use async here — let parent handle it
      // Just call onConfirm directly
      onConfirm()
    }}
    className={`flex-1 py-2.5 rounded-xl
      text-sm font-semibold text-white
      transition-colors cursor-pointer
      disabled:opacity-60
      ${confirmColor}`}>
    {confirmText}
  </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
