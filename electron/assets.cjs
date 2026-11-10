const path = require('node:path');
function resolveAssetUrl(raw, root) {
  const url = new URL(raw);
  if (url.protocol !== 'riptide-assets:' || url.hostname !== 'bundle') return null;
  const pathname = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  if (pathname.includes('\\') || pathname.includes(':')) return null;
  const target = path.resolve(root, pathname), relative = path.relative(root, target);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null;
  if (!['.json', '.glb', '.png', '.jpg', '.hdr', '.txt'].includes(path.extname(target).toLowerCase())) return null;
  return target;
}
module.exports = { resolveAssetUrl };
