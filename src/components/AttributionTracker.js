'use client';
import { useEffect } from 'react';
import { captureAttribution } from '@/lib/attribution';

// Captura la atribución de marketing (UTM + referrer) en cada carga.
// Se monta una sola vez en el layout raíz. Sin UI.
export default function AttributionTracker() {
  useEffect(() => { captureAttribution(); }, []);
  return null;
}
