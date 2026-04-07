const BASE_URL = "https://api.secure.payco.co";

export async function epaycoRequest(endpoint, method, data) {
    const publicKey = process.env.EPAYCO_PUBLIC_KEY?.trim();
    const privateKey = process.env.EPAYCO_PRIVATE_KEY?.trim();

    // 1. Obtener Token
    const authRes = await fetch(`${BASE_URL}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_key: publicKey, private_key: privateKey })
    });

    const auth = await authRes.json();
    const bearerToken = auth.bearer_token || auth.token;

    // 2. Petición con Headers correctos
    const response = await fetch(`${BASE_URL}${endpoint}`, {
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
