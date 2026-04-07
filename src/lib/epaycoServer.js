const BASE_URL = "https://api.secure.payco.co";

export async function epaycoRequest(endpoint, method, data, usePublicKey = false) {
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
        throw new Error(`Auth ePayco Falló (${authRes.status}): ${txt.slice(0,50)}`);
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

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        return await response.json();
    } else {
        const html = await response.text();
        console.error("Respuesta ePayco No-JSON:", html);
        return { success: false, error_html: true, status: response.status };
    }
}
