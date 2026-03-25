// force-cancel.js
const PUBLIC_KEY = 'TU_PUBLIC_KEY'; // Pon tu llave pública de ePayco
const PRIVATE_KEY = 'TU_PRIVATE_KEY'; // Pon tu llave privada de ePayco
const SUBSCRIPTION_ID = '9c35a7f5e495c14c205ffd6'; // El ID que quieres borrar

async function runForceCancel() {
    console.log("🚀 Iniciando cancelación forzada...");

    try {
        // 1. Login en ePayco
        const authRes = await fetch('https://api.secure.payco.co/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_key: PUBLIC_KEY, private_key: PRIVATE_KEY })
        });
        const authData = await authRes.json();
        const token = authData.token || authData.data?.token;

        if (!token) throw new Error("No se pudo autenticar con ePayco");

        // 2. Cancelar Suscripción
        console.log(`📡 Enviando orden de cancelación para: ${SUBSCRIPTION_ID}`);
        const cancelRes = await fetch('https://api.secure.payco.co/recurring/v1/subscription/cancel', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ id: SUBSCRIPTION_ID })
        });

        const result = await cancelRes.json();
        console.log("Resultado de ePayco:", result);

        if (result.success) {
            console.log("✅ ÉXITO: Suscripción eliminada del sistema de cobros.");
        } else {
            console.log("⚠️ AVISO: ePayco no pudo cancelarla (quizás ya estaba inactiva).");
        }
    } catch (err) {
        console.error("❌ ERROR:", err.message);
    }
}

runForceCancel();