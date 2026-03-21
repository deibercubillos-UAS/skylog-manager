// debug-plans.js
const epayco = require('epayco-sdk-node')({
    apiKey: '2e2aa67391a6c81cbefbaeab54c4dc22',    // Reemplaza con tu P_KEY de ePayco
    privateKey: '7aa026f9ecc7b350adb8296bb0263d96', // Reemplaza con tu PRIVATE_KEY de ePayco
    lang: 'ES',
    test: true
});

console.log("--- Consultando Planes en ePayco ---");

epayco.plans.list()
    .then(function(plans) {
        if (plans.success) {
            console.log("✅ Conexión exitosa. Planes encontrados:");
            console.dir(plans.data, { depth: null }); // Esto mostrará todo el detalle
        } else {
            console.log("❌ Error de ePayco:", plans.message);
        }
    })
    .catch(function(err) {
        console.log("err: " + err);
    });