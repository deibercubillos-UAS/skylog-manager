// Skylog V2.0 — un modelo de UAS tal como sale al cliente: nunca la ruta del archivo de la autorización de la
// ANE, solo si hay una cargada. (Va en lib/ porque un route.js de Next solo puede exportar métodos HTTP.)
export const publicModel = ({ ane_authorization_path, ...m }) => ({ ...m, has_ane_document: !!ane_authorization_path });
