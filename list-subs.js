// list-subs.js
const PUBLIC_KEY = 'c40acc8a877f180bf312c79aae0503f7'; 
const PRIVATE_KEY = 'b13e95ea247b7cbe1f41724a1cb86d91';

async function listAllSubscriptions() {
    console.log("🔍 Buscando suscripciones reales en ePayco...");
    try {
        const authRes = await fetch('https://api.secure.payco.co/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_key: PUBLIC_KEY, private_key: PRIVATE_KEY })
        });
        const authData = await authRes.json();
        const token = authData.token || authData.bearer_token || authData.data?.token;

        const res = await fetch('https://api.secure.payco.co/recurring/v1/subscriptions/' + PUBLIC_KEY, {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'type': 'sdk-jwt'
            }
        });

        const result = await res.json();
        console.log("📋 LISTA DE SUSCRIPCIONES ENCONTRADAS:");
        console.dir(result.data, { depth: null });
    } catch (err) {
        console.error("❌ Error:", err.message);
    }
}
listAllSubscriptions();