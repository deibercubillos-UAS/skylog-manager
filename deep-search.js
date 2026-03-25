// deep-search.js
const PUBLIC_KEY = 'c40acc8a877f180bf312c79aae0503f7'; 
const PRIVATE_KEY = 'b13e95ea247b7cbe1f41724a1cb86d91';

async function findTechnicalId() {
    try {
        const authRes = await fetch('https://api.secure.payco.co/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_key: PUBLIC_KEY, private_key: PRIVATE_KEY })
        });
        const { token } = await authRes.json();

        console.log("🔍 Buscando el ID oculto para asae@gmail.com...");
        const res = await fetch(`https://api.secure.payco.co/recurring/v1/subscriptions/${PUBLIC_KEY}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'type': 'sdk-jwt' }
        });
        const result = await res.json();

        const match = result.data.find(s => s.email === 'asae@gmail.com' || s._id === '9c35a7f5e495c14c205ffd6');

        if (match) {
            console.log("🎯 ¡ENCONTRADO!");
            console.log("ID Visual:", match.id);
            console.log("ID Técnico (_id):", match._id);
            console.log("Estado actual en ePayco:", match.status);
            console.log("\nUsa el valor de '_id' en tu script de cancelación.");
        } else {
            console.log("❌ No se encontró el registro. Es posible que ePayco ya lo haya purgado.");
        }
    } catch (e) { console.error(e); }
}
findTechnicalId();