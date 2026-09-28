// Kill switch central de ARDIS: si ARDIS_ENABLED no es exactamente 'true',
// toda ruta de ARDIS (páginas y API) debe comportarse como si no existiera.
export function isArdisEnabled() {
  return process.env.ARDIS_ENABLED === 'true';
}
