export const lineGeometry = ({ bounds }) => ({
  width: bounds.xMax - bounds.xMin,
  length: bounds.zMax - bounds.zMin,
  x: (bounds.xMin + bounds.xMax) / 2,
  z: (bounds.zMin + bounds.zMax) / 2
});

export function lineRole(id, mode) {
  if (id.startsWith('baseline-') || id.startsWith(`${mode}-side-`)) return 'boundary';
  if (id.startsWith('short-service-') ||
    (mode === 'doubles' && id.startsWith('doubles-long-service-'))) return 'service';
  return 'standard';
}

export function courtMetrics(court) {
  const bounds = court.markings.rectangles;
  const centre = id => {
    const line = bounds.find(item => item.id === id);
    return lineGeometry(line).z;
  };
  return {
    length: court.dimensions.length,
    doublesWidth: court.dimensions.doublesWidth,
    singlesWidth: court.dimensions.singlesWidth,
    lineWidth: court.dimensions.lineWidth,
    shortServiceFromNet: bounds.find(item => item.id === 'short-service-positive').bounds.zMin,
    doublesLongServiceFromBack: centre('baseline-positive') - centre('doubles-long-service-positive'),
    postHeight: court.equipment.posts.height,
    netDepth: court.equipment.net.depth,
    netCentreHeight: court.equipment.net.centreTopHeight,
    netSideHeight: court.equipment.net.sidelineTopHeight
  };
}

const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

export function courtSvg(court, mode, labels, locale = 'vi', overlay = '') {
  const { length, doublesWidth, singlesWidth } = court.dimensions;
  const x0 = -doublesWidth / 2;
  const z0 = -length / 2;
  const number = value => new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  const lines = court.markings.rectangles.map(line => {
    const b = line.bounds;
    const labelKey = line.id.replace(/-(positive|negative)$/, '');
    return `<rect class="marking ${lineRole(line.id, mode)}" data-line-id="${escape(line.id)}" x="${b.xMin}" y="${b.zMin}" width="${b.xMax - b.xMin}" height="${b.zMax - b.zMin}"><title>${escape(labels.lineNames?.[labelKey] ?? line.label)}</title></rect>`;
  }).join('');
  const posts = court.equipment.posts.anchors.map(post => `<circle class="post" cx="${post.x}" cy="${post.z}" r="0.07"/>`).join('');
  return `<svg class="court-svg" xmlns="http://www.w3.org/2000/svg" viewBox="${x0 - 1.1} ${z0 - 0.85} ${doublesWidth + 2.2} ${length + 1.7}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escape(labels.court)}">
    <title>${escape(labels.court)}</title>
    <rect class="court-floor" x="${x0}" y="${z0}" width="${doublesWidth}" height="${length}"/>
    ${lines}
    <line class="net" x1="${x0}" x2="${-x0}" y1="0" y2="0"/>
    ${posts}
    ${overlay}
    <line class="dimension" x1="${x0 - 0.42}" x2="${x0 - 0.42}" y1="${z0}" y2="${-z0}"/>
    <text class="dimension-label" x="${x0 - 0.58}" y="0" text-anchor="middle" transform="rotate(-90 ${x0 - 0.58} 0)">${number(length)} m</text>
    <line class="dimension" x1="${x0}" x2="${-x0}" y1="${z0 - 0.42}" y2="${z0 - 0.42}"/>
    <text class="dimension-label" x="0" y="${z0 - 0.54}" text-anchor="middle">${number(doublesWidth)} m</text>
    <line class="dimension" x1="${-singlesWidth / 2}" x2="${singlesWidth / 2}" y1="${-z0 + 0.34}" y2="${-z0 + 0.34}"/>
    <text class="dimension-label" x="0" y="${-z0 + 0.68}" text-anchor="middle">${number(singlesWidth)} m</text>
  </svg>`;
}
