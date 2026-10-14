import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { lineGeometry, lineRole } from './court-geometry.mjs';
import { netHeightAt, racketReach, strokeColours } from './shuttle-physics.mjs';

const colours = { standard: 0xe6f4e9, boundary: 0xf7c86a, service: 0xa9e5df };

export function mountCourt3d(host, court, mode, label, shuttleSpec) {
  const { length, doublesWidth } = court.dimensions;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, length * 10);
  const basePosition = new THREE.Vector3(doublesWidth * 1.45, length * 0.9, length * 1.3);
  const initialPosition = basePosition.clone();
  camera.position.copy(initialPosition);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', label);
  renderer.domElement.style.touchAction = 'none';
  host.append(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 1.65));
  const light = new THREE.DirectionalLight(0xffffff, 2);
  light.position.set(-5, 12, 8);
  scene.add(light);
  function horizontal(width, depth, color, y) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = y;
    scene.add(mesh);
    return mesh;
  }
  horizontal(doublesWidth + 3, length + 3, 0x244845, -0.025);
  horizontal(doublesWidth, length, 0x1d7d63, 0);

  const markings = court.markings.rectangles.map(line => {
    const g = lineGeometry(line);
    const mesh = horizontal(g.width, g.length, colours[lineRole(line.id, mode)], 0.006);
    mesh.position.x = g.x;
    mesh.position.z = g.z;
    return { id: line.id, mesh };
  });

  const net = court.equipment.net;
  const width = net.widthMin;
  function netPanel(topOffset, bottomOffset, material) {
    const vertices = [];
    const segments = 16;
    for (let i = 0; i < segments; i++) {
      const x1 = -width / 2 + width * i / segments;
      const x2 = -width / 2 + width * (i + 1) / segments;
      const a = netHeightAt(net, x1) - topOffset;
      const b = netHeightAt(net, x2) - topOffset;
      const c = netHeightAt(net, x1) - bottomOffset;
      const d = netHeightAt(net, x2) - bottomOffset;
      vertices.push(x1, a, 0, x1, c, 0, x2, b, 0, x2, b, 0, x1, c, 0, x2, d, 0);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    return mesh;
  }
  netPanel(0, net.depth, new THREE.MeshBasicMaterial({ color: 0xc8e7dd, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  netPanel(0, net.tapeWidth, new THREE.MeshBasicMaterial({ color: 0xf5f7ed, side: THREE.DoubleSide }));

  for (const post of court.equipment.posts.anchors) {
    const height = court.equipment.posts.height;
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, height, 12), new THREE.MeshStandardMaterial({ color: 0xdcece5, metalness: 0.45, roughness: 0.35 }));
    mesh.position.set(post.x, height / 2, post.z);
    scene.add(mesh);
  }

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.25, 0);
  controls.minDistance = 1.5;
  controls.maxDistance = length * 3.4;
  controls.maxPolarAngle = Math.PI / 2.08;
  controls.enableDamping = false;
  let userMoved = false;
  controls.addEventListener('start', () => { userMoved = true; });
  // Coalesce: layer updates made in one task (e.g. four players, shuttle and trail in one animation frame) render
  // once, in the same frame, when that task ends.
  let queued = false, disposed = false;
  const draw = () => { queued = false; if (!disposed) renderer.render(scene, camera); };
  const render = () => { if (!queued) { queued = true; queueMicrotask(draw); } };
  controls.addEventListener('change', render);
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    initialPosition.copy(basePosition).multiplyScalar(Math.max(1, 1.15 / camera.aspect));
    if (!userMoved) {
      camera.position.copy(initialPosition);
      controls.update();
    }
    renderer.setSize(width, height, false);
    draw(); // setSize clears the canvas; draw now so a resize does not flash empty
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  controls.update();
  resize();

  const layers = {};
  function replace(name, group) {
    layers[name]?.traverse(object => { object.geometry?.dispose(); object.material?.dispose?.(); });
    if (layers[name]) scene.remove(layers[name]);
    layers[name] = group;
    if (group) scene.add(group);
    render();
  }
  const solid = color => new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
  const mid = ([a, b]) => (a + b) / 2000; // mm range -> metres at the Law 2.2 midpoint
  const SHUTTLE_SCALE = 1; // life size; zoom in or use the hitter's view to see it

  // Law 2.2 shape built with the cork leading along local +Y: rounded base, 16 feathers out to the tip circle.
  function shuttleModel(position, direction) {
    const base = mid(shuttleSpec.baseDiameterMm) / 2;
    const tip = mid(shuttleSpec.tipCircleDiameterMm) / 2;
    const feather = mid(shuttleSpec.featherLengthMm);
    const axial = Math.sqrt(feather ** 2 - (tip - base) ** 2);
    const corkLength = base * 2; // ponytail: cork length is not in the Laws; drawn as one base diameter
    const model = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(base, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), solid(0xf3ead8));
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(base, base, corkLength, 16), solid(0xf3ead8));
    cork.position.y = -corkLength / 2;
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(base, tip, axial, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
    skirt.position.y = -corkLength - axial / 2;
    const shafts = [];
    for (let i = 0; i < shuttleSpec.feathers; i++) {
      const a = i / shuttleSpec.feathers * Math.PI * 2;
      shafts.push(new THREE.Vector3(base * Math.cos(a), -corkLength, base * Math.sin(a)), new THREE.Vector3(tip * Math.cos(a), -corkLength - axial, tip * Math.sin(a)));
    }
    const feathers = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(shafts), new THREE.LineBasicMaterial({ color: 0x9aa7a2 }));
    model.add(dome, cork, skirt, feathers);
    model.scale.setScalar(SHUTTLE_SCALE);
    model.position.set(position.x, position.y, position.z);
    model.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(direction.x, direction.y, direction.z).normalize());
    const drop = new THREE.Line(new THREE.BufferGeometry().setFromPoints([model.position, new THREE.Vector3(position.x, 0.01, position.z)]), new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.08, gapSize: 0.06 }));
    drop.computeLineDistances();
    const group = new THREE.Group();
    group.add(model, drop);
    return group;
  }
  function pathLines(paths, dashed) {
    const group = new THREE.Group();
    for (const path of paths) {
      const color = path.color ?? strokeColours[path.stroke] ?? '#ffffff';
      const faded = path.opacity !== undefined ? { transparent: true, opacity: path.opacity, depthWrite: false } : {};
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(path.points.map(p => new THREE.Vector3(...p))), dashed ? new THREE.LineDashedMaterial({ color, dashSize: 0.18, gapSize: 0.1, ...faded }) : new THREE.LineBasicMaterial({ color, ...faded }));
      if (dashed) line.computeLineDistances();
      group.add(line);
      if (path.v0) group.add(new THREE.ArrowHelper(new THREE.Vector3(path.v0.x, path.v0.y, path.v0.z).normalize(), new THREE.Vector3(...path.points[0]), 0.9, color, 0.18, 0.1));
      const end = path.landing ?? path.position;
      if (end) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.15, 24), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
        if (path.landing) ring.rotation.x = -Math.PI / 2; // floor ring; a net hit stays upright on the net plane
        ring.position.set(end.x, path.landing ? 0.012 : end.y, end.z);
        group.add(ring);
      }
    }
    return group;
  }

  // A racket from the butt (in the hand) to the string-bed centre (head), built from player.json racket limits:
  // grip, thin shaft, and an elliptical head whose long axis continues the shaft and whose face is turned as close
  // to `normal` as a face containing the shaft allows (the shuttle leaves along the face normal).
  function racketModel(hand, head, normal, spec, colour = 0xff8a3d) {
    const halfLength = spec.stringAreaLengthMm / 2000;
    const halfWidth = (spec.stringAreaWidthMm ?? spec.stringAreaLengthMm * 0.8) / 2000;
    const u = head.clone().sub(hand).normalize();
    let n = normal.clone().addScaledVector(u, -normal.dot(u));
    if (n.lengthSq() < 1e-6) n = new THREE.Vector3(1, 0, 0).cross(u);
    n.normalize();
    const w = new THREE.Vector3().crossVectors(u, n);
    const group = new THREE.Group();
    const rod = (a, b, radius, color) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 10), solid(color));
      mesh.position.copy(a).add(b).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      group.add(mesh);
    };
    const gripEnd = hand.clone().addScaledVector(u, 0.2); // ponytail: 200 mm grip, not in the Laws; drawing only
    const throat = head.clone().addScaledVector(u, -halfLength);
    rod(hand.clone().addScaledVector(u, -0.02), gripEnd, 0.014, 0x2b2f33);
    if (gripEnd.distanceTo(head) > halfLength) rod(gripEnd, throat, 0.0045, 0xd9dde0);
    const frame = new THREE.Group();
    const strings = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshStandardMaterial({ color: 0xf2f6f3, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
    strings.scale.set(halfWidth, halfLength, 1);
    const rim = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, halfWidth, halfLength).getPoints(48)), new THREE.LineBasicMaterial({ color: colour }));
    frame.add(strings, rim);
    frame.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(w, u, n));
    frame.position.copy(head);
    group.add(frame);
    return group;
  }

  return {
    // direction: where the cork points (the launch velocity), or straight down when no shot is selected.
    setShuttle(position, direction = { x: 0, y: -1, z: 0 }) {
      replace('shuttle', position && shuttleModel(position, direction));
    },
    setPaths(paths) {
      replace('paths', pathLines(paths, false));
    },
    // Comet trail behind a moving shuttle: points oldest first, each { x, y, z, color }, fading from transparent to
    // fully opaque at the head.
    setTrail(points) {
      if (!points?.length) return replace('trail');
      const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(p.x, p.y, p.z)));
      const colors = [];
      points.forEach((p, i) => {
        const c = new THREE.Color(p.color);
        colors.push(c.r, c.g, c.b, ((i + 1) / points.length) ** 1.5);
      });
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
      replace('trail', new THREE.Line(geometry, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false })));
    },
    // Racket face at contact, life size (Law 4 strung-area maximum 280 x 220 mm), facing along the launch direction.
    // A racket on its own (no player drawn): head at position, face along normal, handle pointing down.
    setRacket(position, normal, spec) {
      if (!position || !spec) return replace('racket');
      const n = new THREE.Vector3(normal.x, normal.y, normal.z).normalize();
      const head = new THREE.Vector3(position.x, position.y, position.z);
      let down = new THREE.Vector3(0, -1, 0).addScaledVector(n, n.y);
      if (down.lengthSq() < 1e-6) down = new THREE.Vector3(0, 0, 1);
      const hand = head.clone().addScaledVector(down.normalize(), racketReach(spec));
      replace('racket', racketModel(hand, head, n, spec));
    },
    // Floor markers for target points; the active one is drawn larger.
    setTargets(targets = [], activeId) {
      const group = new THREE.Group();
      for (const target of targets) {
        const active = target.id === activeId;
        const ring = new THREE.Mesh(new THREE.RingGeometry(active ? 0.22 : 0.16, active ? 0.3 : 0.2, 32), new THREE.MeshBasicMaterial({ color: active ? '#ffd84d' : '#ffffff', transparent: true, opacity: active ? 1 : 0.6, side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(target.x, 0.014, target.z);
        group.add(ring);
      }
      replace('targets', group);
    },
    // The receiver's view: shuttle at the contact point with the cork along the arriving velocity, plus dashed returns.
    setReception(reception, returns = []) {
      if (!reception) return replace('reception');
      const group = shuttleModel(reception.position, reception.corkDirection);
      const color = '#ffd84d';
      group.add(new THREE.ArrowHelper(new THREE.Vector3(reception.corkDirection.x, reception.corkDirection.y, reception.corkDirection.z), new THREE.Vector3(reception.position.x, reception.position.y, reception.position.z), 0.9, color, 0.18, 0.1));
      group.add(pathLines(returns, true));
      replace('reception', group);
    },
    // Neutral mannequin scaled to height, facing the net; proportions are approximate and carry no technique meaning.
    // With player.arm ({ shoulder, hand, contact } in world space) the racket arm reaches the contact point, and
    // player.lift raises the whole body (the jump). layer keeps several players (e.g. 'A' and 'B') on court at once.
    setPlayer(player, layer = 'player') {
      if (!player) return replace(layer);
      const h = player.height;
      const shoulderX = player.halfWidth ?? 0.15 * h;
      const root = new THREE.Group();
      const body = new THREE.Group();
      const skin = solid(0xf0c9a8);
      const kit = solid(player.kit ?? 0x2d6cdf);
      const part = (geometry, material, x, y, z = 0) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); body.add(mesh); return mesh; };
      for (const side of [-1, 1]) {
        part(new THREE.CapsuleGeometry(0.055 * h, 0.36 * h, 4, 10), kit, side * 0.06 * h, 0.24 * h);
        if (!(player.arm && side === 1)) part(new THREE.CapsuleGeometry(0.035 * h, 0.3 * h, 4, 10), skin, side * shoulderX, 0.6 * h);
      }
      if (!player.arm && player.racket) {
        // Ready hold in the racket hand (local frame faces -z, right is +x): head up and forward, face to the net.
        const hand = new THREE.Vector3(shoulderX, 0.43 * h, -0.04 * h);
        const head = hand.clone().addScaledVector(new THREE.Vector3(0, 0.75, -0.66).normalize(), racketReach(player.racket));
        const fist = new THREE.Mesh(new THREE.SphereGeometry(0.026 * h, 12, 8), skin);
        fist.position.copy(hand);
        body.add(fist, racketModel(hand, head, new THREE.Vector3(0, 0, -1), player.racket));
      }
      part(new THREE.CapsuleGeometry(0.1 * h, 0.2 * h, 4, 12), kit, 0, 0.64 * h);
      part(new THREE.SphereGeometry(0.065 * h, 16, 12), skin, 0, 0.9 * h);
      part(new THREE.SphereGeometry(0.015 * h, 8, 6), skin, 0, 0.9 * h, -0.065 * h); // nose: built facing -z
      body.position.set(player.x, player.lift ?? 0, player.z);
      body.rotation.y = player.z > 0 ? 0 : Math.PI; // face the net
      root.add(body);
      if (player.arm) {
        const { shoulder, hand, contact } = player.arm;
        const a = new THREE.Vector3(shoulder.x, shoulder.y, shoulder.z);
        const b = new THREE.Vector3(hand.x, hand.y, hand.z);
        const radius = 0.035 * h;
        const arm = new THREE.Mesh(new THREE.CapsuleGeometry(radius, Math.max(0.01, a.distanceTo(b) - 2 * radius), 4, 10), skin);
        arm.position.copy(a).add(b).multiplyScalar(0.5);
        arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
        const tip = player.arm.tip ?? contact;
        const fist = new THREE.Mesh(new THREE.SphereGeometry(0.026 * h, 12, 8), skin);
        fist.position.copy(b);
        root.add(arm, fist);
        if (player.racket) {
          const facing = player.arm.normal ?? { x: 0, y: 0, z: player.z > 0 ? -1 : 1 };
          root.add(racketModel(b, new THREE.Vector3(tip.x, tip.y, tip.z), new THREE.Vector3(facing.x, facing.y, facing.z), player.racket, player.arm.reachable === false ? 0xff4d4d : 0xff8a3d));
        }
        if (player.lift > 0) {
          const jump = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(player.x, 0.01, player.z), new THREE.Vector3(player.x, player.lift, player.z)]), new THREE.LineDashedMaterial({ color: 0xffd84d, dashSize: 0.05, gapSize: 0.04 }));
          jump.computeLineDistances();
          root.add(jump);
        }
      }
      replace(layer, root);
    },
    setMode(nextMode) {
      for (const { id, mesh } of markings) mesh.material.color.setHex(colours[lineRole(id, nextMode)]);
      render();
    },
    zoom(direction) {
      userMoved = true;
      const fromTarget = camera.position.clone().sub(controls.target);
      const next = fromTarget.length() * (direction > 0 ? 0.83 : 1.2);
      fromTarget.setLength(Math.min(controls.maxDistance, Math.max(controls.minDistance, next)));
      camera.position.copy(controls.target).add(fromTarget);
      controls.update();
    },
    // Look at a point from a camera position, both in world metres (e.g. from behind the hitter).
    focus(target, position) {
      userMoved = true;
      controls.target.set(target.x, target.y, target.z);
      camera.position.set(position.x, position.y, position.z);
      controls.update();
    },
    reset() {
      userMoved = false;
      camera.position.copy(initialPosition);
      controls.target.set(0, 0.25, 0);
      controls.update();
    },
    dispose() {
      disposed = true;
      observer.disconnect();
      controls.dispose();
      scene.traverse(object => {
        object.geometry?.dispose();
        if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(item => item.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}
