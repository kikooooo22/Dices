import React, { useMemo, useState, useEffect } from 'react';

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

// Vector math operations
const rotateX = ([x, y, z]: Vector3, rad: number): Vector3 => [
  x,
  y * Math.cos(rad) - z * Math.sin(rad),
  y * Math.sin(rad) + z * Math.cos(rad)
];

const rotateY = ([x, y, z]: Vector3, rad: number): Vector3 => [
  x * Math.cos(rad) + z * Math.sin(rad),
  y,
  -x * Math.sin(rad) + z * Math.cos(rad)
];

const rotateZ = ([x, y, z]: Vector3, rad: number): Vector3 => [
  x * Math.cos(rad) - y * Math.sin(rad),
  x * Math.sin(rad) + y * Math.cos(rad),
  z
];

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
  const mesh = POLYHEDRA_GEOMETRY[sides] || POLYHEDRA_GEOMETRY[6];
  const matStyle = useMemo(() => getMaterialStyle(materialLevel, isGhost, comboColor), [materialLevel, isGhost, comboColor]);

  // Light vector pointing from top-left front (normalized)
  const lightVec: Vector3 = useMemo(() => {
    const lx = 0.35;
    const ly = -0.55;
    const lz = 0.75;
    const len = Math.sqrt(lx * lx + ly * ly + lz * lz);
    return [lx / len, ly / len, lz / len];
  }, []);

  const { visibleFaces, bestFaceIndex, bestFaceCentroid } = useMemo(() => {
    const radX = (rotX * Math.PI) / 180;
    const radY = (rotY * Math.PI) / 180;
    const radZ = (rotZ * Math.PI) / 180;

    // Transform all vertices
    const transformed = mesh.vertices.map(v => {
      let cur = rotateX(v, radX);
      cur = rotateY(cur, radY);
      cur = rotateZ(cur, radZ);
      return cur;
    });

    const cx = size / 2;
    const cy = size / 2;
    const scale = size * 0.36;

    const facesData: {
      faceIndex: number;
      points: string;
      centroid: [number, number];
      avgZ: number;
      nz: number;
      fill: string;
    }[] = [];

    let maxNz = -999;
    let frontmostIndex = -1;
    let frontmostCentroid: [number, number] = [cx, cy];

    mesh.faces.forEach((faceVertIndices, fIdx) => {
      let nx = 0, ny = 0, nz = 0;
      for (let i = 0; i < faceVertIndices.length; i++) {
        const curr = transformed[faceVertIndices[i]];
        const next = transformed[faceVertIndices[(i + 1) % faceVertIndices.length]];
        nx += (curr[1] - next[1]) * (curr[2] + next[2]);
        ny += (curr[2] - next[2]) * (curr[0] + next[0]);
        nz += (curr[0] - next[0]) * (curr[1] + next[1]);
      }

      const normLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (normLen < 1e-6) return;

      const unx = nx / normLen;
      const uny = ny / normLen;
      const unz = nz / normLen;

      // Backface culling: unz >= -0.05 ensures complete silhouette without edge gaps or flickering
      if (unz >= -0.05) {
        // Compute lighting (diffuse dot product with light source)
        const dot = unx * lightVec[0] + uny * lightVec[1] + unz * lightVec[2];
        const intensity = Math.max(0.18, Math.min(1.0, 0.45 + dot * 0.55));
        const fill = matStyle.getFaceFill(intensity, fIdx);

        // Project 2D coordinates and calculate centroid and avg depth
        let sumX = 0;
        let sumY = 0;
        let sumZ = 0;
        const pts = faceVertIndices.map(vIdx => {
          const tv = transformed[vIdx];
          const px = cx + tv[0] * scale;
          const py = cy - tv[1] * scale; // Invert Y for screen coordinates
          sumX += px;
          sumY += py;
          sumZ += tv[2];
          return `${px.toFixed(1)},${py.toFixed(1)}`;
        }).join(' ');

        const count = faceVertIndices.length;
        const fCentroid: [number, number] = [sumX / count, sumY / count];
        const avgZ = sumZ / count;

        if (unz > maxNz) {
          maxNz = unz;
          frontmostIndex = fIdx;
          frontmostCentroid = fCentroid;
        }

        facesData.push({
          faceIndex: fIdx,
          points: pts,
          centroid: fCentroid,
          avgZ,
          nz: unz,
          fill
        });
      }
    });

    // Painter's algorithm depth sort: render furthest faces first
    facesData.sort((a, b) => a.avgZ - b.avgZ);

    return {
      visibleFaces: facesData,
      bestFaceIndex: frontmostIndex,
      bestFaceCentroid: frontmostCentroid
    };
  }, [mesh, rotX, rotY, rotZ, size, lightVec, matStyle]);

  return (
    <div 
      className="relative flex items-center justify-center select-none shrink-0"
      style={{ width: size, height: size, filter: matStyle.glowFilter }}
    >
      <svg width={size} height={size} className="overflow-visible block">
        {visibleFaces.map(f => (
          <polygon
            key={f.faceIndex}
            points={f.points}
            fill={f.fill}
            stroke={matStyle.strokeColor}
            strokeWidth={matStyle.strokeWidth}
            strokeLinejoin="round"
          />
        ))}
      </svg>

      {/* Render Rolled Number on the Most Camera-Facing Face */}
      {displayValue !== undefined && bestFaceIndex !== -1 && (
        <div
          className="absolute pointer-events-none font-pixel font-black text-center flex items-center justify-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
          style={{
            left: `${bestFaceCentroid[0]}px`,
            top: `${bestFaceCentroid[1]}px`,
            transform: 'translate(-50%, -50%)',
            color: comboColor ? '#ffffff' : matStyle.textColor,
            fontSize: size >= 85 ? (sides >= 12 ? '28px' : '36px') : size >= 70 ? (sides >= 12 ? '22px' : '28px') : size >= 55 ? (sides >= 12 ? '18px' : '23px') : (sides >= 12 ? '15px' : '18px'),
            textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 3px 6px rgba(0,0,0,0.95)'
          }}
        >
          {displayValue}
        </div>
      )}
    </div>
  );
};

// Bottom-left & Shop 3D Infinite Spinning Die Preview (Throttled & paused when hidden for high efficiency)
export const VectorSpinningDiePreview = React.memo(({
  sides,
  materialLevel
}: {
  sides: number;
  materialLevel: number;
}) => {
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    let animFrame: number;
    let lastUpdate = 0;
    let start = performance.now();

    const loop = (now: number) => {
      if (document.hidden) {
        animFrame = requestAnimationFrame(loop);
        return;
      }
      // Throttle to 30 FPS for silky preview with minimal CPU usage
      if (now - lastUpdate > 32) {
        lastUpdate = now;
        const elapsed = (now - start) / 1000;
        setAngle(elapsed * 40);
      }
      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, []);

  return (
    <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shrink-0">
      <PolyhedronDie
        sides={sides}
        size={38}
        rotX={24}
        rotY={angle}
        rotZ={angle * 0.4}
        materialLevel={materialLevel}
      />
    </div>
  );
});

// Interactive 3D Table Rolling Die with customizable tumble animation
export const VectorTrue3DDie = React.memo(({
  finalFace,
  sides,
  materialLevel,
  rollId,
  manualCooldown,
  animationSpeedMult = 1,
  size,
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
  // Resting 3D isometric angles for each dice polyhedron
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

  const [rot, setRot] = useState<{ x: number; y: number; z: number }>(defaultRot);
  const [isRolling, setIsRolling] = useState(false);

  useEffect(() => {
    if (rollId === 0) return;

    if (!enableTumbleAnimation) {
      // In static mode, keep die at resting angle with immediate face update
      setRot(defaultRot);
      setIsRolling(false);
      return;
    }

    setIsRolling(true);
    const duration = Math.max(50, Math.min(500, (manualCooldown * 600) / animationSpeedMult));
    const startTime = performance.now();

    // Random initial tumbling velocities
    const startRotX = Math.random() * 540 + 270;
    const startRotY = Math.random() * 540 + 270;
    const startRotZ = Math.random() * 180;

    let reqId: number;
    const animateTumble = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);

      const curX = startRotX * (1 - ease) + defaultRot.x * ease;
      const curY = startRotY * (1 - ease) + defaultRot.y * ease;
      const curZ = startRotZ * (1 - ease) + defaultRot.z * ease;

      setRot({ x: curX, y: curY, z: curZ });

      if (progress < 1) {
        reqId = requestAnimationFrame(animateTumble);
      } else {
        setIsRolling(false);
      }
    };

    reqId = requestAnimationFrame(animateTumble);
    return () => cancelAnimationFrame(reqId);
  }, [rollId, sides, manualCooldown, animationSpeedMult, enableTumbleAnimation, defaultRot]);

  const activeColor = isRolling ? undefined : comboColor;

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 ${isGhost ? 'animate-pulse' : ''}`}
    >
      <PolyhedronDie
        sides={sides}
        size={size || 72}
        rotX={rot.x}
        rotY={rot.y}
        rotZ={rot.z}
        materialLevel={materialLevel}
        displayValue={isRolling ? Math.floor(Math.random() * sides) + 1 : finalFace}
        isGhost={isGhost}
        comboColor={activeColor}
      />
    </div>
  );
});
