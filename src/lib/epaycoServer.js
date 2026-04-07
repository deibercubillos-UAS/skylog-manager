const BASE_URL = "https://api.secure.payco.co";

export async function epaycoRequest(endpoint, method, data) {
    const publicKey = process.env.EPAYCO_PUBLIC_KEY?.trim();
    const privateKey = process.env.EPAYCO_PRIVATE_KEY?.trim();

    // 1. Obtener Token Bearer
    const authRes = await fetch(`${BASE_URL}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_key: publicKey, private_key: privateKey })
    });

    if (!authRes.ok) {
        const txt = await authRes.text();
        return { error: true, step: "LOGIN", status: authRes.status, msg: txt };
    }
    const auth = await authRes.json();
    const token = auth.bearer_token || auth.token;

    // 2. Ejecutar Petición
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: method,
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "type": "sdk-jwt"
        },
        body: JSON.stringify(data)
    });

    // --- BLINDAJE CONTRA HTML ---
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        const json = await response.json();
        return { error: false, data: json };
    } else {
        const html = await response.text();
        // Devolvemos el error de forma segura para que no rompa el JSON.parse del cliente
        return { 
            error: true, 
            step: "ENDPOINT", 
            status: response.status, 
            msg: "ePayco devolvió HTML en lugar de JSON. Esto es un error 404 o 500 de su servidor."
        };
    }
}
