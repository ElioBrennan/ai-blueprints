# Blueprint Docs

Editor visual de diagramas de flujo (blueprints) 100% client-side, sin dependencias externas, completamente offline.

Permite crear gráficos de nodos y conexiones, documentar cada elemento con Markdown, y exportar la documentación a ficheros `.md`, un sitio HTML estático o un contexto LLM.

---

## Requisitos

- Un navegador web moderno (Chrome, Edge, Firefox)
- Opcional: Python 3 (para el servidor local)

## Cómo levantar la app

El proyecto se sirve directamente desde el sistema de archivos, pero necesita un servidor HTTP por los módulos ES y la carga asíncrona de traducciones.

### Opción 1: Servidor Python

Ejecuta en la raíz del proyecto:

```bash
python -m http.server 8080
```

O en Windows, usando el script incluido:

```powershell
.\serve.ps1
```

Luego abre `http://localhost:8080` en tu navegador.

### Opción 2: Cualquier servidor HTTP estático

```bash
npx serve .
```

O si usas VS Code, instala la extensión **Live Server** y haz clic derecho en `index.html` → "Open with Live Server".

## Modo de uso

### Nodos

Arrastra nodos desde la **Paleta de Nodos** (sidebar izquierdo) o haz doble clic en el lienzo para crear nodos. Tipos disponibles:

| Nodo       | Color   | Descripción                              |
|------------|---------|------------------------------------------|
| **Inicio** | Verde   | Punto de entrada del flujo (solo output) |
| **Proceso**| Azul    | Acción o transformación                  |
| **Decisión**| Naranja| Ramificación (sí/no)                     |
| **Documento**| Amarillo| Representa un documento o artefacto    |
| **SubGrafo**| Púrpura| Agrupación de subprocesos               |
| **Pantalla**| Cian   | Pantalla de interfaz de usuario          |
| **Fin**    | Rojo    | Punto final del flujo (solo input)       |

### Conexiones

Arrastra desde un pin de salida (output) hasta un pin de entrada (input) para crear una conexión. El tipo de conexión se infiere automáticamente.

### Panel de propiedades

Selecciona un nodo o conexión para ver y editar sus propiedades en el sidebar derecho:

- Nombre, tipo, ID
- Descripción corta
- Documentación en Markdown con vista previa
- Estado de implementación (pendiente / en progreso / completado)
- Diario de entradas
- URLs de diseño (Figma / HTML) para nodos Pantalla

### Zoom y navegación

- **Rueda del ratón**: zoom
- **Clic + arrastrar en el fondo**: panear el lienzo
- **Botones de zoom** en la barra de herramientas
- **Doble clic en un nodo**: ajusta la vista al nodo

### Filtros

Tres modos de visualización:

- **Todo**: vista completa del grafo
- **Datos**: solo flujo de datos (conexiones tipo data-flow)
- **Interfaces**: solo pantallas y sus conexiones

### Exportación

- **Exportar Docs**: genera un `index.md` con tabla de nodos y conexiones, más un `.md` por nodo y un `llm-context.md`
- **Exportar HTML**: genera un sitio HTML estático de navegación con toda la documentación

### Guardado

- Usa la **File System Access API** (Chromium) para guardar/cargar proyectos directamente en el sistema de archivos
- Como fallback, descarga un archivo `.json`

### Plantillas

Selecciona una plantilla predefinida desde la barra de herramientas:

- **Proceso Simple**
- **Árbol de Decisión**
- **Pipeline de IA**
- **Calculadora Científica**

### Guía de Diseño

El botón **Guía de Diseño** en la barra de herramientas abre un editor para documentar las guías de diseño globales del proyecto.

### Internacionalización

Cambia entre español e inglés desde el selector de idioma en la barra de herramientas.

---

## Estructura del proyecto

```
Blueprints/
├── index.html                     → Página principal
├── css/style.css                  → Estilos (tema oscuro)
├── js/
│   ├── app.js                     → Orquestador
│   ├── graph.js                   → Clase Graph (lienzo SVG)
│   ├── documentation.js           → Panel de documentación
│   ├── storage.js                 → Guardado y exportación
│   ├── templates.js               → Tipos de nodo y edge
│   └── i18n/
│       ├── i18n.js                → Motor de internacionalización
│       ├── es.js                  → Traducciones español
│       └── en.json                → Traducciones inglés
├── AGENTS.md                      → Documentación de contexto para el asistente
└── serve.ps1                      → Script para servidor local
```

---

## Tecnologías

- **JavaScript vanilla** (ES6) — sin frameworks, sin bundlers, sin dependencias externas
- **SVG** — renderizado de nodos, conexiones y viewport
- **CSS custom properties** — tema oscuro completo
- **File System Access API** — guardado nativo en navegadores Chromium

## Licencia

MIT
