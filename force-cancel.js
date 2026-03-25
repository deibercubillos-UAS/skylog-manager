// force-cancel-final.js
const PUBLIC_KEY = 'c40acc8a877f180bf312c79aae0503f7'; 
const PRIVATE_KEY = 'b13e95ea247b7cbe1f41724a1cb86d91';
const TARGET_ID = '9c35a7f5e495c14c205ffd6'; // ID de tu captura

async function killSubscription() {
    console.log(`🧨 Iniciando terminación definitiva para ID: ${TARGET_ID}`);

    try {
        // 1. LOGIN
        const authRes = await fetch('https://api.secure.payco.co/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_key: PUBLIC_KEY, private_key: PRIVATE_KEY })
        });
        const authData = await authRes.json();
        const token = authData.bearer_token || authData.token;

        if (!token) throw new Error("Falla en autenticación.");

        // 2. ENVIAR CANCELACIÓN AL ENDPOINT OFICIAL
        // Según la nueva documentación, este proceso mueve de INACTIVO a CANCELADO
        const cancelRes = await fetch('https://api.secure.payco.co/recurring/v1/subscription/cancel', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'type': 'sdk-jwt'
            },
            body: JSON.stringify({ id: TARGET_ID })
        });

        const result = await cancelRes.json();
        console.log("📝 RESPUESTA DEL SERVIDOR:", JSON.stringify(result, null, 2));

        if (result.status === true || result.success === true || result.message === "Suscripción cancelada") {
            console.log("\n✅ OPERACIÓN EXITOSA: El registro debe pasar a 'CANCELADO' en tu panel.");
        } else {
            console.log("\n❌ ERROR:", result.message || "No se pudo procesar.");
        }

    } catch (err) {
        console.error("\n💥 ERROR:", err.message);
    }
}

killSubscription();