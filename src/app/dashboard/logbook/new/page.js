const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthorized) return alert("Complete los protocolos de seguridad.");
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/logbook', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: session.user.id,
          flightData: {
            ...formData,
            flight_date: new Date().toISOString().split('T')[0]
          }
        }),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      alert("✅ Vuelo registrado y autorizado.");
      router.push('/dashboard/logbook');
    } catch (err) {
      alert("Falla de registro: " + err.message);
    } finally {
      setLoading(false);
    }
  };