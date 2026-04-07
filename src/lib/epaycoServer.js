const BASE_URL = "https://api.secure.payco.co";

export async function epaycoRequest(endpoint, method, data) {
    const publicKey = process.env.EPAYCO_PUBLIC_KEY?.trim();
    const privateKey = process.env.EPAYCO_PRIVATE_KEY?.trim();

    // 1. Login para obtener JWT
    const authRes = await fetch(`${BASE_URL}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_key: publicKey, private_key: privateKey })
    });

    if (!authRes.ok) {
        throw new Error(`Error de Autenticación ePayco: ${authRes.status}`);
    }

    const auth = await authRes.json();
    const token = auth.bearer_token || auth.token;

    // 2. Petición al endpoint específico
    // NOTA: Los endpoints de tokenización NO llevan el prefijo del método en la URL a veces
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: method,
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "type": "sdk-jwt"
        },
        body: JSON.stringify(data)
    });

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        return await response.json();
    } else {
        const text = await response.text();
        throw new Error(`ePayco devolvió un error no esperado (HTML). URL: ${endpoint}`);
    }
}
