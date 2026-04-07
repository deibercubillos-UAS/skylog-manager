const epaycoNode = require('epayco-sdk-node');

const epayco = epaycoNode({
    apiKey: process.env.EPAYCO_PUBLIC_KEY,
    privateKey: process.env.EPAYCO_PRIVATE_KEY,
    lang: 'ES',
    test: true
});

export default epayco;
