import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readReference, referenceDir, renderCourt, renderRules } from '../scripts/generate-badminton-reference.mjs';

const court = readReference('court.json');
const sources = readReference('sources.json');
const rules = readReference('rules.json');
const lines = court.markings.rectangles;
const zones = court.serviceAreas.rectangles;
const close = (a,b) => assert.ok(Math.abs(a-b)<1e-9, `${a} != ${b}`);
const contains = (b,x,z,inclusive=true) => inclusive
  ? x>=b.xMin && x<=b.xMax && z>=b.zMin && z<=b.zMax
  : x>b.xMin && x<b.xMax && z>b.zMin && z<b.zMax;
const zone = id => zones.find(zone=>zone.id===id);

test('JSON records have unique IDs and resolve their source references', () => {
  for (const records of [sources.sources, lines, zones, court.rallyAreas.rectangles, rules.rules]) {
    assert.equal(new Set(records.map(r=>r.id)).size,records.length);
    assert.ok(records.every(r=>typeof r.id==='string' && r.id.length>0));
  }
  function inspect(value) {
    if (!value || typeof value!=='object') return;
    if ('sourceId' in value) {
      const source=sources.sources.find(s=>s.id===value.sourceId);
      assert.ok(source,`Unknown source ${value.sourceId}`);
      assert.ok(value.clauses.length>0);
      assert.ok(value.pages.length>0);
      assert.ok(value.pages.every(p=>Number.isInteger(p) && source.usedPages.includes(p)));
    }
    Object.values(value).forEach(inspect);
  }
  inspect(court); inspect(rules);
  for (const source of sources.sources) {
    assert.match(source.url,/^https:\/\//);
    assert.match(source.sha256,/^[a-f0-9]{64}$/);
    assert.ok(source.effectiveDate<=source.checkedDate);
    assert.equal(source.currentnessStatus,'not-confirmed');
  }
});

test('BWF Diagram A outer dimensions and full-width painted rectangles', () => {
  assert.equal(court.unit,'m');
  assert.equal(court.dimensions.length,13.4);
  assert.equal(court.dimensions.doublesWidth,6.1);
  assert.equal(court.dimensions.singlesWidth,5.18);
  assert.equal(court.dimensions.lineWidth,.04);
  assert.equal(lines.length,12);
  // Independent transcription of the dimension chains in Diagram A (PDF page 2).
  const expected = {
    'doubles-side-positive':[3.01,3.05,-6.7,6.7],
    'singles-side-positive':[2.55,2.59,-6.7,6.7],
    'baseline-positive':[-3.05,3.05,6.66,6.7],
    'short-service-positive':[-3.05,3.05,1.98,2.02],
    'doubles-long-service-positive':[-3.05,3.05,5.90,5.94],
    'centre-positive':[-.02,.02,2.02,6.66]
  };
  for (const [id,values] of Object.entries(expected)) {
    const b=lines.find(l=>l.id===id).bounds;
    assert.deepEqual([b.xMin,b.xMax,b.zMin,b.zMax],values,id);
  }
  for (const {bounds:b} of lines) {
    assert.ok(Object.values(b).every(Number.isFinite));
    assert.ok(b.xMin<b.xMax && b.zMin<b.zMax);
    assert.ok(b.xMin>=-3.05 && b.xMax<=3.05 && b.zMin>=-6.7 && b.zMax<=6.7);
    close(Math.min(b.xMax-b.xMin,b.zMax-b.zMin),.04);
    assert.ok(lines.some(({bounds:c})=>c.xMin===-b.xMax && c.xMax===-b.xMin && c.zMin===-b.zMax && c.zMax===-b.zMin),'Missing mirrored marking');
  }
  close(6.66-5.94,.72); // Clear gap, not the 0.76 m centre-to-centre distance.
});

test('net and posts preserve Law 1 equipment requirements', () => {
  const {net,posts}=court.equipment;
  assert.equal(net.z,0);
  assert.equal(net.widthMin,6.1);
  assert.equal(net.depth,.76);
  assert.equal(net.centreTopHeight,1.524);
  assert.equal(net.sidelineTopHeight,1.55);
  assert.equal(net.tapeWidth,.075);
  assert.equal(net.meshMin,.015);
  assert.equal(net.meshMax,.020);
  assert.equal(posts.height,1.55);
  assert.deepEqual(posts.anchors,[{x:-3.05,y:0,z:0},{x:3.05,y:0,z:0}]);
});

test('service areas include landing lines and exclude standing lines', () => {
  assert.equal(zones.length,8);
  assert.equal(court.rallyAreas.boundary,'inclusive');
  assert.equal(court.serviceAreas.landingBoundary,'inclusive');
  assert.equal(court.serviceAreas.standingBoundary,'exclusive');
  assert.deepEqual(zone('singles-positive-x-positive').landing,{xMin:-.02,xMax:2.59,zMin:1.98,zMax:6.7});
  assert.deepEqual(zone('singles-positive-x-positive').standing,{xMin:.02,xMax:2.55,zMin:2.02,zMax:6.66});
  assert.deepEqual(zone('doubles-positive-x-positive').landing,{xMin:-.02,xMax:3.05,zMin:1.98,zMax:5.94});
  assert.deepEqual(zone('doubles-positive-x-positive').standing,{xMin:.02,xMax:3.01,zMin:2.02,zMax:5.90});
  for (const current of zones) {
    const opposite=zone(current.diagonalReceiverId);
    assert.ok(opposite);
    assert.equal(opposite.diagonalReceiverId,current.id);
    assert.equal(current.playerCourt,opposite.playerCourt);
    for (const field of ['landing','standing']) {
      const a=current[field],b=opposite[field];
      assert.ok(Object.values(a).every(Number.isFinite));
      assert.ok(a.xMin<a.xMax && a.zMin<a.zMax);
      assert.ok(a.xMin>=-3.05 && a.xMax<=3.05 && a.zMin>=-6.7 && a.zMax<=6.7);
      assert.deepEqual(b,{xMin:-a.xMax,xMax:-a.xMin,zMin:-a.zMax,zMax:-a.zMin});
    }
    assert.ok(contains(current.landing,current.standing.xMin,current.standing.zMin));
    assert.ok(contains(current.landing,current.standing.xMax,current.standing.zMax));
  }
});

const cases = [
  ['doubles side alley is valid in doubles service','doubles-positive-x-positive',2.8,3,true,false],
  ['doubles side alley is out in singles service','singles-positive-x-positive',2.8,3,false,false],
  ['rear strip is out in doubles service','doubles-positive-x-positive',1,6.3,false,false],
  ['rear strip is in in singles service','singles-positive-x-positive',1,6.3,true,false],
  ['short-service near edge counts for landing','doubles-positive-x-positive',1,1.98,true,false],
  ['point just before short-service line is out','doubles-positive-x-positive',1,1.979,false,false],
  ['centre stripe counts in right landing box','doubles-positive-x-positive',-.02,3,true,false],
  ['painted centre stripe cannot support the foot','doubles-positive-x-positive',0,3,false,true],
  ['standing at inner edge still touches line','doubles-positive-x-positive',.02,3,false,true],
  ['standing point inside clear floor','doubles-positive-x-positive',1,3,true,true],
  ['standing on short-service paint is invalid','doubles-positive-x-positive',1,2.01,false,true],
  ['standing on long-service paint is invalid','doubles-positive-x-positive',1,5.92,false,true],
  ['doubles long-service far edge is in','doubles-positive-x-positive',1,5.94,true,false],
  ['just beyond doubles long-service far edge is out','doubles-positive-x-positive',1,5.941,false,false]
];
for (const [title,id,x,z,expected,standing] of cases) {
  test(title,()=>assert.equal(contains(zone(id)[standing?'standing':'landing'],x,z,!standing),expected));
}

test('rally boundaries retain rear strip and distinguish singles/doubles sidelines',()=>{
  const single=court.rallyAreas.rectangles.find(r=>r.id==='singles');
  const double=court.rallyAreas.rectangles.find(r=>r.id==='doubles');
  assert.equal(contains(single,2.8,3),false);
  assert.equal(contains(double,2.8,3),true);
  assert.equal(contains(double,1,6.3),true);
  assert.equal(contains(double,3.05,6.7),true);
  assert.equal(contains(double,3.051,6.7),false);
});

test('player right/left service courts use each player viewpoint',()=>{
  assert.equal(zone('doubles-positive-x-positive').playerCourt,'right');
  assert.equal(zone('doubles-negative-x-negative').playerCourt,'right');
  assert.equal(zone('doubles-positive-x-negative').playerCourt,'left');
  assert.equal(zone('doubles-negative-x-positive').playerCourt,'left');
});

test('SVG uses the same scale for both axes and keeps net at the origin',()=>{
  const svg=renderCourt(court,sources);
  assert.ok(svg.includes('x="215" y="187.5" width="670" height="305"'));
  assert.ok(svg.includes('M550 187.5 V492.5'));
  assert.ok(svg.includes('id="short-service-positive" x="649" y="187.5" width="2" height="305"'));
});

test('rules cover required topics with explicit project-authored examples',()=>{
  for(const id of ['scoring','ends','service-position','service-action','singles','doubles','service-errors','boundaries','faults','let','out-of-play']) {
    const rule=rules.rules.find(r=>r.id===id);
    assert.ok(rule,`Missing ${id}`);
    assert.ok(rule.summary.length && rule.example.length && rule.title.length);
    assert.equal(rule.exampleOrigin,'project-authored');
  }
});

test('generated SVG and English rules are deterministic and up to date',()=>{
  const svg=renderCourt(court,sources);
  assert.equal(svg,readFileSync(new URL('court.svg',referenceDir),'utf8'));
  assert.equal(svg,renderCourt(court,sources));
  assert.equal(renderRules(rules,sources),readFileSync(new URL('RULES.en.md',referenceDir),'utf8'));
  for(const line of lines) assert.ok(svg.includes(`id="${line.id}"`));
  const changed=structuredClone(court);
  changed.markings.rectangles[0].bounds.xMin-=.01;
  assert.notEqual(renderCourt(changed,sources),svg,'SVG must consume JSON geometry');
  changed.markings.rectangles[0].label='<unsafe & label>';
  assert.ok(renderCourt(changed,sources).includes('&lt;unsafe &amp; label&gt;'));
});
