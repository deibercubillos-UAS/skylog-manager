const BASE_URL = "https://api.secure.payco.co";

export async function epaycoRequest(endpoint, method, data, isTokenization = false) {
    const publicKey = process.env.EPAYCO_PUBLIC_KEY?.trim();
    const privateKey = process.env.EPAYCO_PRIVATE_KEY?.trim();

    // --- CASO ESPECIAL: TOKENIZACIÓN (Paso 1) ---
    if (isTokenization) {
        // La tokenización requiere Basic Auth con la Public Key en Base64
        const authBasic = Buffer.from(`${publicKey}:`).toString('base64');
        
        // Convertimos el objeto a formato Form-Data (card[number]=...)
        const formData = new URLSearchParams();
        for (const key in data) {
            formData.append(key, data[key]);
        }

        const response = await fetch(`${BASE_URL}/v1/tokenize-card`, {
            method: "POST",
            headers: {
                "Authorization": `Basic ${authBasic}`,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: formData.toString()
        });

        return await response.json();
    }

    // --- CASO ESTÁNDAR: CLIENTES Y SUSCRIPCIONES (Pasos 2 y 3) ---
    const authRes = await fetch(`${BASE_URL}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_key: publicKey, private_key: privateKey })
    });
    const authData = await authRes.json();
    const bearerToken = authData.bearer_token || authData.token;

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
