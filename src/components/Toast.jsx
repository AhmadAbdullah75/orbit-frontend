import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { slideUp } from '../utils/animations'

export default function Toast({
  message, type = 'error', onClose
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  const colors = {
    error: 'bg-red-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    info: 'bg-indigo-500',
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200]">
      <motion.div
        variants={slideUp}
        initial="initial"
        animate="animate"
        exit="exit"
        className={`flex items-center gap-3
        px-4 py-3 rounded-xl shadow-2xl
        text-white text-sm font-medium
        ${colors[type] || colors.error}`}
      >
        <span className="material-symbols-outlined text-[18px]">
          {type === 'error' ? 'error' :
           type === 'success' ? 'check_circle' :
           type === 'warning' ? 'warning' : 'info'}
        </span>
        {message}
        <button onClick={onClose}
          className="ml-2 opacity-70 hover:opacity-100">
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </motion.div>
    </div>
  )
}
