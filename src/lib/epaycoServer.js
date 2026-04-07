const BASE_URL = "https://api.secure.payco.co";

export async function epaycoRequest(endpoint, method, data) {
    const publicKey = process.env.EPAYCO_PUBLIC_KEY?.trim();
    const privateKey = process.env.EPAYCO_PRIVATE_KEY?.trim();

    // A. LOGIN - Para obtener el Bearer Token (JWT)
    const authRes = await fetch(`${BASE_URL}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_key: publicKey, private_key: privateKey })
    });

    if (!authRes.ok) {
        throw new Error("Fallo de autenticación con llaves API REST.");
    }

    const auth = await authRes.json();
    const token = auth.bearer_token || auth.token;

    // B. PETICIÓN AL ENDPOINT
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: method,
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "type": "sdk-jwt"
        },
        body: JSON.stringify(data)
    });

    // Capturamos la respuesta cruda para diagnosticar
    const result = await response.json();
    return { 
        status: response.status, 
        ok: response.ok,
        data: result 
    };
}
