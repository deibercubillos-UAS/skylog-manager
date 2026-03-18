const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // LLAMADA AL BACKEND (Separación de responsabilidades)
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error en el servidor");
      }

      // Si el backend dice que todo está OK
      console.log("Respuesta del Backend:", result.message);
      
      // Seteamos la sesión en el cliente (Supabase manejará la cookie automáticamente)
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      });

      if (!sessionError) {
        window.location.href = '/dashboard';
      }

    } catch (err) {
      alert("Falla de Backend: " + err.message);
    } finally {
      setLoading(false);
    }
  };