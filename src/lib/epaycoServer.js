const EPAYCO_API_URL = "https://api.secure.payco.co";

export async function epaycoRequest(endpoint, method, data) {
    const publicKey = process.env.EPAYCO_PUBLIC_KEY;
    const privateKey = process.env.EPAYCO_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
        throw new Error("Llaves API REST (Public/Private) no encontradas en el servidor.");
    }

    // A. LOGIN - Obtener Token
    const authRes = await fetch(`${EPAYCO_API_URL}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_key: publicKey, private_key: privateKey })
    });

    if (!authRes.ok) {
        const errText = await authRes.text();
        throw new Error(`ePayco Auth Failed: ${authRes.status} - ${errText.slice(0, 100)}`);
    }

    const authData = await authRes.json();
    const bearerToken = authData.bearer_token || authData.token;

    // B. PETICIÓN FINAL
    const response = await fetch(`${EPAYCO_API_URL}${endpoint}`, {
        method: method,
        headers: {
            "Authorization": `Bearer ${bearerToken}`,
            "Content-Type": "application/json",
            "type": "sdk-jwt"
        },
        body: JSON.stringify(data)
    });

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        return await response.json();
    } else {
        const htmlErr = await response.text();
        throw new Error(`ePayco devolvió HTML (Posible error 404 o 500): ${htmlErr.slice(0, 100)}`);
    }
}
