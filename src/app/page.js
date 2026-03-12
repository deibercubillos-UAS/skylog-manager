export default function Home() {
  return (
    <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', fontFamily: 'sans-serif'}}>
      <h1 style={{color: '#ec5b13'}}>SkyLog Manager está en línea</h1>
      <p>Si ves esto, la ruta raíz ya funciona. Ahora puedes pegar el código de la landing.</p>
      <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
        <a href="/dashboard" style={{color: 'blue'}}>Ir al Dashboard</a>
        <a href="/register" style={{color: 'blue'}}>Ir al Registro</a>
      </div>
    </div>
  )
}
