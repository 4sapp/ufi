# ufi

Una extensión para tu navegador creada para que juegues Roblox con el menor ping posible y sin lag, encontrando servidores en **Miami** y con la mejor conexión automáticamente.

Este proyecto es un fork personal optimizado a partir de [RoValra](https://github.com/NotValra/RoValra), rediseñado para enfocarse al 100% en solucionar el problema de conexión que sufren muchos jugadores al entrar a partidas en servidores lejanos.

---

## ¿Por qué existe ufi?

Cuando juegas en Roblox y le das al botón de "Jugar", el juego suele meterte en cualquier servidor que tenga espacio libre, sin importar dónde esté ubicado. Si juegas desde Latinoamérica, el Caribe, Florida o la costa este, muchas veces terminas en servidores de California, Texas o incluso Europa, jugando con 150 ms o 250 ms de ping y mucho retraso.

**ufi resuelve esto de raíz directamente en la página de Roblox:**
Revisa los servidores activos del juego, comprueba dónde está ubicado cada uno en el mapa real de centros de datos y te conecta al que mejor rendimiento te ofrezca, especialmente en **Miami**.

---

## Lo que puedes hacer con ufi

### 1. Buscador de Servidores en Miami
Miami es el punto de conexión clave para gran parte de Latinoamérica y el este de Estados Unidos. ufi analiza la lista de partidas y encuentra servidores que estén ubicados físicamente en Miami (o zonas cercanas de Florida), para que disfrutes de un ping de 40 ms a 70 ms en lugar de 180 ms.

- **Detección real:** No simula ni inventa ubicaciones. Si un juego tiene servidores en Miami, te lo mostrará con confirmación de datacenter.
- **Alternativas inteligentes:** Si en ese momento el juego no tiene servidores activos en Miami, busca automáticamente la mejor alternativa en la región este (como Georgia o Virginia) para no dejarte sin jugar.

### 2. Modo Mejor Conexión
Si no buscas específicamente Miami, este modo analiza la respuesta de los servidores disponibles y elige el que responda más rápido a tu propia conexión de internet.

### 3. Filtro de Servidores Llenos y Con Espacio
Descarta automáticamente servidores que estén al tope (evitando el molesto mensaje de "servidor lleno") y prioriza partidas con suficientes espacios libres para que puedas invitar a tus amigos.

### 4. Botón "Buscar Otro"
Si el servidor encontrado no te convence, con un solo clic el buscador pasa al siguiente mejor servidor disponible.

---

## ¿Cómo se instala en tu navegador?

Puedes instalarlo en **Google Chrome, Microsoft Edge, Brave, Opera** o cualquier navegador basado en Chromium siguiendo estos tres sencillos pasos:

### Paso 1: Descargar y preparar el código
Necesitas tener instalado [Node.js](https://nodejs.org/) (versión 18 o superior) en tu computadora.

Abre tu terminal y ejecuta:

```bash
git clone https://github.com/4sapp/ufi.git
cd ufi
npm install
npm run build
```

Esto generará la versión lista para usar dentro de la carpeta llamada `dist`.

### Paso 2: Cargar la extensión en el navegador

1. Abre tu navegador y escribe en la barra de direcciones:
   - En Chrome: `chrome://extensions/`
   - En Edge: `edge://extensions/`
   - En Brave: `brave://extensions/`
2. En la esquina superior derecha, activa el interruptor que dice **Modo de desarrollador** (Developer mode).
3. Haz clic en el botón **Cargar descomprimida** (Load unpacked) que aparecerá arriba a la izquierda.
4. Selecciona la carpeta `dist` que se creó dentro de la carpeta del proyecto `ufi`.

### Paso 3: ¡Listo para jugar!
Abre cualquier juego en la página web de Roblox (por ejemplo, Rivals, Fisch, Blade Ball, Jailbreak, etc.) y ve a la pestaña de **Servidores** (Servers). Verás el panel de **ufi • Buscador de Servidores** listo para usar con un solo clic.

---

## Seguridad y Privacidad

- **Sin contraseñas ni datos personales:** La extensión nunca lee, pide ni guarda tu contraseña, cookies ni tokens de Roblox.
- **Sin hacks ni modificaciones al juego:** No toca los archivos de Roblox ni inyecta programas externos en tu computadora. Todo funciona legalmente a través de la web oficial de Roblox.
- **100% en tu navegador:** No envía tu información a ningún servidor externo ni a bases de datos de terceros.

---

## Origen y Créditos

**ufi** es un fork personalizado desarrollado sobre la base de código abierto de [RoValra](https://github.com/NotValra/RoValra), creado por Valra y su comunidad:

- **Proyecto Original:** [NotValra/RoValra](https://github.com/NotValra/RoValra)
- **Investigación de datacenters de Roblox:** Julia ([RoSeal Project](https://github.com/RoSeal-Extension/Top-Secret-Thing))
- **Lógica de detección geográfica:** l5se

---

## Licencia

Este proyecto está bajo la licencia de código abierto **GNU General Public License v3.0 (GPL-3.0)**, respetando la licencia y derechos del repositorio original.
