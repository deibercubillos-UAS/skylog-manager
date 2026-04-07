const BASE_URL = "https://api.secure.payco.co";

export async function epaycoRequest(endpoint, method, data) {
    const publicKey = process.env.EPAYCO_PUBLIC_KEY?.trim();
    const privateKey = process.env.EPAYCO_PRIVATE_KEY?.trim();

    // --- SUB-PASO A: LOGIN ---
    console.log("Intentando Login en ePayco...");
    const authRes = await fetch(`${BASE_URL}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_key: publicKey, private_key: privateKey })
    });

    if (!authRes.ok) {
        const text = await authRes.text();
        return { error: true, step: "LOGIN", status: authRes.status, msg: text.slice(0, 100) };
    }

    const authData = await authRes.json();
    const bearerToken = authData.bearer_token || authData.token;

    // --- SUB-PASO B: PETICIÓN REAL ---
    console.log(`Petición a ${endpoint}...`);
    const response = await fetch(`${BASE_URL}${endpoint}`, {
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
        const json = await response.json();
        return { error: false, data: json };
    } else {
        const html = await response.text();
        return { error: true, step: "ENDPOINT", status: response.status, msg: html.slice(0, 100) };
    }
}
