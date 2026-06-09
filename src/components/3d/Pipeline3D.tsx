import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PipelineConnection, Vec3 } from '@/types';

interface Pipeline3DProps {
  pipeline: PipelineConnection;
}

const PIPELINE_COLORS: Record<PipelineConnection['type'], string> = {
  electric: '#1E90FF',
  heat: '#FF6B35',
  gas: '#00C48C',
};

const vec3ToArray = (v: Vec3): THREE.Vector3 => new THREE.Vector3(v.x, v.y, v.z);

const Pipeline3D = ({ pipeline }: Pipeline3DProps) => {
  const tubeRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const baseColor = PIPELINE_COLORS[pipeline.type];
  const flowRatio = pipeline.flow / pipeline.maxFlow;

  const { tubeGeometry, glowGeometry } = useMemo(() => {
    const points = pipeline.points.map(vec3ToArray);
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    const tubularSegments = Math.max(80, points.length * 25);
    const tube = new THREE.TubeGeometry(curve, tubularSegments, 0.08, 8, false);
    const glow = new THREE.TubeGeometry(curve, tubularSegments, 0.14, 8, false);
    return { tubeGeometry: tube, glowGeometry: glow };
  }, [pipeline.points]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      const pulse = 0.3 + Math.sin(t * (2 + flowRatio * 4)) * 0.25 + flowRatio * 0.3;
      mat.opacity = Math.min(0.7, pulse);
    }
  });

  return (
    <group>
      <mesh ref={tubeRef} geometry={tubeGeometry}>
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={0.3 + flowRatio * 0.5}
          metalness={0.8}
          roughness={0.2}
          transparent
          opacity={0.95}
        />
      </mesh>
      <mesh ref={glowRef} geometry={glowGeometry}>
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};

export default Pipeline3D;
