export const getOrigin = (url: string) => {
  if (typeof url !== 'string') return 'unknown';
  if (url.indexOf('file://') === 0) return 'file://';
  // eslint-disable-next-line no-useless-escape
  const parts = url.match(/^.+\:\/\/[^\/]+/);
  return Array.isArray(parts) && parts.length > 0 ? parts[0] : 'unknown';
};

export const getHost = (url: unknown) => {
  if (typeof url !== 'string') return;
  const [, , uri] = url.match(/^(https?):\/\/([^:/]+)?/i) ?? [];
  if (uri) {
    const parts = uri.split('.');

    return parts.length > 2
      ? // slice subdomain
        parts.slice(parts.length - 2, parts.length).join('.')
      : uri;
  }
};
