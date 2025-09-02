
import React from 'react'

export default function About() {
  return (
    <div>
      <h2>About</h2>
      <p><strong>NFL Jim Trivia</strong> is a minimalist, stats-first guessing game. Guess the player from a PFR-style regular-season career table.</p>
      <ul>
        <li>Positions: QB, RB, WR, TE</li>
        <li>Era: 1980–2024</li>
        <li>Regular season only</li>
      </ul>
      <p>UI is deliberately brutalist: system fonts, black on white, minimal borders, no images or logos.</p>
      <p>Facts are drawn from an offline demo dataset. Replace it with your own bundle to expand coverage.</p>
    </div>
  )
}
