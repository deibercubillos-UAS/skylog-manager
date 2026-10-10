# Barrido móvil con Safari real (Appium + simulador de iPhone)

Instalación (una vez, fuera del repositorio): `~/bitafly-appium` con `appium` 3.8, el controlador `xcuitest` y `webdriverio`.
```bash
cd ~/bitafly-appium && export APPIUM_HOME=$HOME/bitafly-appium/.appium
npx appium --port 4723 &                     # servidor (dejarlo abierto)
xcrun simctl boot <UDID del iPhone>          # simulador (iPhone 17: 5B19A967-9022-4D30-9E37-73DD4C72E1A6)
cp <repo>/tools/mobile-sweep/barrido.mjs .   # el script usa webdriverio instalado allí
node barrido.mjs /tmp/mobile https://bitafly.com/ https://bitafly.com/precios
```
Por página mide: ancho del documento, elementos que sobresalen de la pantalla (fuera de contenedores que deslizan), botones y enlaces
menores de 40 px y textos menores de 11 px; y guarda la página completa en tramos `parte-NN.png`. Resultado en `resultados.json`.
Parar el servidor: `pkill -f "appium --port 4723"`. Cambiar de iPhone: `SIM_UDID=<udid> node barrido.mjs …`.
