import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const referenceDir = new URL('../docs/reference/badminton/', import.meta.url);
export const readReference = name => JSON.parse(readFileSync(new URL(name, referenceDir), 'utf8'));
const escapeXml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
const n = value => Number(value.toFixed(4));

export function renderCourt(court, sources) {
  const scale = 50;
  const sx = z => n(550 + z * scale);
  const sy = x => n(340 - x * scale);
  const { length, doublesWidth, singlesWidth, lineWidth } = court.dimensions;
  const rects = court.markings.rectangles.map(({ id, label, bounds: b }) =>
    `<rect id="${escapeXml(id)}" x="${sx(b.zMin)}" y="${sy(b.xMax)}" width="${n((b.zMax-b.zMin)*scale)}" height="${n((b.xMax-b.xMin)*scale)}"><title>${escapeXml(label)}</title></rect>`).join('\n');
  const text = (x,y,value,extra='') => `<text x="${x}" y="${y}" ${extra}>${escapeXml(value)}</text>`;
  const dim = (x1,y1,x2,y2,label,tx,ty) => `<path d="M${x1},${y1} L${x2},${y2}" class="dimension"/>${text(tx,ty,label,'text-anchor="middle"')}`;
  const shortLine = court.markings.rectangles.find(line => line.id === 'short-service-positive');
  const badges = [
    [1,570,sy(doublesWidth/2),'Doubles sideline'], [2,720,sy(singlesWidth/2),'Singles sideline'],
    [3,sx(-length/2),350,'Back boundary / singles long service line'], [4,sx(shortLine.bounds.zMin),250,'Short service line'],
    [5,sx(court.markings.rectangles.find(line => line.id==='doubles-long-service-positive').bounds.zMax),410,'Doubles long service line'],
    [6,760,340,'Centre service line']
  ];
  const marks = badges.map(([i,x,y])=>`<circle cx="${x}" cy="${y}" r="11" fill="#fcd34d"/>${text(x,y+4,i,'text-anchor="middle" fill="#172554" font-size="13"')}`).join('\n');
  const legend = badges.map(([i,,,label],index)=>text(index<3?100:575,650+(index%3)*29,`${i}. ${label}`)).join('\n');
  const source = sources.sources.find(source => source.id === court.dimensions.reference.sourceId);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="850" viewBox="0 0 1100 850" role="img" aria-labelledby="title desc">
<title id="title">BWF badminton court — ShuttleMotion data diagram</title>
<desc id="desc">Court ${length} × ${doublesWidth} metres; singles width ${singlesWidth} metres. Painted lines use their actual outer edges. The dashed centre line represents the net, not a painted marking.</desc>
<style>text{font-family:Arial,sans-serif;font-size:17px;fill:#172554}.dimension{stroke:#475569;stroke-width:1;fill:none;marker-start:url(#arrow);marker-end:url(#arrow)}</style>
<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse"><path d="M8 0 L0 4 L8 8" fill="none" stroke="#475569"/></marker></defs>
<rect width="1100" height="850" fill="#f8fafc"/>
${text(550,52,'SHUTTLEMOTION · BADMINTON COURT','text-anchor="middle" font-weight="bold" font-size="26"')}
${text(550,84,`BWF ${source.version} · effective ${source.effectiveDate} · metres`,'text-anchor="middle"')}
<rect x="${sx(-length/2)}" y="${sy(doublesWidth/2)}" width="${length*scale}" height="${doublesWidth*scale}" fill="#166534"/>
<g fill="white">${rects}</g>
<path d="M550 ${sy(doublesWidth/2)} V${sy(-doublesWidth/2)}" stroke="#fcd34d" stroke-width="2" stroke-dasharray="6 5"/>
${text(550,175,'Net / z = 0','text-anchor="middle"')}
${dim(sx(-length/2),130,sx(length/2),130,`${length.toFixed(2)} m`,550,118)}
${dim(940,sy(doublesWidth/2),940,sy(-doublesWidth/2),`${doublesWidth.toFixed(2)} m`,990,340)}
${dim(sx(-length/2)-65,sy(singlesWidth/2),sx(-length/2)-65,sy(-singlesWidth/2),`${singlesWidth.toFixed(2)} m`,100,340)}
${dim(550,535,sx(shortLine.bounds.zMin),535,`${shortLine.bounds.zMin.toFixed(2)} m`,(550+sx(shortLine.bounds.zMin))/2,562)}
${text(550,590,`Line width: ${lineWidth*1000} mm · +z points right · +x points up`,'text-anchor="middle"')}
${marks}
${legend}
${text(100,760,'Yellow dashed line: net plane. Numbered badges identify markings.')}
${text(100,788,'Source: BWF Law 1 / Diagram A, pages 1–2. Generated from court.json.')}
${text(100,816,'Version pinned for reference; latest effective version not confirmed.')}
</svg>\n`;
}

export function renderRules(data, sources) {
  const entries = data.rules.map(rule => {
    const source = sources.sources.find(source => source.id === rule.reference.sourceId);
    return `## ${rule.id} — ${rule.title}\n\n${rule.summary}\n\n**Project-authored example:** ${rule.example}\n\nSource: [BWF ${source.version}](${source.url}), clauses ${rule.reference.clauses.join(', ')}, pages ${rule.reference.pages.join(', ')}.\n`;
  });
  return '# Basic badminton rules — English reference\n\nGenerated from rules.json. Scope: standard indoor singles and doubles. This project summary is neither an official translation nor a match adjudication engine. Consult the full source for exceptions; the latest effective version has not been confirmed.\n\n' + entries.join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const sources = readReference('sources.json');
  writeFileSync(new URL('court.svg',referenceDir),renderCourt(readReference('court.json'),sources));
  writeFileSync(new URL('RULES.en.md',referenceDir),renderRules(readReference('rules.json'),sources));
  console.log('Generated court.svg and RULES.en.md');
}
