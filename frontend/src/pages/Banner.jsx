import React from 'react';

export function Banner({ type = 'info', children }) {
  return <div className={`banner banner-${type}`}>{children}</div>;
}
