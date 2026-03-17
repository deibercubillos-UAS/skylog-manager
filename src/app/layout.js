// ... dentro de DashboardLayout ...

const [userRole, setUserRole] = useState('piloto');

useEffect(() => {
  async function loadUserRole() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('profiles').select('role, subscription_plan').eq('id', user.id).single();
    setUserRole(data?.role || 'piloto');
    setUserPlan(data?.subscription_plan || 'piloto');
  }
  loadUserRole();
}, []);

// Filtrado de menú
const filteredMenuItems = menuItems.filter(item => {
  if (userRole === 'admin') return true;
  
  if (userRole === 'jefe_pilotos') {
    return ['Dashboard', 'Mis Pilotos', 'Mi Flota', 'Bitácora de Vuelos'].includes(item.name);
  }
  
  if (userRole === 'gerente_sms') {
    return ['Dashboard', 'Análisis SORA', 'Personalizar Checklist', 'Reportes PDF'].includes(item.name);
  }
  
  if (userRole === 'piloto') {
    return ['Dashboard', 'Bitácora de Vuelos', 'Mi Flota'].includes(item.name);
  }
  
  return true;
});

// ... en el return, usa filteredMenuItems.map en lugar de menuItems.map