export function getDefaultExportFromNamespaceIfPresent(n: any) {
  return n && Object.prototype.hasOwnProperty.call(n, 'default') ? n.default : n;
}
