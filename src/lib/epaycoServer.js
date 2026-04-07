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

    const authData = await authRes.json();
    const bearerToken = authData.bearer_token || authData.token;

    // 2. Ejecutar Petición al endpoint de tokenización
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: method,
        headers: {
            "Authorization": `Bearer ${bearerToken}`,
            "Content-Type": "application/json",
            "type": "sdk-jwt"
        },
        body: JSON.stringify(data)
    });

    // Devolvemos el JSON directo para ver qué dice ePayco
    return await response.json();
}
