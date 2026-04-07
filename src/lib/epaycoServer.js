const EPAYCO_API_URL = "https://api.secure.payco.co";

export async function epaycoRequest(endpoint, method, data, isToken = false) {
    const publicKey = process.env.EPAYCO_PUBLIC_KEY;
    const privateKey = process.env.EPAYCO_PRIVATE_KEY;

    // 1. Obtener Token de Autenticación (Bearer)
    const authRes = await fetch(`${EPAYCO_API_URL}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_key: publicKey, private_key: privateKey })
    });
    const authData = await authRes.json();
    const bearerToken = authData.bearer_token || authData.token;

    // 2. Ejecutar la petición real
    const url = isToken ? "https://api.secure.payco.co/v1/tokenize-card" : `${EPAYCO_API_URL}${endpoint}`;
    
    const response = await fetch(url, {
        method: method,
        headers: {
            "Authorization": `Bearer ${bearerToken}`,
            "Content-Type": "application/json",
            "type": "sdk-jwt"
        },
        body: JSON.stringify(data)
    });

    return await response.json();
}
