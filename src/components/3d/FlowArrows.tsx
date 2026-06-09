import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PipelineConnection, Vec3 } from '@/types';

interface FlowArrowsProps {
  pipeline: PipelineConnection;
}

const FLOW_COLORS: Record<PipelineConnection['type'], string> = {
  electric: '#00BFFF',
  heat: '#FF8C00',
  gas: '#00FF88',
};

const vec3ToArray = (v: Vec3): THREE.Vector3 => new THREE.Vector3(v.x, v.y, v.z);

interface ArrowParticle {
  offset: number;
  size: number;
}

const FlowArrows = ({ pipeline }: FlowArrowsProps) => {
  const pointsRef = useRef<THREE.Points>(null);
  const arrowsRef = useRef<THREE.InstancedMesh>(null);

  const baseColor = FLOW_COLORS[pipeline.type];
  const flowRatio = pipeline.flow / pipeline.maxFlow;

  const { curve, particles, instancedArrowCount } = useMemo(() => {
    const points = pipeline.points.map(vec3ToArray);
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    const curveLength = curve.getLength();
    const particleCount = Math.floor(curveLength * 8);
    const arrowCount = Math.max(4, Math.floor(curveLength / 3));
    const particles: ArrowParticle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        offset: Math.random(),
        size: 0.4 + Math.random() * 0.6,
      });
    }
    return { curve, particles, instancedArrowCount: arrowCount };
  }, [pipeline.points]);

  const positions = useMemo(() => {
    return new Float32Array(particles.length * 3);
  }, [particles.length]);

  const sizes = useMemo(() => {
    const arr = new Float32Array(particles.length);
    particles.forEach((p, i) => {
      arr[i] = p.size;
    });
    return arr;
  }, [particles]);

  const arrowGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.12);
    shape.lineTo(0.06, -0.06);
    shape.lineTo(0, -0.03);
    shape.lineTo(-0.06, -0.06);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const speed = 0.08 + flowRatio * 0.25;

    if (pointsRef.current) {
      const geom = pointsRef.current.geometry as THREE.BufferGeometry;
      const posAttr = geom.attributes.position as THREE.BufferAttribute;
      const dummy = new THREE.Vector3();
      for (let i = 0; i < particles.length; i++) {
        const progress = ((particles[i].offset + t * speed) % 1);
        curve.getPointAt(progress, dummy);
        posAttr.setXYZ(i, dummy.x, dummy.y + 0.18, dummy.z);
      }
      posAttr.needsUpdate = true;
    }

    if (arrowsRef.current) {
      const dummy = new THREE.Object3D();
      const pos = new THREE.Vector3();
      const tangent = new THREE.Vector3();
      for (let i = 0; i < instancedArrowCount; i++) {
        const progress = (((i / instancedArrowCount) + t * speed * 0.6) % 1);
        curve.getPointAt(progress, pos);
        curve.getTangentAt(progress, tangent);
        dummy.position.set(pos.x, pos.y + 0.22, pos.z);
        const angle = Math.atan2(tangent.x, tangent.z);
        dummy.rotation.set(0, angle, 0);
        const scale = 0.9 + flowRatio * 0.5;
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        arrowsRef.current.setMatrixAt(i, dummy.matrix);
      }
      arrowsRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particles.length}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={particles.length}
            array={sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          color={baseColor}
          size={0.09}
          transparent
          opacity={0.85}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
      <instancedMesh
        ref={arrowsRef}
        args={[arrowGeometry, undefined, instancedArrowCount]}
        frustumCulled={false}
      >
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
};

export default FlowArrows;
