import React, { useState } from 'react';

const FALLBACK_IMAGE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 200 300" preserveAspectRatio="xMidYMid slice"><rect width="200" height="300" fill="%231a1a2e" /><text x="50%" y="50%" fill="%23666666" font-family="sans-serif" font-size="14" text-anchor="middle" dominant-baseline="middle">No Image</text></svg>`;

export default function SafeImage({ src, alt, className, style, onClick }) {
  const [error, setError] = useState(false);

  React.useEffect(() => {
    setError(false);
  }, [src]);

  return (
    <img
      src={error || !src ? FALLBACK_IMAGE : src}
      alt={alt || 'Image'}
      className={className}
      style={style}
      onClick={onClick}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}
