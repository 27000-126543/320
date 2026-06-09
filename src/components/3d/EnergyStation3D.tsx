import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Edges } from '@react-three/drei';
import * as THREE from 'three';
import { EnergyStation, STATION_COLOR, STATION_TYPE_LABEL, STATUS_LABEL, AlertType } from '@/types';
import { useStationStore } from '@/store/useStationStore';
import { useAlertStore } from '@/store/useAlertStore';

interface EnergyStation3DProps {
  station: EnergyStation;
}

const STATUS_COLORS: Record<string, string> = {
  normal: '#00ff88',
  warning: '#ffcc00',
  critical: '#ff3355',
  offline: '#666666',
};

const SubstationModel = ({ color, highlightColor }: { color: string; highlightColor?: string }) => (
  <group>
    <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
      <boxGeometry args={[4, 3, 3]} />
      <meshStandardMaterial color="#334455" metalness={0.7} roughness={0.3} />
      <Edges color={highlightColor || color} threshold={15} scale={highlightColor ? 1.03 : 1.01} />
    </mesh>
    <mesh position={[-1.2, 4, 0]} castShadow>
      <cylinderGeometry args={[0.15, 0.15, 2.5, 8]} />
      <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.2} />
    </mesh>
    <mesh position={[1.2, 4, 0]} castShadow>
      <cylinderGeometry args={[0.15, 0.15, 2.5, 8]} />
      <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.2} />
    </mesh>
    <mesh position={[0, 5.2, 0]} castShadow>
      <cylinderGeometry args={[0.6, 0.6, 0.1, 8]} />
      <meshStandardMaterial color="#555555" metalness={0.9} roughness={0.1} />
    </mesh>
    <mesh position={[0, 0.1, 0]} receiveShadow>
      <boxGeometry args={[5, 0.2, 4]} />
      <meshStandardMaterial color="#2a3a4a" metalness={0.5} roughness={0.5} />
    </mesh>
  </group>
);

const HeatStationModel = ({ color, highlightColor }: { color: string; highlightColor?: string }) => (
  <group>
    <mesh position={[0, 2, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[2, 2.2, 4, 16]} />
      <meshStandardMaterial color="#4a3a2a" metalness={0.6} roughness={0.4} />
      <Edges color={highlightColor || color} threshold={15} scale={highlightColor ? 1.03 : 1.01} />
    </mesh>
    <mesh position={[1.2, 4, 0]} castShadow>
      <cylinderGeometry args={[0.35, 0.4, 3, 12]} />
      <meshStandardMaterial color="#555555" metalness={0.8} roughness={0.2} />
    </mesh>
    <mesh position={[-1, 4, 0.8]} castShadow>
      <cylinderGeometry args={[0.3, 0.35, 2.5, 12]} />
      <meshStandardMaterial color="#555555" metalness={0.8} roughness={0.2} />
    </mesh>
    <mesh position={[0, 0.1, 0]} receiveShadow>
      <cylinderGeometry args={[3, 3, 0.2, 16]} />
      <meshStandardMaterial color="#3a2a1a" metalness={0.4} roughness={0.6} />
    </mesh>
  </group>
);

const GasStationModel = ({ color, highlightColor }: { color: string; highlightColor?: string }) => (
  <group>
    <mesh position={[-1.5, 2, 0]} castShadow receiveShadow>
      <sphereGeometry args={[1.8, 16, 16]} />
      <meshStandardMaterial color="#2a4a3a" metalness={0.7} roughness={0.3} />
      <Edges color={highlightColor || color} threshold={15} scale={highlightColor ? 1.03 : 1.01} />
    </mesh>
    <mesh position={[1.8, 1.5, 0]} castShadow receiveShadow>
      <boxGeometry args={[2, 3, 2]} />
      <meshStandardMaterial color="#3a4a3a" metalness={0.6} roughness={0.4} />
      <Edges color={highlightColor || color} threshold={15} scale={highlightColor ? 1.03 : 1.01} />
    </mesh>
    <mesh position={[0, 3.5, 0]} castShadow>
      <cylinderGeometry args={[0.1, 0.1, 2, 6]} />
      <meshStandardMaterial color="#666666" metalness={0.8} roughness={0.2} />
    </mesh>
    <mesh position={[0, 0.1, 0]} receiveShadow>
      <boxGeometry args={[5, 0.2, 4]} />
      <meshStandardMaterial color="#2a3a2a" metalness={0.4} roughness={0.6} />
    </mesh>
  </group>
);

const StorageStationModel = ({ color, highlightColor }: { color: string; highlightColor?: string }) => (
  <group>
    <mesh position={[-1.8, 1.5, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.8, 3, 2.5]} />
      <meshStandardMaterial color="#4a2a5a" metalness={0.7} roughness={0.3} />
      <Edges color={highlightColor || color} threshold={15} scale={highlightColor ? 1.03 : 1.01} />
    </mesh>
    <mesh position={[1.8, 1.5, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.8, 3, 2.5]} />
      <meshStandardMaterial color="#4a2a5a" metalness={0.7} roughness={0.3} />
      <Edges color={highlightColor || color} threshold={15} scale={highlightColor ? 1.03 : 1.01} />
    </mesh>
    <mesh position={[0, 4, 0]} castShadow>
      <boxGeometry args={[5, 0.4, 2.8]} />
      <meshStandardMaterial color="#666666" metalness={0.9} roughness={0.1} />
    </mesh>
    <mesh position={[0, 0.1, 0]} receiveShadow>
      <boxGeometry args={[5.5, 0.2, 3.5]} />
      <meshStandardMaterial color="#3a2a4a" metalness={0.4} roughness={0.6} />
    </mesh>
  </group>
);

const BuildingModel = ({ color, index = 0, highlightColor }: { color: string; index?: number; highlightColor?: string }) => {
  const heights = [6, 8, 5, 10, 7, 9, 11, 6];
  const height = heights[index % heights.length];
  const floors = Math.floor(height / 1.5);
  return (
    <group>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, height, 3]} />
        <meshStandardMaterial color="#2a3a4a" metalness={0.5} roughness={0.5} />
        <Edges color={highlightColor || color} threshold={15} scale={highlightColor ? 1.03 : 1.01} />
      </mesh>
      {Array.from({ length: floors }).map((_, i) => (
        <mesh key={i} position={[0, 1 + i * 1.5, 1.51]}>
          <planeGeometry args={[2.4, 0.8]} />
          <meshStandardMaterial
            color="#ffffaa"
            emissive="#ffcc33"
            emissiveIntensity={0.3 + Math.random() * 0.4}
          />
        </mesh>
      ))}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[3.5, 0.2, 3.5]} />
        <meshStandardMaterial color="#1a2a3a" metalness={0.3} roughness={0.7} />
      </mesh>
    </group>
  );
};

const getStationModel = (type: EnergyStation['type'], color: string, index: number, highlightColor?: string) => {
  switch (type) {
    case 'substation':
      return <SubstationModel color={color} highlightColor={highlightColor} />;
    case 'heat_station':
      return <HeatStationModel color={color} highlightColor={highlightColor} />;
    case 'gas_station':
      return <GasStationModel color={color} highlightColor={highlightColor} />;
    case 'storage_station':
      return <StorageStationModel color={color} highlightColor={highlightColor} />;
    case 'building':
      return <BuildingModel color={color} index={index} highlightColor={highlightColor} />;
    default:
      return null;
  }
};

const HIGHLIGHT_INCIDENT_TYPES: AlertType[] = ['load_overrun', 'pressure_overrun'];

const EnergyStation3D = ({ station }: EnergyStation3DProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const selectedStationId = useStationStore((state) => state.selectedStationId);
  const setSelectedStationId = useStationStore((state) => state.setSelectedStationId);
  const backupGlowRef = useRef<THREE.Mesh>(null);
  const statusRingRef = useRef<THREE.Mesh>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);
  const highlightShellRef = useRef<THREE.Mesh>(null);

  const { highlightedIncidentId, focusIncidentId, incidentRecords } = useAlertStore();

  const isSelected = selectedStationId === station.id;
  const baseColor = STATION_COLOR[station.type];
  const statusColor = STATUS_COLORS[station.status];
  const buildingIndex = useMemo(
    () => parseInt(station.id.replace(/\D/g, ''), 10) || 0,
    [station.id],
  );

  const matchedIncident = useMemo(() => {
    const activeIncidentId = focusIncidentId || highlightedIncidentId;
    if (!activeIncidentId) return null;
    const incident = incidentRecords.find(r => r.id === activeIncidentId);
    if (!incident) return null;
    if (incident.stationId === station.id) return incident;
    if (incident.buildingIds && incident.buildingIds.includes(station.id)) return incident;
    return null;
  }, [highlightedIncidentId, focusIncidentId, incidentRecords, station.id]);

  const isIncidentHighlighted = !!matchedIncident;
  const isIncidentFocused = !!(focusIncidentId && matchedIncident && matchedIncident.id === focusIncidentId);

  const highlightColor = isIncidentFocused ? '#ff2266' : '#ff6600';
  const outerRingScale = station.type === 'building' ? 2.5 * 1.3 : 3.2 * 1.3;

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (backupGlowRef.current && station.isBackupActive) {
      const pulse = 0.5 + Math.sin(t * 4) * 0.5;
      backupGlowRef.current.scale.setScalar(1 + pulse * 0.15);
      const mat = backupGlowRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.8 + pulse * 0.6;
    }
    if (statusRingRef.current) {
      statusRingRef.current.rotation.y = t * 0.8;
      statusRingRef.current.position.y = 0.3 + Math.sin(t * 2) * 0.05;
    }
    if (outerRingRef.current && isIncidentHighlighted) {
      const pulseSpeed = isIncidentFocused ? 6 : 4;
      const pulse = 0.5 + Math.sin(t * pulseSpeed) * 0.5;
      const baseScale = isIncidentFocused ? 1.35 : 1.3;
      outerRingRef.current.scale.setScalar(baseScale + pulse * (isIncidentFocused ? 0.25 : 0.15));
      const mat = outerRingRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = (isIncidentFocused ? 3 : 2) + pulse * (isIncidentFocused ? 2 : 1.2);
      mat.opacity = 0.7 + pulse * 0.25;
    }
    if (highlightShellRef.current && isIncidentHighlighted) {
      const pulseSpeed = isIncidentFocused ? 5 : 3;
      const pulse = 0.5 + Math.sin(t * pulseSpeed) * 0.5;
      highlightShellRef.current.scale.setScalar(1.02 + pulse * 0.02);
      const mat = highlightShellRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.06 + pulse * (isIncidentFocused ? 0.08 : 0.05);
    }
    if (groupRef.current && (isSelected || isIncidentFocused)) {
      const bobSpeed = isIncidentFocused ? 2.5 : 1.5;
      const bobAmp = isIncidentFocused ? 0.25 : 0.15;
      groupRef.current.position.y = station.position.y + Math.sin(t * bobSpeed) * bobAmp;
    } else if (groupRef.current) {
      groupRef.current.position.y = station.position.y;
    }
  });

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setSelectedStationId(isSelected ? null : station.id);
  };

  return (
    <group
      ref={groupRef}
      position={[station.position.x, station.position.y, station.position.z]}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'default';
      }}
    >
      {getStationModel(station.type, baseColor, buildingIndex, isIncidentHighlighted ? highlightColor : undefined)}

      {isIncidentHighlighted && (
        <mesh
          ref={highlightShellRef}
          position={[0, station.type === 'building' ? 4 : 3, 0]}
        >
          <boxGeometry args={[
            station.type === 'building' ? 3.8 : 5.2,
            station.type === 'building' ? 10.8 : 6.8,
            station.type === 'building' ? 3.8 : 4.8,
          ]} />
          <meshBasicMaterial
            color={highlightColor}
            transparent
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>
      )}

      <mesh ref={statusRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3, 0]}>
        <torusGeometry args={[station.type === 'building' ? 2.5 : 3.2, 0.05, 8, 48]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={station.status === 'critical' ? 2 : station.status === 'warning' ? 1.2 : 0.8}
          transparent
          opacity={0.9}
        />
      </mesh>

      {isIncidentHighlighted && (
        <mesh
          ref={outerRingRef}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.4, 0]}
        >
          <torusGeometry args={[outerRingScale, 0.12, 12, 64]} />
          <meshStandardMaterial
            color={highlightColor}
            emissive={highlightColor}
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {(hovered || isSelected) && (
        <mesh position={[0, station.type === 'building' ? 4 : 3, 0]}>
          <boxGeometry args={[
            station.type === 'building' ? 3.4 : 4.6,
            station.type === 'building' ? 10.4 : 6.4,
            station.type === 'building' ? 3.4 : 4.4,
          ]} />
          <meshBasicMaterial
            color={isSelected ? '#ffffff' : baseColor}
            transparent
            opacity={0.08}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {station.isBackupActive && (
        <mesh ref={backupGlowRef} position={[0, 0.2, 0]}>
          <cylinderGeometry args={[
            station.type === 'building' ? 2.8 : 3.6,
            station.type === 'building' ? 2.8 : 3.6,
            0.1,
            32,
          ]} />
          <meshStandardMaterial
            color="#ffdd00"
            emissive="#ffaa00"
            emissiveIntensity={1.2}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}

      <pointLight
        position={[0, station.type === 'building' ? 5 : 4, 0]}
        color={isIncidentHighlighted ? highlightColor : statusColor}
        intensity={isIncidentFocused ? 4 : isIncidentHighlighted ? 2.5 : isSelected ? 2 : hovered ? 1.2 : 0.6}
        distance={isIncidentFocused ? 20 : isIncidentHighlighted ? 16 : 12}
      />

      {(hovered || isSelected || isIncidentHighlighted) && (
        <Html
          position={[0, station.type === 'building' ? 9 : 7, 0]}
          center
          distanceFactor={10}
          zIndexRange={[100, 0]}
        >
          <div
            style={{
              background: isIncidentHighlighted
                ? 'rgba(40, 15, 20, 0.95)'
                : 'rgba(10, 22, 40, 0.95)',
              border: `1px solid ${isIncidentHighlighted ? highlightColor : isSelected ? '#ffffff' : baseColor}`,
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#ffffff',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              boxShadow: isIncidentHighlighted
                ? `0 0 24px ${highlightColor}66`
                : `0 0 20px ${baseColor}44`,
              pointerEvents: 'none',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            <div style={{ fontWeight: 700, color: isIncidentHighlighted ? highlightColor : baseColor, marginBottom: 4, fontSize: 13 }}>
              {station.name}
              {isIncidentFocused && ' ⚡ 聚焦中'}
              {isIncidentHighlighted && !isIncidentFocused && ' ⚠'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: statusColor, boxShadow: `0 0 6px ${statusColor}`,
              }} />
              <span style={{ color: '#aabbcc' }}>{STATUS_LABEL[station.status]}</span>
            </div>
            <div style={{ color: '#8899aa', fontSize: 11 }}>
              类型: {STATION_TYPE_LABEL[station.type]}
            </div>
            <div style={{ color: '#8899aa', fontSize: 11 }}>
              负荷: {station.loadRate.toFixed(1)}% | 输出: {station.realtimeOutput.toFixed(1)}
            </div>
            {station.isBackupActive && (
              <div style={{ color: '#ffcc00', fontSize: 11, marginTop: 4, fontWeight: 600 }}>
                ⚡ 备用能源已激活
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};

export default EnergyStation3D;
