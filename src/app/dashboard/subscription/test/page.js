'use client';
import { useState } from 'react';

export default function PaymentTestPage() {
    const [planData, setPlanData] = useState({ id: 'plan_escuadrilla_mensual', name: 'Escuadrilla Mensual', amount: 199000 });
    const [card, setCard] = useState({ number: '', name: '', exp: '', cvc: '', docNumber: '' });
    const [status, setStatus] = useState('Esperando acción...');

    // A. CREAR PLAN
    const handleCreatePlan = async () => {
        setStatus('Creando plan en ePayco...');
        const res = await fetch('/api/payments/create-plan', {
            method: 'POST',
            body: JSON.stringify({
                id_plan: planData.id,
                name: planData.name,
                description: planData.name,
                amount: planData.amount,
                currency: 'cop',
                interval: 'month',
                interval_count: 1,
                trial_days: 0
            })
        });
        const result = await res.json();
        console.log("💎 Log ePayco Plan:", result);
        alert(result.success || result.status ? "✅ Plan Creado/Existente" : "❌ Error: " + result.message);
        setStatus('Plan verificado.');
    };

    // B. PROCESAR SUSCRIPCIÓN COMPLETA (CON LOGS)
    const handleFullPayment = async () => {
        setStatus('Iniciando flujo de suscripción...');
        const [month, year] = card.exp.split('/');
        
        const payload = {
            planId: planData.id,
            cardInfo: {
                number: card.number.replace(/\s/g, ''),
                exp_year: "20" + year,
                exp_month: month,
                cvc: card.cvc,
                "hasCvv": true
            },
            customerInfo: { name: card.name, lastName: 'User', docType: 'CC', docNumber: card.docNumber }
        };

        console.log("📡 Enviando a Suscripción:", payload.planId, "Monto:", planData.amount);

        try {
            const res = await fetch('/api/payments/subscribe-sdk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            
            console.log("🔍 RESPUESTA SERVIDOR:", result);

            if (result.success) {
                console.log("🚀 TOKEN CREADO EXITOSAMENTE");
                console.log("👤 CLIENTE CREADO Y VINCULADO");
                console.log("📅 SUSCRIPCIÓN ACTIVA EN PLAN:", planData.name);
                alert("¡TODO CORRECTO! Revisa la consola del navegador (F12)");
                setStatus('Proceso completado con éxito.');
            } else {
                console.error("❌ FALLO EN EL PROCESO:", result.error);
                alert("Error: " + result.error);
                setStatus('Error en el proceso.');
            }
        } catch (e) {
            console.error("💥 ERROR CRÍTICO:", e);
            setStatus('Crash del servidor.');
        }
    };

    return (
        <div className="p-10 space-y-10 text-left max-w-4xl mx-auto">
            <h2 className="text-3xl font-black uppercase">Consola de Pruebas de Pago</h2>
            
            {/* BLOQUE 1: PLAN */}
            <div className="bg-slate-100 p-6 rounded-3xl border-2 border-dashed border-slate-300">
                <h3 className="font-bold mb-4">1. Configurar Producto (Plan)</h3>
                <div className="grid grid-cols-3 gap-4">
                    <input className="p-2 rounded border" value={planData.id} readOnly />
                    <input className="p-2 rounded border" value={planData.amount} readOnly />
                    <button onClick={handleCreatePlan} className="bg-black text-white p-2 rounded-xl font-bold">Crear Plan en ePayco</button>
                </div>
            </div>

            {/* BLOQUE 2: TARJETA */}
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-xl space-y-4">
                <h3 className="font-bold">2. Datos de Tarjeta de Pruebas</h3>
                <input className="w-full p-4 bg-slate-50 rounded-xl" placeholder="Nombre" onChange={e => setCard({...card, name: e.target.value})} />
                <input className="w-full p-4 bg-slate-50 rounded-xl" placeholder="Número Tarjeta" onChange={e => setCard({...card, number: e.target.value})} />
                <div className="grid grid-cols-3 gap-4">
                    <input className="p-4 bg-slate-50 rounded-xl" placeholder="MM/AA" onChange={e => setCard({...card, exp: e.target.value})} />
                    <input className="p-4 bg-slate-50 rounded-xl" placeholder="CVC" onChange={e => setCard({...card, cvc: e.target.value})} />
                    <input className="p-4 bg-slate-50 rounded-xl" placeholder="Cédula" onChange={e => setCard({...card, docNumber: e.target.value})} />
                </div>
                <button onClick={handleFullPayment} className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl">
                    EJECUTAR FLUJO COMPLETO (Ver Consola)
                </button>
                <p className="text-center text-xs font-mono text-slate-400 uppercase">{status}</p>
            </div>
        </div>
    );
}
