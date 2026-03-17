const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Intentamos la actualización
    const { data, error, count } = await supabase
      .from('pilots')
      .update({
        name: formData.name,
        license_number: formData.license_number,
        medical_expiry: formData.medical_expiry,
        pilot_role: formData.pilot_role,
        certificate_url: docs.license,
        medical_url: docs.medical,
        updated_at: new Date().toISOString()
      })
      .eq('id', pilot.id)
      .select(); // Forzamos a que nos devuelva el dato actualizado

    if (error) {
      alert("Error de base de datos: " + error.message);
    } else if (!data || data.length === 0) {
      // Si llegamos aquí, Supabase no encontró el registro o el RLS bloqueó el cambio
      alert("⚠️ Error de Permisos: No se pudo actualizar el registro. Verifica que seas el dueño de este dato.");
    } else {
      alert("✅ Piloto: " + data[0].name + " actualizado con éxito.");
      onSuccess();
    }
    setLoading(false);
  };