import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { RepairOrder, Vec3, RepairStatus } from '@/types';

interface RepairPathProps {
  order: RepairOrder;
}

const STATUS_COLORS: Record<RepairStatus, string> = {
  dispatched: '#ffaa00',
  enroute: '#00aaff',
  arrived: '#ff6600',
  repairing: '#ff4488',
  completed: '#00ff88',
};

const STATUS_LABELS: Record<RepairStatus, string> = {
  dispatched: '已派单',
  enroute: '赶往现场',
  arrived: '已到达',
  repairing: '抢修中',
  completed: '已完成',
};

const vec3ToArray = (v: Vec3): THREE.Vector3 => new THREE.Vector3(v.x, v.y, v.z);

const RepairVehicle = () => {
  return (
    <group>
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.9, 0.5, 0.55]} />
        <meshStandardMaterial color="#1a88ff" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-0.15, 0.7, 0]} castShadow>
        <boxGeometry args={[0.5, 0.4, 0.5]} />
        <meshStandardMaterial color="#1a88ff" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-0.15, 0.75, 0.26]}>
        <boxGeometry args={[0.45, 0.3, 0.01]} />
        <meshStandardMaterial color="#aaddff" transparent opacity={0.6} />
      </mesh>
      <mesh position={[-0.4, 0.3, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.1, 12]} />
        <meshStandardMaterial color="#111111" metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh position={[0.3, 0.3, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.1, 12]} />
        <meshStandardMaterial color="#111111" metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh position={[-0.4, 0.3, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.1, 12]} />
        <meshStandardMaterial color="#111111" metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh position={[0.3, 0.3, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.1, 12]} />
        <meshStandardMaterial color="#111111" metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh position={[0.2, 0.62, 0]}>
        <boxGeometry args={[0.15, 0.12, 0.6]} />
        <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[0.2, 0.62, 0]}>
        <boxGeometry args={[0.16, 0.14, 0.62]} />
        <meshStandardMaterial color="#ff8800" transparent opacity={0.3} />
      </mesh>
    </group>
  );
};

const RepairPath = ({ order }: RepairPathProps) => {
  const vehicleRef = useRef<THREE.Group>(null);
  const pathGlowRef = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);

  const [progress, setProgress] = useState(0);

  const statusColor = STATUS_COLORS[order.status];

  const { curve, pathGeometry, glowGeometry } = useMemo(() => {
    const points = order.path.map(vec3ToArray);
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    const tubularSegments = Math.max(100, points.length * 35);
    const tube = new THREE.TubeGeometry(curve, tubularSegments, 0.06, 6, false);
    const glow = new THREE.TubeGeometry(curve, tubularSegments, 0.2, 6, false);
    return { curve, pathGeometry: tube, glowGeometry: glow };
  }, [order.path]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    let targetProgress = 0;
    switch (order.status) {
      case 'dispatched':
        targetProgress = 0.02;
        break;
      case 'enroute':
        // 平滑向前推进：0 → 0.95，用时间+状态索引映射
        {
          const statusIdx = 1;
          const phaseBase = statusIdx / 4;
          const phaseAdvance = (Math.sin(t * 0.05) * 0.5 + 0.5) * 0.25;
          targetProgress = Math.min(0.95, phaseBase + phaseAdvance + 0.05);
        }
        break;
      case 'arrived':
        targetProgress = 0.98;
        break;
      case 'repairing':
        targetProgress = 0.99;
        break;
      case 'completed':
        targetProgress = 1;
        break;
    }

    setProgress((prev) => {
      const diff = targetProgress - prev;
      // enroute 阶段需要更快的响应速度，其他阶段平滑即可
      const step = order.status === 'enroute' ? 0.03 : 0.05;
      return prev + diff * step;
    });

    if (vehicleRef.current) {
      const clampedProgress = Math.min(1, Math.max(0, progress));
      const pos = curve.getPointAt(clampedProgress);
      vehicleRef.current.position.copy(pos);
      vehicleRef.current.position.y += 0.2;

      if (clampedProgress < 0.999) {
        const tangent = curve.getTangentAt(clampedProgress + 0.001);
        const angle = Math.atan2(tangent.x, tangent.z);
        vehicleRef.current.rotation.y = angle;
      }

      vehicleRef.current.position.y += Math.sin(t * 15) * 0.01;
    }

    if (pathGlowRef.current) {
      const mat = pathGlowRef.current.material as THREE.MeshBasicMaterial;
      const pulse = 0.25 + Math.sin(t * 3) * 0.2;
      mat.opacity = pulse;
    }

    if (beamRef.current) {
      const mat = beamRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.3 + Math.sin(t * 5) * 0.2;
      beamRef.current.rotation.y = t * 2;
    }
  });

  const startPoint = vec3ToArray(order.path[0]);
  const endPoint = vec3ToArray(order.leakLocation);

  return (
    <group>
      <mesh geometry={pathGeometry}>
        <meshBasicMaterial
          color={statusColor}
          transparent
          opacity={0.9}
        />
      </mesh>
      <mesh ref={pathGlowRef} geometry={glowGeometry}>
        <meshBasicMaterial
          color={statusColor}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <group position={[startPoint.x, 0.2, startPoint.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.6, 24]} />
          <meshBasicMaterial color="#00ff88" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.38, 24]} />
          <meshBasicMaterial color="#00ff88" transparent opacity={0.4} />
        </mesh>
        <Html position={[0, 1.2, 0]} center distanceFactor={10} zIndexRange={[50, 0]}>
          <div style={{
            background: 'rgba(0, 40, 20, 0.9)',
            border: '1px solid #00ff88',
            borderRadius: '6px',
            padding: '4px 8px',
            color: '#00ff88',
            fontSize: '10px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            fontFamily: 'system-ui, sans-serif',
          }}>
            🚩 {order.teamName}驻点
          </div>
        </Html>
      </group>

      <group position={[endPoint.x, 0.3, endPoint.z]}>
        <mesh ref={beamRef} rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.8, 12, 16, 1, true]} />
          <meshBasicMaterial
            color="#ff4488"
            transparent
            opacity={0.25}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      <group ref={vehicleRef}>
        <RepairVehicle />
        <pointLight position={[0, 1, 0]} color={statusColor} intensity={1.5} distance={6} />
        <Html
          position={[0, 1.8, 0]}
          center
          distanceFactor={10}
          zIndexRange={[150, 0]}
        >
          <div
            style={{
              background: 'rgba(10, 22, 50, 0.95)',
              border: `1px solid ${statusColor}`,
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#ffffff',
              fontSize: '11px',
              whiteSpace: 'nowrap',
              boxShadow: `0 0 15px ${statusColor}55`,
              pointerEvents: 'none',
              fontFamily: 'system-ui, sans-serif',
              transform: order.status === 'arrived' || order.status === 'repairing' ? 'translateY(-15px)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: statusColor, boxShadow: `0 0 6px ${statusColor}`,
              }} />
              <span style={{ fontWeight: 700, color: statusColor, fontSize: 12 }}>
                🚒 {order.teamName}
              </span>
            </div>
            <div style={{ color: '#aabbcc', fontSize: 10, marginBottom: 2 }}>
              状态: {STATUS_LABELS[order.status]}
            </div>
            {order.status === 'enroute' && (
              <div style={{
                color: '#ffcc66', fontSize: 11, fontWeight: 600,
                padding: '2px 6px', background: 'rgba(255,204,102,0.15)',
                borderRadius: 4, marginTop: 4,
              }}>
                ⏱ ETA: {order.eta}
              </div>
            )}
            {(order.status === 'arrived' || order.status === 'repairing') && (
              <div style={{
                color: '#ff88aa', fontSize: 11, fontWeight: 600,
                padding: '2px 6px', background: 'rgba(255,136,170,0.15)',
                borderRadius: 4, marginTop: 4,
              }}>
                🔧 处置中...
              </div>
            )}
            {order.status === 'completed' && (
              <div style={{
                color: '#00ff88', fontSize: 11, fontWeight: 600,
                padding: '2px 6px', background: 'rgba(0,255,136,0.15)',
                borderRadius: 4, marginTop: 4,
              }}>
                ✓ 已完成
              </div>
            )}
          </div>
        </Html>
      </group>
    </group>
  );
};

export default RepairPath;
