import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Grid } from '@react-three/drei';
import { Suspense, useEffect } from 'react';
import * as THREE from 'three';
import { useStationStore } from '@/store/useStationStore';
import { useAlertStore } from '@/store/useAlertStore';
import EnergyStation3D from './EnergyStation3D';
import Pipeline3D from './Pipeline3D';
import FlowArrows from './FlowArrows';
import LeakMarker from './LeakMarker';
import RepairPath from './RepairPath';

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

const SceneContent = () => {
  const stations = useStationStore((state) => state.stations);
  const pipelines = useStationStore((state) => state.pipelines);
  const alerts = useAlertStore((state) => state.alerts);
  const repairOrders = useAlertStore((state) => state.repairOrders);
  const startSimulation = useStationStore((state) => state.startSimulation);
  const startAlertDetection = useAlertStore((state) => state.startAlertDetection);
  const getStations = useStationStore.getState;
  const getPrev = () => useStationStore.getState().prevLoadRates;

  useEffect(() => {
    const stopSim = startSimulation();
    const stopAlert = startAlertDetection(getStations, getPrev);
    return () => {
      stopSim();
      stopAlert();
    };
  }, [startSimulation, startAlertDetection, getStations, getPrev]);

  const gasLeakAlerts = alerts.filter((a) => a.type === 'gas_leak' && !a.resolved);

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
      {repairOrders.map((order) => (
        <RepairPath key={order.id} order={order} />
      ))}
    </>
  );
};

const CityScene = () => {
  return (
    <div className="w-full h-full">
      <Canvas
        shadows
        camera={{ position: [0, 45, 60], fov: 50, near: 0.1, far: 500 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#0a1628']} />
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={15}
          maxDistance={120}
          target={[0, 0, 0]}
          makeDefault
        />
      </Canvas>
    </div>
  );
};

export default CityScene;
