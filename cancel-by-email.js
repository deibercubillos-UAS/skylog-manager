// cancel-by-email.js
const PUBLIC_KEY = 'c40acc8a877f180bf312c79aae0503f7'; 
const PRIVATE_KEY = 'b13e95ea247b7cbe1f41724a1cb86d91';
const TARGET_EMAIL = 'asae@gmail.com'; // El correo que quieres cancelar

async function cancelSubscription() {
    console.log(`🚀 Iniciando proceso para cancelar suscripción de: ${TARGET_EMAIL}`);

    try {
        // PASO 1: LOGIN
        const authRes = await fetch('https://api.secure.payco.co/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_key: PUBLIC_KEY, private_key: PRIVATE_KEY })
        });
        const authData = await authRes.json();
        const token = authData.bearer_token || authData.token;

        if (!token) throw new Error("No se pudo autenticar.");

        // PASO 2: BUSCAR LA SUSCRIPCIÓN ACTIVA/INACTIVA
        const listRes = await fetch(`https://api.secure.payco.co/recurring/v1/subscriptions/${PUBLIC_KEY}`, {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'type': 'sdk-jwt'
            }
        });
        const listData = await listRes.json();
        
        // Buscamos el registro que coincida con el email
        const subscription = listData.data.find(s => s.email === TARGET_EMAIL || (s.customer && s.customer.email === TARGET_EMAIL));

        if (!subscription) {
            throw new Error("No se encontró ninguna suscripción para este correo en ePayco.");
        }

        const technicalId = subscription._id || subscription.id;
        console.log(`✅ Encontrada suscripción con ID técnico: ${technicalId}`);

        // PASO 3: ENVIAR CANCELACIÓN
        const cancelRes = await fetch('https://api.secure.payco.co/recurring/v1/subscription/cancel', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'type': 'sdk-jwt'
            },
            body: JSON.stringify({ id: technicalId })
        });

        const result = await cancelRes.json();
        console.log("📝 RESPUESTA DE EPAYCO:", result);

        if (result.status === true || result.success === true) {
            console.log("✨ ÉXITO: La suscripción ahora debería aparecer como CANCELADO.");
        } else {
            console.log("❌ DETALLE:", result.message);
        }

    } catch (err) {
        console.error("💥 ERROR:", err.message);
    }
}

cancelSubscription();