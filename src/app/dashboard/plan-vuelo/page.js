'use client';
// Planear Vuelo — usa el componente reutilizable FlightPlanner (mapa + KMZ + PDF).
// El mismo componente se reutiliza dentro de Programación (autorizaciones).
import FlightPlanner from '@/components/FlightPlanner';

export default function PlanVueloPage() {
  return <FlightPlanner />;
}
