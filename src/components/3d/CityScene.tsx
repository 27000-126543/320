import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Grid } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useStationStore } from '@/store/useStationStore';
import { useAlertStore } from '@/store/useAlertStore';
import EnergyStation3D from './EnergyStation3D';
import Pipeline3D from './Pipeline3D';
import FlowArrows from './FlowArrows';
import LeakMarker from './LeakMarker';
import RepairPath from './RepairPath';
import type { Vec3 } from '@/types';

const GroundGrid = () => {
  return (
    <Grid
      args={[120, 120]}
      cellSize={2}
      cellThickness={0.5}
      cellColor="#1a3a5c"
      sectionSize={10}
      sectionThickness={1}
      sectionColor="#2a5a8c"
      fadeDistance={100}
      fadeStrength={1}
      followCamera={false}
      infiniteGrid={false}
      position={[0, 0, 0]}
    />
  );
};

const SceneLights = () => {
  return (
    <>
      <ambientLight intensity={0.4} color="#aaccff" />
      <directionalLight
        position={[30, 50, 20]}
        intensity={1.2}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={150}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />
      <directionalLight position={[-20, 30, -30]} intensity={0.3} color="#6688cc" />
      <pointLight position={[0, 20, 0]} intensity={0.5} color="#4488ff" distance={80} />
    </>
  );
};

const vec3Add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });

const CameraController = () => {
  const { camera } = useThree();
  const { focusIncidentId, incidentRecords } = useAlertStore();
  const getStationById = useStationStore((s) => s.getStationById);

  const targetCameraPos = useRef(new THREE.Vector3(30, 25, 30));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const transitionStart = useRef<number | null>(null);
  const startCameraPos = useRef(new THREE.Vector3());
  const startLookAt = useRef(new THREE.Vector3());
  const TRANSITION_DELAY = 300;
  const TRANSITION_DURATION = 1500;

  useEffect(() => {
    let targetPos: Vec3 | null = null;
    let lookAtPos: Vec3 = { x: 0, y: 0, z: 0 };

    if (focusIncidentId) {
      const incident = incidentRecords.find((r) => r.id === focusIncidentId);
      if (incident) {
        if (incident.location) {
          targetPos = incident.location;
          lookAtPos = incident.location;
        } else if (incident.stationId) {
          const station = getStationById(incident.stationId);
          if (station) {
            targetPos = station.position;
            lookAtPos = station.position;
          }
        }
      }
    }

    if (targetPos) {
      const desiredPos = new THREE.Vector3(
        targetPos.x,
        targetPos.y + 8,
        targetPos.z + 8,
      );
      targetCameraPos.current.copy(desiredPos);
      targetLookAt.current.set(lookAtPos.x, lookAtPos.y, lookAtPos.z);
    } else {
      targetCameraPos.current.set(30, 25, 30);
      targetLookAt.current.set(0, 0, 0);
    }

    startCameraPos.current.copy(camera.position);
    const controls = (window as any).__orbitControls;
    if (controls?.target) {
      startLookAt.current.copy(controls.target);
    } else {
      startLookAt.current.set(0, 0, 0);
    }
    transitionStart.current = performance.now() + TRANSITION_DELAY;
  }, [focusIncidentId, incidentRecords, getStationById, camera]);

  useFrame(() => {
    const now = performance.now();
    if (transitionStart.current === null) return;

    if (now < transitionStart.current) return;

    const elapsed = now - transitionStart.current;
    const t = Math.min(1, elapsed / TRANSITION_DURATION);

    const easeT = t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;

    camera.position.lerpVectors(startCameraPos.current, targetCameraPos.current, easeT);

    const controls = (window as any).__orbitControls;
    if (controls?.target) {
      controls.target.lerpVectors(startLookAt.current, targetLookAt.current, easeT);
      controls.update();
    }
  });

  return null;
};

const OrbitController = () => {
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (controlsRef.current) {
      (window as any).__orbitControls = controlsRef.current;
    }
    return () => {
      delete (window as any).__orbitControls;
    };
  }, []);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      maxPolarAngle={Math.PI / 2.2}
      minDistance={15}
      maxDistance={120}
      target={[0, 0, 0]}
      makeDefault
    />
  );
};

const SceneContent = () => {
  const stations = useStationStore((state) => state.stations);
  const pipelines = useStationStore((state) => state.pipelines);
  const alerts = useAlertStore((state) => state.alerts);
  const repairOrders = useAlertStore((state) => state.repairOrders);
  const { incidentRecords, focusIncidentId, highlightedIncidentId } = useAlertStore();

  const gasLeakAlerts = alerts.filter((a) => a.type === 'gas_leak' && !a.resolved);

  const replayIncident = useMemo(() => {
    const id = focusIncidentId || highlightedIncidentId;
    if (!id) return null;
    const rec = incidentRecords.find(r => r.id === id);
    if (rec && rec.type === 'gas_leak' && rec.location) return rec;
    return null;
  }, [incidentRecords, focusIncidentId, highlightedIncidentId]);

  const replayAlert = useMemo(() => {
    if (!replayIncident) return null;
    return {
      id: `replay-${replayIncident.id}`,
      type: 'gas_leak' as const,
      area: replayIncident.area,
      level: replayIncident.level,
      triggeredAt: replayIncident.startTime,
      message: replayIncident.title,
      resolved: false,
      location: replayIncident.location,
      stationId: replayIncident.stationId,
      buildingIds: replayIncident.buildingIds,
    };
  }, [replayIncident]);

  return (
    <>
      <SceneLights />
      <GroundGrid />
      <Stars radius={150} depth={80} count={3000} factor={5} saturation={0} fade speed={0.5} />
      <fog attach="fog" args={['#0a1628', 40, 120]} />
      {pipelines.map((pipeline) => (
        <Pipeline3D key={pipeline.id} pipeline={pipeline} />
      ))}
      {pipelines.map((pipeline) => (
        <FlowArrows key={`flow-${pipeline.id}`} pipeline={pipeline} />
      ))}
      {stations.map((station) => (
        <EnergyStation3D key={station.id} station={station} />
      ))}
      {gasLeakAlerts.map((alert) =>
        alert.location ? <LeakMarker key={alert.id} alert={alert} /> : null,
      )}
      {replayAlert && replayAlert.location && (
        <LeakMarker key={replayAlert.id} alert={replayAlert} />
      )}
      {repairOrders.map((order) => (
        <RepairPath key={order.id} order={order} />
      ))}
      <CameraController />
    </>
  );
};

const CityScene = () => {
  return (
    <div className="w-full h-full">
      <Canvas
        shadows
        camera={{ position: [30, 25, 30], fov: 50, near: 0.1, far: 500 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#0a1628']} />
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
        <OrbitController />
      </Canvas>
    </div>
  );
};

export default CityScene;
