// Lógica para detectar si la librería viene envuelta en .default (común en Next.js)
const epaycoNode = require('epayco-sdk-node');
const initEpayco = typeof epaycoNode === 'function' ? epaycoNode : epaycoNode.default;

if (typeof initEpayco !== 'function') {
    console.error("CRITICAL: El SDK de ePayco no pudo cargar el constructor.");
}

const epayco = initEpayco ? initEpayco({
    apiKey: process.env.EPAYCO_PUBLIC_KEY,
    privateKey: process.env.EPAYCO_PRIVATE_KEY,
    lang: 'ES',
    test: true
}) : null;

export default epayco;
