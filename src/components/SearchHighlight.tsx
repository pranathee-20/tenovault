/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface SearchHighlightProps {
  text: string | null | undefined;
  query: string;
  className?: string;
}

/**
 * Reusable keyword highlight component for search reviews.
 * Safely handles regex characters and preserves case while highlighting matches.
 */
export function SearchHighlight({ text, query, className = '' }: SearchHighlightProps) {
  if (!text) return null;
  const trimmed = query.trim();
  if (!trimmed) return <span className={className}>{text}</span>;

  // Escape special regex characters
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Match case-insensitively
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  if (parts.length === 1) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {parts.map((part, i) => {
        // Test if this part matches the query
        if (part.toLowerCase() === trimmed.toLowerCase()) {
          return (
            <mark
              key={i}
              className="bg-amber-400/30 text-amber-200 font-semibold px-0.5 py-0.2 rounded border border-amber-500/40 not-italic"
            >
              {part}
            </mark>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </span>
  );
}
