'use client';

import React from 'react';

/**
 * Renders `text` with the first case-insensitive occurrence of `query`
 * visually highlighted. Used by the command palette to make fuzzy/substring
 * matches obvious without changing the surrounding layout.
 */
export const HighlightedText: React.FC<{ text: string; query: string }> = ({
  text,
  query,
}) => {
  const q = query.trim();
  if (!q) return <>{text}</>;

  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[#C6A15B]/30 dark:bg-[#C6A15B]/25 text-inherit rounded-[3px] px-0.5">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
};
