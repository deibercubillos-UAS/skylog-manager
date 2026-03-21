const handlePayment = async (e) => {
        e.preventDefault();
        
        // Verificamos de nuevo antes de procesar
        if (!user || !planId) {
            alert("⚠️ Los datos de sesión aún no han cargado. Espera un segundo y reintenta.");
            return;
        }

        setLoading(true);
        initEpayco(); 

        const $form = window.jQuery('#payment-form');

        window.ePayco.token.create($form, async (error, token) => {
            if (error) {
                alert("Error en tarjeta: " + (error.description || "Datos inválidos"));
                setLoading(false);
            } else {
                try {
                    // Enviamos los datos asegurándonos de que no sean nulos
                    const response = await fetch('/api/payments/subscribe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            token: token.id,
                            planId: planId,
                            name: user.user_metadata?.full_name || user.email,
                            email: user.email,
                            userId: user.id
                        })
                    });

                    const result = await response.json();

                    if (response.ok) {
                        alert("🚀 ¡Suscripción Activada con éxito!");
                        window.location.href = '/dashboard/subscription';
                    } else {
                        // AQUÍ VERÁS EL MENSAJE ESPECÍFICO DE QUÉ CAMPO FALTA
                        alert("Falla: " + result.error);
                        setLoading(false);
                    }
                } catch (err) {
                    alert("Error de red.");
                    setLoading(false);
                }
            }
        });
    };