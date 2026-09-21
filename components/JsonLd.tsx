import React from 'react';

/**
 * Renders a Schema.org JSON-LD script tag.
 * Keep the data strictly factual and matching visible page content.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
