
import React from 'react'

interface Props {
  onSlash: () => void
  onEnter: () => void
  onHint1: () => void
  onHint2: () => void
  onEscape: () => void
}

export function KeyboardShortcuts({ onSlash, onEnter, onHint1, onHint2, onEscape }: Props) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); onSlash() }
      else if (e.key === 'Enter') { onEnter() }
      else if (e.key === '1') { onHint1() }
      else if (e.key === '2') { onHint2() }
      else if (e.key === 'Escape') { onEscape() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onSlash, onEnter, onHint1, onHint2, onEscape])
  return null
}
