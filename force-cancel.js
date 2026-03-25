// force-cancel.js
const PUBLIC_KEY = 'c40acc8a877f180bf312c79aae0503f7'; // Sacada de tu imagen de Postman
const PRIVATE_KEY = 'b13e95ea247b7cbe1f41724a1cb86d91'; // Sacada de tu imagen de Postman
const SUBSCRIPTION_ID = '9c35a7f5e495c14c205ffd6'; // El ID que quieres borrar

async function runForceCancel() {
    console.log("🚀 Iniciando protocolo de cancelación BitaFly...");

    try {
        // PASO 1: LOGIN (Basado en Pág. 9 del PDF)
        const authRes = await fetch('https://api.secure.payco.co/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                public_key: PUBLIC_KEY,
                private_key: PRIVATE_KEY
            })
        });

        const authData = await authRes.json();
        console.log("Respuesta Auth:", authData);

        const token = authData.token || authData.bearer_token || (authData.data ? authData.data.token : null);

        if (!token) {
            throw new Error("No se obtuvo el Bearer Token. Revisa si tus llaves están en modo TEST o PRODUCCIÓN.");
        }

        // PASO 2: CANCELACIÓN (Basado en Pág. 33 del PDF)
        console.log(`📡 Enviando baja para suscripción: ${SUBSCRIPTION_ID}`);
        
        const cancelRes = await fetch('https://api.secure.payco.co/recurring/v1/subscription/cancel', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'type': 'sdk-jwt' // <--- ESTA CABECERA ES OBLIGATORIA SEGÚN POSTMAN
            },
            body: JSON.stringify({ id: SUBSCRIPTION_ID })
        });

        const result = await cancelRes.json();
        console.log("Resultado Final ePayco:", result);

        if (result.success || result.status) {
            console.log("✅ ÉXITO: Suscripción cancelada correctamente.");
        } else {
            console.log("❌ FALLA: ePayco rechazó la cancelación. Posiblemente el ID no existe o ya está inactiva.");
        }

    } catch (err) {
        console.error("💥 ERROR CRÍTICO:", err.message);
    }
}

runForceCancel();