import React, { useMemo, useRef, useEffect } from 'react';
import { subscribeRaf } from '../utils/rafLoop';

export type Vector3 = [number, number, number];

export interface MeshData {
  vertices: Vector3[];
  faces: number[][]; // Indices into vertices
}

// Exact 3D Geometry definitions for all polyhedral dice (Guaranteed 100% convex, planar & outward normals)
const POLYHEDRA_GEOMETRY: Record<number, MeshData> = {
  // D6: Cube
  6: {
    vertices: [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1,  1], [1, -1,  1], [1, 1,  1], [-1, 1,  1]
    ],
    faces: [
      [4, 5, 6, 7], // Front (+Z)
      [1, 0, 3, 2], // Back (-Z)
      [7, 6, 2, 3], // Top (+Y)
      [0, 1, 5, 4], // Bottom (-Y)
      [5, 1, 2, 6], // Right (+X)
      [0, 4, 7, 3]  // Left (-X)
    ]
  },

  // D8: Regular Octahedron (Double Pyramid)
  8: {
    vertices: [
      [0, 0, 1.4],   // 0: Top apex
      [1, 0, 0],     // 1: +X
      [0, 1, 0],     // 2: +Y
      [-1, 0, 0],    // 3: -X
      [0, -1, 0],    // 4: -Y
      [0, 0, -1.4]   // 5: Bottom apex
    ],
    faces: [
      [0, 1, 2], // Top Front-Right
      [0, 2, 3], // Top Back-Right
      [0, 3, 4], // Top Back-Left
      [0, 4, 1], // Top Front-Left
      [5, 2, 1], // Bottom Front-Right
      [5, 3, 2], // Bottom Back-Right
      [5, 4, 3], // Bottom Back-Left
      [5, 1, 4]  // Bottom Front-Left
    ]
  },

  // D10: Pentagonal Trapezohedron
  10: (() => {
    // Mathematically perfect fair D10 proportions
    // h = H * (1 - cos(36°)) / (1 + cos(36°)) ~= H * 0.10557
    const H = 1.45;
    const R = 1.05;
    const h = H * 0.1055728; 
    
    const topApex: Vector3 = [0, 0, H];
    const bottomApex: Vector3 = [0, 0, -H];
    const upperRing: Vector3[] = [];
    const lowerRing: Vector3[] = [];

    for (let i = 0; i < 5; i++) {
      const a1 = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      upperRing.push([R * Math.cos(a1), R * Math.sin(a1), h]);
      const a2 = ((i + 0.5) * 2 * Math.PI) / 5 - Math.PI / 2;
      lowerRing.push([R * Math.cos(a2), R * Math.sin(a2), -h]);
    }

    const verts: Vector3[] = [topApex, ...upperRing, ...lowerRing, bottomApex];
    const faces: number[][] = [];
    // 5 Upper Kites
    for (let i = 0; i < 5; i++) {
      const u1 = 1 + i;
      const l1 = 6 + i;
      const u2 = 1 + ((i + 1) % 5);
      faces.push([0, u1, l1, u2]);
    }
    // 5 Lower Kites
    for (let i = 0; i < 5; i++) {
      const l1 = 6 + i;
      const u2 = 1 + ((i + 1) % 5);
      const l2 = 6 + ((i + 1) % 5);
      faces.push([11, l2, u2, l1]);
    }
    return { vertices: verts, faces };
  })(),

  // D12: Regular Dodecahedron (12 Regular Pentagons with Verified Convex Planar Winding)
  12: {
    vertices: [
      [-0.722, -0.722, -0.722], [-0.722, -0.722, 0.722], [-0.722, 0.722, -0.722], [-0.722, 0.722, 0.722],
      [0.722, -0.722, -0.722], [0.722, -0.722, 0.722], [0.722, 0.722, -0.722], [0.722, 0.722, 0.722],
      [0, -0.446, -1.168], [-0.446, -1.168, 0], [-1.168, 0, -0.446], [0, -0.446, 1.168],
      [-0.446, 1.168, 0], [-1.168, 0, 0.446], [0, 0.446, -1.168], [0.446, -1.168, 0],
      [1.168, 0, -0.446], [0, 0.446, 1.168], [0.446, 1.168, 0], [1.168, 0, 0.446]
    ],
    faces: [
      [0, 8, 4, 15, 9],
      [0, 9, 1, 13, 10],
      [0, 10, 2, 14, 8],
      [1, 9, 15, 5, 11],
      [1, 11, 17, 3, 13],
      [2, 10, 13, 3, 12],
      [2, 12, 18, 6, 14],
      [3, 17, 7, 18, 12],
      [4, 8, 14, 6, 16],
      [4, 16, 19, 5, 15],
      [5, 19, 7, 17, 11],
      [6, 18, 7, 19, 16]
    ]
  },

  // D20: Regular Icosahedron (20 Equilateral Triangles)
  20: (() => {
    const p = (1 + Math.sqrt(5)) / 2;
    const v: Vector3[] = [
      [-1,  p,  0], [ 1,  p,  0], [-1, -p,  0], [ 1, -p,  0],
      [ 0, -1,  p], [ 0,  1,  p], [ 0, -1, -p], [ 0,  1, -p],
      [ p,  0, -1], [ p,  0,  1], [-p,  0, -1], [-p,  0,  1]
    ];
    const scale = 1.3 / Math.sqrt(1 + p * p);
    const scaledVerts: Vector3[] = v.map(([x, y, z]) => [x * scale, y * scale, z * scale]);

    const faces: number[][] = [
      [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
      [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
      [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
    ];
    return { vertices: scaledVerts, faces };
  })()
};

// Material Palette Shaders
export interface MaterialStyle {
  baseColor: string;
  strokeColor: string;
  strokeWidth: number;
  textColor: string;
  glowFilter?: string;
  getFaceFill: (intensity: number, faceIndex: number) => string;
}

export const getMaterialStyle = (
  materialLevel: number, 
  isGhost: boolean = false,
  comboColor?: string
): MaterialStyle => {
  if (isGhost) {
    return {
      baseColor: '#38bdf8',
      strokeColor: comboColor || '#e0f2fe',
      strokeWidth: comboColor ? 2.4 : 1.8,
      textColor: '#ffffff',
      glowFilter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))',
      getFaceFill: (intensity) => `rgba(14, 165, 233, ${0.4 + intensity * 0.4})`
    };
  }

  let baseMat: MaterialStyle;

  switch (materialLevel) {
    case 1: // Plástico brillante (Rojo Rubí / Magenta)
      baseMat = {
        baseColor: '#e11d48',
        strokeColor: '#fecdd3',
        strokeWidth: 1.6,
        textColor: '#ffffff',
        glowFilter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
        getFaceFill: (intensity) => {
          const r = Math.round(200 + intensity * 55);
          const g = Math.round(20 + intensity * 60);
          const b = Math.round(60 + intensity * 80);
          return `rgb(${r}, ${g}, ${b})`;
        }
      };
      break;
    case 2: // Metálico / Cromo
      baseMat = {
        baseColor: '#94a3b8',
        strokeColor: '#f8fafc',
        strokeWidth: 1.8,
        textColor: '#ffffff', // Blanco puro de alto contraste para máxima visibilidad en metal
        glowFilter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.6))',
        getFaceFill: (intensity) => {
          const v = Math.round(90 + intensity * 135);
          return `rgb(${v}, ${Math.round(v * 1.02)}, ${Math.round(v * 1.05)})`;
        }
      };
      break;
    case 3: // Cristal Traslúcido
      baseMat = {
        baseColor: '#0284c7',
        strokeColor: '#bae6fd',
        strokeWidth: 2.0,
        textColor: '#ffffff', // Blanco puro de alto contraste
        glowFilter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.5))',
        getFaceFill: (intensity) => `rgba(56, 189, 248, ${0.45 + intensity * 0.45})`
      };
      break;
    case 4: // Neón Cyberpunk
      baseMat = {
        baseColor: '#052e16',
        strokeColor: '#4ade80',
        strokeWidth: 2.2,
        textColor: '#4ade80',
        glowFilter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))',
        getFaceFill: (intensity) => {
          const g = Math.round(20 + intensity * 45);
          return `rgb(5, ${g}, 15)`;
        }
      };
      break;
    case 5: // Cósmico / Galaxia
      baseMat = {
        baseColor: '#4c1d95',
        strokeColor: '#e879f9',
        strokeWidth: 2.0,
        textColor: '#fde047',
        glowFilter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))',
        getFaceFill: (intensity) => {
          const r = Math.round(45 + intensity * 70);
          const g = Math.round(10 + intensity * 30);
          const b = Math.round(90 + intensity * 110);
          return `rgb(${r}, ${g}, ${b})`;
        }
      };
      break;
    case 0: // Madera Gastada
    default:
      baseMat = {
        baseColor: '#78350f',
        strokeColor: '#fef3c7',
        strokeWidth: 1.5,
        textColor: '#fef3c7',
        glowFilter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))',
        getFaceFill: (intensity) => {
          const r = Math.round(100 + intensity * 80);
          const g = Math.round(50 + intensity * 50);
          const b = Math.round(15 + intensity * 20);
          return `rgb(${r}, ${g}, ${b})`;
        }
      };
      break;
  }

  // If custom combo color is provided, override strokeColor cleanly without blur
  if (comboColor) {
    baseMat.strokeColor = comboColor;
    baseMat.strokeWidth = 2.4;
  }

  return baseMat;
};

// Pre-normalized light vector pointing from top-left front
const LIGHT_VEC: Vector3 = (() => {
  const lx = 0.35;
  const ly = -0.55;
  const lz = 0.75;
  const len = Math.sqrt(lx * lx + ly * ly + lz * lz);
  return [lx / len, ly / len, lz / len];
})();

const CANVAS_PAD = 8;

interface ProjectedFace {
  avgZ: number;
  fill: string;
  ptsX: number[];
  ptsY: number[];
}

function getDieFontSize(size: number, sides: number): number {
  if (size >= 85) return sides >= 12 ? 28 : 36;
  if (size >= 70) return sides >= 12 ? 22 : 28;
  if (size >= 55) return sides >= 12 ? 18 : 23;
  return sides >= 12 ? 15 : 18;
}

/**
 * Pure Canvas 2D polyhedron renderer. Zero React allocations or SVG DOM mutations.
 */
function drawPolyhedronToCanvas(
  canvas: HTMLCanvasElement,
  sides: number,
  size: number,
  rotX: number,
  rotY: number,
  rotZ: number,
  matStyle: MaterialStyle,
  displayValue?: number,
  comboColor?: string
) {
  const dpr = window.devicePixelRatio || 1;
  const canvasCssSize = size + CANVAS_PAD * 2;
  const targetPixelSize = Math.round(canvasCssSize * dpr);

  if (canvas.width !== targetPixelSize || canvas.height !== targetPixelSize) {
    canvas.width = targetPixelSize;
    canvas.height = targetPixelSize;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvasCssSize, canvasCssSize);

  const mesh = POLYHEDRA_GEOMETRY[sides] || POLYHEDRA_GEOMETRY[6];
  const radX = (rotX * Math.PI) / 180;
  const radY = (rotY * Math.PI) / 180;
  const radZ = (rotZ * Math.PI) / 180;

  const sinX = Math.sin(radX), cosX = Math.cos(radX);
  const sinY = Math.sin(radY), cosY = Math.cos(radY);
  const sinZ = Math.sin(radZ), cosZ = Math.cos(radZ);

  const vCount = mesh.vertices.length;
  const tx = new Float64Array(vCount);
  const ty = new Float64Array(vCount);
  const tz = new Float64Array(vCount);

  for (let i = 0; i < vCount; i++) {
    const [vx, vy, vz] = mesh.vertices[i];
    const y1 = vy * cosX - vz * sinX;
    const z1 = vy * sinX + vz * cosX;
    const x2 = vx * cosY + z1 * sinY;
    const z2 = -vx * sinY + z1 * cosY;
    tx[i] = x2 * cosZ - y1 * sinZ;
    ty[i] = x2 * sinZ + y1 * cosZ;
    tz[i] = z2;
  }

  const cx = canvasCssSize / 2;
  const cy = canvasCssSize / 2;
  const scale = size * 0.36;

  const visibleFaces: ProjectedFace[] = [];
  let maxNz = -999;
  let frontmostIndex = -1;
  let frontmostCentroidX = cx;
  let frontmostCentroidY = cy;

  for (let fIdx = 0; fIdx < mesh.faces.length; fIdx++) {
    const faceVertIndices = mesh.faces[fIdx];
    const fLen = faceVertIndices.length;

    let nx = 0, ny = 0, nz = 0;
    for (let i = 0; i < fLen; i++) {
      const currIdx = faceVertIndices[i];
      const nextIdx = faceVertIndices[(i + 1) % fLen];
      nx += (ty[currIdx] - ty[nextIdx]) * (tz[currIdx] + tz[nextIdx]);
      ny += (tz[currIdx] - tz[nextIdx]) * (tx[currIdx] + tx[nextIdx]);
      nz += (tx[currIdx] - tx[nextIdx]) * (ty[currIdx] + ty[nextIdx]);
    }

    const normLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (normLen < 1e-6) continue;

    const unx = nx / normLen;
    const uny = ny / normLen;
    const unz = nz / normLen;

    if (unz >= -0.05) {
      const dot = unx * LIGHT_VEC[0] + uny * LIGHT_VEC[1] + unz * LIGHT_VEC[2];
      const intensity = Math.max(0.18, Math.min(1.0, 0.45 + dot * 0.55));
      const fill = matStyle.getFaceFill(intensity, fIdx);

      let sumX = 0, sumY = 0, sumZ = 0;
      const ptsX: number[] = new Array(fLen);
      const ptsY: number[] = new Array(fLen);

      for (let i = 0; i < fLen; i++) {
        const vIdx = faceVertIndices[i];
        const px = cx + tx[vIdx] * scale;
        const py = cy - ty[vIdx] * scale;
        ptsX[i] = px;
        ptsY[i] = py;
        sumX += px;
        sumY += py;
        sumZ += tz[vIdx];
      }

      const fCentroidX = sumX / fLen;
      const fCentroidY = sumY / fLen;
      const avgZ = sumZ / fLen;

      if (unz > maxNz) {
        maxNz = unz;
        frontmostIndex = fIdx;
        frontmostCentroidX = fCentroidX;
        frontmostCentroidY = fCentroidY;
      }

      visibleFaces.push({ avgZ, fill, ptsX, ptsY });
    }
  }

  visibleFaces.sort((a, b) => a.avgZ - b.avgZ);

  ctx.strokeStyle = matStyle.strokeColor;
  ctx.lineWidth = matStyle.strokeWidth;
  ctx.lineJoin = 'round';

  for (let i = 0; i < visibleFaces.length; i++) {
    const face = visibleFaces[i];
    ctx.beginPath();
    ctx.moveTo(face.ptsX[0], face.ptsY[0]);
    for (let j = 1; j < face.ptsX.length; j++) {
      ctx.lineTo(face.ptsX[j], face.ptsY[j]);
    }
    ctx.closePath();
    ctx.fillStyle = face.fill;
    ctx.fill();
    ctx.stroke();
  }

  if (displayValue !== undefined && frontmostIndex !== -1) {
    const fontSize = getDieFontSize(size, sides);
    const label = String(displayValue);
    ctx.font = `900 ${fontSize}px 'VT323', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeText(label, frontmostCentroidX, frontmostCentroidY);
    ctx.fillStyle = comboColor ? '#ffffff' : matStyle.textColor;
    ctx.fillText(label, frontmostCentroidX, frontmostCentroidY);
  }
}

interface PolyhedronDieProps {
  sides: number;
  size?: number;
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  materialLevel: number;
  displayValue?: number;
  isGhost?: boolean;
  comboColor?: string;
}

export const PolyhedronDie: React.FC<PolyhedronDieProps> = ({
  sides,
  size = 72,
  rotX = 0,
  rotY = 0,
  rotZ = 0,
  materialLevel,
  displayValue,
  isGhost = false,
  comboColor
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const matStyle = useMemo(
    () => getMaterialStyle(materialLevel, isGhost, comboColor),
    [materialLevel, isGhost, comboColor]
  );

  useEffect(() => {
    if (!canvasRef.current) return;
    drawPolyhedronToCanvas(
      canvasRef.current,
      sides,
      size,
      rotX,
      rotY,
      rotZ,
      matStyle,
      displayValue,
      comboColor
    );
  }, [sides, size, rotX, rotY, rotZ, matStyle, displayValue, comboColor]);

  const canvasCssSize = size + CANVAS_PAD * 2;

  return (
    <div
      className="relative flex items-center justify-center select-none shrink-0"
      style={{ width: size, height: size, filter: matStyle.glowFilter }}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none block shrink-0"
        style={{ width: canvasCssSize, height: canvasCssSize }}
      />
    </div>
  );
};

// Bottom-left & Shop 3D Infinite Spinning Die Preview (Unified rAF, zero React re-renders)
export const VectorSpinningDiePreview = React.memo(({
  sides,
  materialLevel
}: {
  sides: number;
  materialLevel: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const matStyle = useMemo(() => getMaterialStyle(materialLevel, false), [materialLevel]);
  const size = 38;
  const canvasCssSize = size + CANVAS_PAD * 2;

  useEffect(() => {
    let lastUpdate = 0;
    const start = performance.now();

    if (canvasRef.current) {
      drawPolyhedronToCanvas(canvasRef.current, sides, size, 24, 0, 0, matStyle);
    }

    return subscribeRaf((now) => {
      if (now - lastUpdate <= 32) return;
      lastUpdate = now;
      if (!canvasRef.current) return;
      const angle = ((now - start) / 1000) * 40;
      drawPolyhedronToCanvas(
        canvasRef.current,
        sides,
        size,
        24,
        angle,
        angle * 0.4,
        matStyle
      );
    });
  }, [sides, matStyle]);

  return (
    <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shrink-0">
      <div
        className="relative flex items-center justify-center select-none shrink-0"
        style={{ width: size, height: size, filter: matStyle.glowFilter }}
      >
        <canvas
          ref={canvasRef}
          className="pointer-events-none block shrink-0"
          style={{ width: canvasCssSize, height: canvasCssSize }}
        />
      </div>
    </div>
  );
});

// Interactive 3D Table Rolling Die with unified rAF tumble animation (zero React state updates per frame)
export const VectorTrue3DDie = React.memo(({
  finalFace,
  sides,
  materialLevel,
  rollId,
  manualCooldown,
  animationSpeedMult = 1,
  size = 72,
  isGhost = false,
  comboColor,
  enableTumbleAnimation = true
}: {
  finalFace: number;
  sides: number;
  materialLevel: number;
  rollId: number;
  manualCooldown: number;
  animationSpeedMult?: number;
  size?: number;
  isGhost?: boolean;
  comboColor?: string;
  enableTumbleAnimation?: boolean;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const defaultRot = useMemo(() => {
    switch (sides) {
      case 8: return { x: 35, y: 45, z: 0 };
      case 10: return { x: 30, y: 36, z: 0 };
      case 12: return { x: 22, y: 40, z: 0 };
      case 20: return { x: 25, y: 36, z: 0 };
      case 6:
      default: return { x: 22, y: 35, z: 10 };
    }
  }, [sides]);

  const rollingMatStyle = useMemo(
    () => getMaterialStyle(materialLevel, isGhost, undefined),
    [materialLevel, isGhost]
  );
  const settledMatStyle = useMemo(
    () => getMaterialStyle(materialLevel, isGhost, comboColor),
    [materialLevel, isGhost, comboColor]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (rollId === 0 || !enableTumbleAnimation) {
      drawPolyhedronToCanvas(
        canvas,
        sides,
        size,
        defaultRot.x,
        defaultRot.y,
        defaultRot.z,
        settledMatStyle,
        finalFace,
        comboColor
      );
      return;
    }

    const duration = Math.max(50, Math.min(500, (manualCooldown * 600) / animationSpeedMult));
    const startTime = performance.now();
    const startRotX = Math.random() * 540 + 270;
    const startRotY = Math.random() * 540 + 270;
    const startRotZ = Math.random() * 180;

    let unsubscribe: (() => void) | null = null;
    let finished = false;

    unsubscribe = subscribeRaf((now) => {
      if (finished || !canvasRef.current) return;
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);

      if (progress < 1) {
        const curX = startRotX * (1 - ease) + defaultRot.x * ease;
        const curY = startRotY * (1 - ease) + defaultRot.y * ease;
        const curZ = startRotZ * (1 - ease) + defaultRot.z * ease;
        const rollingFace = Math.floor(Math.random() * sides) + 1;

        drawPolyhedronToCanvas(
          canvasRef.current,
          sides,
          size,
          curX,
          curY,
          curZ,
          rollingMatStyle,
          rollingFace
        );
      } else {
        finished = true;
        drawPolyhedronToCanvas(
          canvasRef.current,
          sides,
          size,
          defaultRot.x,
          defaultRot.y,
          defaultRot.z,
          settledMatStyle,
          finalFace,
          comboColor
        );
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
      }
    });

    return () => {
      finished = true;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [
    rollId,
    finalFace,
    sides,
    size,
    manualCooldown,
    animationSpeedMult,
    enableTumbleAnimation,
    defaultRot,
    rollingMatStyle,
    settledMatStyle,
    comboColor
  ]);

  const canvasCssSize = size + CANVAS_PAD * 2;

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 ${isGhost ? 'animate-pulse' : ''}`}
      style={{ width: size, height: size, filter: settledMatStyle.glowFilter }}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none block shrink-0"
        style={{ width: canvasCssSize, height: canvasCssSize }}
      />
    </div>
  );
});
