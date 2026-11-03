import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scroll to the element named in the URL's #hash once the page has rendered it. The browser's
 * own attempt runs before React renders, so links like "/#discover" would otherwise stay at the top.
 */
export const ScrollToHash: React.FC = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) return;

    let id = hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      // Malformed percent-encoding such as "#100%": use the fragment as written.
    }
    document.getElementById(id)?.scrollIntoView();
  }, [pathname, hash]);

  return null;
};

export default ScrollToHash;
