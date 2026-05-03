import { useState, useEffect } from 'react'

export function useCountUp(end, duration = 1000) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTime = null
    let animationFrameId = null

    // Ensure we start from 0 on end value change or properly animate to the new end
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      
      // easeOutQuart
      const ease = 1 - Math.pow(1 - progress, 4)
      
      setCount(Math.floor(ease * end))
      
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate)
      }
    }
    
    // reset count if needed, but in this basic version we just animate from 0 to end every time `end` changes
    setCount(0)
    animationFrameId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animationFrameId)
  }, [end, duration])

  return count
}
