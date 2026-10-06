'use client';

// Skylog V2.0 — expediente documental de una persona: cédula, curso de piloto, examen teórico y certificado
// médico (RAC 100 §100.535(8)). Sin `personId` es el propio; con `personId` lo ve un gestor.
import { useCallback, useEffect, useState } from 'react';
import DocumentSlot from './DocumentSlot';

const LABELS = [
  ['cedula', 'Cédula de ciudadanía'],
  ['curso_piloto', 'Curso de piloto'],
  ['examen_teorico', 'Examen teórico'],
  ['certificado_medico', 'Certificado médico'],
];

export default function PersonDocuments({ personId = null }) {
  const [have, setHave] = useState(new Set());
  const [error, setError] = useState(null);
  const q = personId ? `&personId=${personId}` : '';

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/personal/documents${personId ? `?personId=${personId}` : ''}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setHave(new Set((data.documents || []).map((d) => d.doc_type)));
    } catch (e) {
      setError(e.message);
    }
  }, [personId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-1">
      {LABELS.map(([type, label]) => (
        <DocumentSlot
          key={type}
          label={label}
          endpoint={`/api/personal/documents?type=${type}${q}`}
          uploadEndpoint="/api/personal/documents"
          extraFields={{ docType: type, personId }}
          has={have.has(type)}
          canUpload
          onChanged={load}
        />
      ))}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
