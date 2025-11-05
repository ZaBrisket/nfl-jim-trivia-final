import { useState, useMemo, useCallback, useEffect } from 'react';
import { Player } from '../types';

interface SuggestionResult {
  player: Player;
  score: number;
}

/**
 * Hook for managing player name suggestions with fuzzy matching
 */
export function usePlayerSuggestions(
  allPlayers: Player[],
  query: string,
  maxSuggestions: number = 5
) {
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [query]);

  // Generate suggestions based on query
  const suggestions = useMemo(() => {
    if (!query || query.length < 2) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    const results: SuggestionResult[] = [];

    for (const player of allPlayers) {
      const displayName = player.displayName.toLowerCase();
      const firstName = player.firstName.toLowerCase();
      const lastName = player.lastName.toLowerCase();

      let score = 0;

      // Exact match
      if (displayName === normalizedQuery) {
        score = 1000;
      }
      // Starts with query
      else if (displayName.startsWith(normalizedQuery)) {
        score = 900;
      }
      // Last name starts with query
      else if (lastName.startsWith(normalizedQuery)) {
        score = 800;
      }
      // First name starts with query
      else if (firstName.startsWith(normalizedQuery)) {
        score = 700;
      }
      // Contains query
      else if (displayName.includes(normalizedQuery)) {
        score = 600;
      }
      // Last name contains query
      else if (lastName.includes(normalizedQuery)) {
        score = 500;
      }
      // Check aliases
      else if (player.aliases) {
        const aliasMatch = player.aliases.find(alias =>
          alias.toLowerCase().includes(normalizedQuery)
        );
        if (aliasMatch) {
          score = 400;
        }
      }

      if (score > 0) {
        results.push({ player, score });
      }
    }

    // Sort by score descending, then alphabetically
    results.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.player.displayName.localeCompare(b.player.displayName);
    });

    return results.slice(0, maxSuggestions).map(r => r.player);
  }, [allPlayers, query, maxSuggestions]);

  const selectNext = useCallback(() => {
    setSelectedIndex(prev => {
      if (suggestions.length === 0) return -1;
      return prev < suggestions.length - 1 ? prev + 1 : prev;
    });
  }, [suggestions.length]);

  const selectPrevious = useCallback(() => {
    setSelectedIndex(prev => {
      if (suggestions.length === 0) return -1;
      return prev > -1 ? prev - 1 : -1;
    });
  }, [suggestions.length]);

  const getSelectedPlayer = useCallback(() => {
    if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
      return suggestions[selectedIndex];
    }
    return null;
  }, [selectedIndex, suggestions]);

  const reset = useCallback(() => {
    setSelectedIndex(-1);
  }, []);

  return {
    suggestions,
    selectedIndex,
    selectNext,
    selectPrevious,
    getSelectedPlayer,
    reset,
    hasSuggestions: suggestions.length > 0
  };
}
