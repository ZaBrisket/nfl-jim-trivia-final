import React, { useEffect, useRef } from 'react';
import { Player } from '../types';

interface Props {
  suggestions: Player[];
  selectedIndex: number;
  onSelect: (player: Player) => void;
  visible: boolean;
}

export const PlayerSuggestions: React.FC<Props> = ({
  suggestions,
  selectedIndex,
  onSelect,
  visible
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedIndex]);

  if (!visible || suggestions.length === 0) {
    return null;
  }

  return (
    <div
      ref={listRef}
      className="suggestions-dropdown"
      role="listbox"
      aria-label="Player suggestions"
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: 'var(--bg, #fff)',
        border: '1px solid var(--border, #ddd)',
        borderRadius: '4px',
        marginTop: '4px',
        maxHeight: '300px',
        overflowY: 'auto',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        zIndex: 1000
      }}
    >
      {suggestions.map((player, index) => {
        const isSelected = index === selectedIndex;
        return (
          <button
            key={player.id}
            ref={isSelected ? selectedItemRef : null}
            type="button"
            role="option"
            aria-selected={isSelected}
            onClick={() => onSelect(player)}
            onMouseEnter={(e) => {
              // Prevent selection highlight on hover during keyboard navigation
              if (e.currentTarget === document.activeElement) return;
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: 'none',
              borderBottom: index < suggestions.length - 1 ? '1px solid var(--border, #eee)' : 'none',
              backgroundColor: isSelected ? 'var(--accent, #007bff)' : 'transparent',
              color: isSelected ? '#fff' : 'var(--text, #333)',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'background-color 0.15s ease',
              fontFamily: 'inherit',
              fontSize: '14px'
            }}
            onMouseDown={(e) => {
              // Prevent input blur before click completes
              e.preventDefault();
            }}
          >
            <span style={{ fontWeight: 500 }}>
              {player.displayName}
            </span>
            <span
              style={{
                fontSize: '12px',
                opacity: 0.7,
                marginLeft: '8px'
              }}
            >
              {player.position}
              {player.team && ` • ${player.team}`}
            </span>
          </button>
        );
      })}
    </div>
  );
};
