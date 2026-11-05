// Browser-side measurements against immutable pre-repair SVG geometry.
export async function measureVisualWeight({ source, original, spec }) {
  const size = 768;
  const scale = size / 24;
  const variant = (width, legacy = false) => {
    const svg = new DOMParser().parseFromString(source, 'image/svg+xml').documentElement;
    for (const node of svg.querySelectorAll('[stroke-width]'))
      node.setAttribute('stroke-width', String(width));
    if (legacy) {
      for (const role of spec.nodeRoles) {
        if (role.oldWidth === undefined) continue;
        let node = svg;
        for (const i of role.locator) node = node.children[i];
        if (!node) throw new Error('Invalid locator');
        node.setAttribute('stroke-width', String(role.oldWidth));
      }
    }
    return new XMLSerializer().serializeToString(svg);
  };
  const raster = async (text) => {
    const svg = new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('style', 'color:#353639');
    const image = new Image();
    const ready = new Promise((ok, no) => {
      image.onload = ok;
      image.onerror = no;
    });
    image.src =
      'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(new XMLSerializer().serializeToString(svg));
    await ready;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, size, size).data;
    return {
      data,
      mask: Uint8Array.from({ length: size * size }, (_, i) => +(data[i * 4 + 3] >= 128)),
    };
  };
  const topology = (mask) => {
    const visited = new Uint8Array(mask.length);
    let components = 0,
      holes = 0;
    const queue = new Int32Array(mask.length);
    for (let start = 0; start < mask.length; start++) {
      if (visited[start]) continue;
      const paint = mask[start];
      let edge = false,
        head = 0,
        tail = 1;
      queue[0] = start;
      visited[start] = 1;
      while (head < tail) {
        const i = queue[head++],
          x = i % size,
          y = Math.floor(i / size);
        if (!x || !y || x === size - 1 || y === size - 1) edge = true;
        for (const [dx, dy] of [
          [0, -1],
          [-1, 0],
          [1, 0],
          [0, 1],
        ]) {
          const xx = x + dx,
            yy = y + dy,
            j = yy * size + xx;
          if (xx >= 0 && yy >= 0 && xx < size && yy < size && !visited[j] && mask[j] === paint) {
            visited[j] = 1;
            queue[tail++] = j;
          }
        }
      }
      if (paint) components++;
      else if (!edge) holes++;
    }
    return { components, holes };
  };
  const bounds = (mask) => {
    let x0 = size,
      y0 = size,
      x1 = -1,
      y1 = -1,
      count = 0;
    for (let i = 0; i < mask.length; i++)
      if (mask[i]) {
        const x = i % size,
          y = Math.floor(i / size);
        count++;
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
    return { edges: count ? [x0, y0, x1, y1].map((v) => v / scale) : null, count };
  };
  const distanceToPaint = (mask) => {
    const d = Float32Array.from(mask, (v) => (v ? 0 : size * 2));
    const diagonal = Math.SQRT2;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        if (x) d[i] = Math.min(d[i], d[i - 1] + 1);
        if (y) d[i] = Math.min(d[i], d[i - size] + 1);
        if (x && y) d[i] = Math.min(d[i], d[i - size - 1] + diagonal);
        if (x < size - 1 && y) d[i] = Math.min(d[i], d[i - size + 1] + diagonal);
      }
    for (let y = size - 1; y >= 0; y--)
      for (let x = size - 1; x >= 0; x--) {
        const i = y * size + x;
        if (x < size - 1) d[i] = Math.min(d[i], d[i + 1] + 1);
        if (y < size - 1) d[i] = Math.min(d[i], d[i + size] + 1);
        if (x < size - 1 && y < size - 1) d[i] = Math.min(d[i], d[i + size + 1] + diagonal);
        if (x && y < size - 1) d[i] = Math.min(d[i], d[i + size - 1] + diagonal);
      }
    return d;
  };
  const old = await raster(original),
    rebuilt = await raster(variant(spec.oldWidth ?? 2, true));
  let intersection = 0,
    union = 0,
    maxDistance = 0;
  const od = distanceToPaint(old.mask),
    nd = distanceToPaint(rebuilt.mask);
  for (let i = 0; i < old.mask.length; i++) {
    if (old.mask[i] && rebuilt.mask[i]) intersection++;
    if (old.mask[i] || rebuilt.mask[i]) union++;
    if (old.mask[i]) maxDistance = Math.max(maxDistance, nd[i]);
    if (rebuilt.mask[i]) maxDistance = Math.max(maxDistance, od[i]);
  }
  const ob = bounds(old.mask),
    nb = bounds(rebuilt.mask);
  const widths = {};
  let defaultRaster;
  for (const w of [0, 1, 1.5, 2, 3]) {
    const r = await raster(variant(w));
    if (w === 1) defaultRaster = r;
    widths[w] = { ...bounds(r.mask), topology: topology(r.mask) };
  }
  const thickness = (spec.sampleSegments ?? []).map((s) => {
    let sum = 0;
    if (s.axis !== 'x' && s.axis !== 'y') throw new Error('VISUAL_WEIGHT_SAMPLE_AXIS_UNSUPPORTED');
    for (let i = Math.round(s.from * scale); i < Math.round(s.to * scale); i++) {
      const fixed = Math.round(s.at * scale),
        x = s.axis === 'x' ? i : fixed,
        y = s.axis === 'x' ? fixed : i;
      sum += defaultRaster.data[(y * size + x) * 4 + 3] / 255;
    }
    return { ...s, actual: sum / scale };
  });
  return {
    iou: intersection / union,
    contourDistance: maxDistance / scale,
    boundsDelta: Math.max(...ob.edges.map((v, i) => Math.abs(v - nb.edges[i]))),
    oldTopology: topology(old.mask),
    rebuiltTopology: topology(rebuilt.mask),
    widths,
    thickness,
    legacySvg: variant(spec.oldWidth ?? 2, true),
  };
}
