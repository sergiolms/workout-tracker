'use client';

import { useEffect } from 'react';

export function useThemeColor(dark: boolean) {
  useEffect(() => {
    const color = dark ? '#111b18' : '#f5f7f1';
    const nodes = document.querySelectorAll<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    nodes.forEach((node) => {
      node.content = color;
      node.removeAttribute('media');
    });
  }, [dark]);
}
