import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Alert, Vec3 } from '@/types';
import { useAlertStore } from '@/store/useAlertStore';

interface LeakMarkerProps {
  alert: Alert;
}

const vec3ToArray = (v: Vec3): THREE.Vector3 => new THREE.Vector3(v.x, v.y, v.z);

const LeakMarker = ({ alert }: LeakMarkerProps) => {
  if (!alert.location) return null;

  const pulseRef = useRef<THREE.Mesh>(null);
  const pulse2Ref = useRef<THREE.Mesh>(null);
  const pulse3Ref = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  const position = vec3ToArray(alert.location);

  const { highlightedIncidentId, focusIncidentId, incidentRecords } = useAlertStore();

  const matchedIncident = useMemo(() => {
    const matchById = (id: string | null) => {
      if (!id) return null;
      return incidentRecords.find(r => {
        if (r.alertId === alert.id) return true;
        if (r.location && alert.location) {
          const dx = r.location.x - alert.location.x;
          const dz = r.location.z - alert.location.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < 5) return true;
        }
        return false;
      });
    };
    return matchById(highlightedIncidentId) || matchById(focusIncidentId);
  }, [highlightedIncidentId, focusIncidentId, incidentRecords, alert.id, alert.location]);

  const isHighlighted = !!matchedIncident;
  const isFocused = !!(focusIncidentId && matchedIncident && matchedIncident.id === focusIncidentId);

  const scaleMultiplier = isFocused ? 1.5 : isHighlighted ? 1.25 : 1.0;
  const pulseSpeed = isFocused ? 2.0 : isHighlighted ? 1.6 : 1.2;
  const particleSpeed = isFocused ? 1.4 : isHighlighted ? 1.2 : 1.0;
  const highlightColor = isFocused ? '#ff0044' : '#ff4422';

  const particleCount = 60;
  const particleData = useMemo(() => {
    const data: { offset: number; radius: number; speed: number; angle: number }[] = [];
    for (let i = 0; i < particleCount; i++) {
      data.push({
        offset: Math.random(),
        radius: 0.1 + Math.random() * 0.4,
        speed: 0.5 + Math.random() * 1.0,
        angle: Math.random() * Math.PI * 2,
      });
    }
    return data;
  }, []);

  const positions = useMemo(() => new Float32Array(particleCount * 3), []);
  const opacities = useMemo(() => new Float32Array(particleCount), []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (pulseRef.current) {
      const scale = scaleMultiplier * (1 + (t * pulseSpeed % 2) * 1.5);
      pulseRef.current.scale.setScalar(scale);
      const mat = pulseRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.7 - ((t * pulseSpeed % 2) / 2) * 0.7);
      if (isHighlighted) {
        mat.color.set(highlightColor);
      }
    }
    if (pulse2Ref.current) {
      const scale = scaleMultiplier * (1 + ((t * pulseSpeed + 0.66) % 2) * 1.5);
      pulse2Ref.current.scale.setScalar(scale);
      const mat = pulse2Ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.7 - (((t * pulseSpeed + 0.66) % 2) / 2) * 0.7);
      if (isHighlighted) {
        mat.color.set(isFocused ? '#ff2266' : '#ff6644');
      }
    }
    if (pulse3Ref.current) {
      const scale = scaleMultiplier * (1 + ((t * pulseSpeed + 1.33) % 2) * 1.5);
      pulse3Ref.current.scale.setScalar(scale);
      const mat = pulse3Ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.7 - (((t * pulseSpeed + 1.33) % 2) / 2) * 0.7);
      if (isHighlighted) {
        mat.color.set(isFocused ? '#ff4488' : '#ff8866');
      }
    }

    if (coreRef.current) {
      const corePulse = isFocused ? 6 : isHighlighted ? 7 : 6;
      const pulse = 0.85 + Math.sin(t * corePulse) * (isFocused ? 0.25 : isHighlighted ? 0.2 : 0.15);
      coreRef.current.scale.setScalar(pulse * scaleMultiplier);
      const mat = coreRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = (isFocused ? 3 : isHighlighted ? 2.5 : 2) + Math.sin(t * (corePulse + 2)) * (isFocused ? 1.5 : isHighlighted ? 1.2 : 0.8);
      if (isHighlighted) {
        mat.color.set(highlightColor);
        mat.emissive.set(highlightColor);
      }
    }

    if (haloRef.current && isHighlighted) {
      const haloPulse = isFocused ? 5 : 3.5;
      const pulse = 0.5 + Math.sin(t * haloPulse) * 0.5;
      haloRef.current.scale.setScalar(scaleMultiplier * (1.5 + pulse * (isFocused ? 0.8 : 0.5)));
      const mat = haloRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (isFocused ? 0.35 : 0.25) + pulse * 0.15;
    }

    if (particlesRef.current) {
      const geom = particlesRef.current.geometry as THREE.BufferGeometry;
      const posAttr = geom.attributes.position as THREE.BufferAttribute;
      const mat = particlesRef.current.material as THREE.PointsMaterial;
      mat.size = isFocused ? 0.18 : isHighlighted ? 0.15 : 0.12;
      if (isHighlighted) {
        mat.color.set(highlightColor);
      }
      for (let i = 0; i < particleCount; i++) {
        const p = particleData[i];
        const life = ((p.offset + t * p.speed * 0.4 * particleSpeed) % 1);
        const height = life * (isFocused ? 9 : isHighlighted ? 7.5 : 6);
        const r = p.radius * scaleMultiplier + life * 1.2 * scaleMultiplier;
        const a = p.angle + life * 3;
        const x = position.x + Math.cos(a) * r;
        const z = position.z + Math.sin(a) * r;
        const y = position.y + 0.5 + height;
        posAttr.setXYZ(i, x, y, z);
        opacities[i] = Math.max(0, 1 - life * life);
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <group position={[position.x, position.y, position.z]}>
      {isHighlighted && (
        <mesh ref={haloRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[0.9, 1.6, 48]} />
          <meshBasicMaterial
            color={highlightColor}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      <mesh ref={pulseRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.6, 0.8, 32]} />
        <meshBasicMaterial color="#ff2244" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={pulse2Ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.6, 0.8, 32]} />
        <meshBasicMaterial color="#ff4466" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={pulse3Ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.6, 0.8, 32]} />
        <meshBasicMaterial color="#ff6677" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>

      <mesh ref={coreRef} position={[0, 0.8, 0]}>
        <sphereGeometry args={[0.45, 24, 24]} />
        <meshStandardMaterial
          color="#ff2244"
          emissive="#ff0022"
          emissiveIntensity={2}
          transparent
          opacity={0.9}
        />
      </mesh>

      <mesh position={[0, 0.8, 0]} scale={scaleMultiplier}>
        <sphereGeometry args={[0.7, 24, 24]} />
        <meshBasicMaterial
          color={isHighlighted ? highlightColor : '#ff4466'}
          transparent
          opacity={isFocused ? 0.4 : isHighlighted ? 0.35 : 0.25}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#ff5566"
          size={0.12}
          transparent
          opacity={0.8}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      <pointLight
        position={[0, 1, 0]}
        color={isHighlighted ? highlightColor : '#ff2244'}
        intensity={isFocused ? 6 : isHighlighted ? 4.5 : 3}
        distance={isFocused ? 20 : isHighlighted ? 16 : 12}
        decay={2}
      />

      <Html
        position={[0, isFocused ? 7 : isHighlighted ? 6.5 : 5.5, 0]}
        center
        distanceFactor={12}
        zIndexRange={[200, 0]}
      >
        <div
          style={{
            background: isHighlighted
              ? isFocused ? 'rgba(50, 5, 15, 0.97)' : 'rgba(40, 10, 15, 0.95)'
              : 'rgba(40, 10, 15, 0.95)',
            border: `1px solid ${isHighlighted ? highlightColor : '#ff4466'}`,
            borderRadius: '8px',
            padding: '10px 14px',
            color: '#ffffff',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            boxShadow: isHighlighted
              ? `0 0 ${isFocused ? 32 : 24}px ${highlightColor}88`
              : '0 0 20px rgba(255, 34, 68, 0.5)',
            pointerEvents: 'none',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: isHighlighted ? highlightColor : '#ff2244',
              boxShadow: `0 0 8px ${isHighlighted ? highlightColor : '#ff2244'}`,
              animation: 'leak-pulse 1s infinite',
            }} />
            <span style={{ fontWeight: 700, color: isHighlighted ? highlightColor : '#ff6677', fontSize: 13 }}>
              {isFocused ? '⚡ ' : isHighlighted ? '⚠ ' : '⚠ '}泄漏点
            </span>
          </div>
          <div style={{ color: '#ffaabb', fontSize: 11, marginBottom: 3 }}>
            {alert.area}
          </div>
          <div style={{ color: '#8899aa', fontSize: 10, marginTop: 4 }}>
            位置: ({alert.location.x.toFixed(1)}, {alert.location.z.toFixed(1)})
          </div>
          <div style={{ color: '#ffcc66', fontSize: 10, marginTop: 2 }}>
            等级: {alert.level === 3 ? '紧急' : alert.level === 2 ? '严重' : '一般'}
          </div>
        </div>
        <style>{`
          @keyframes leak-pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.3); }
          }
        `}</style>
      </Html>
    </group>
  );
};

export default LeakMarker;
