# Blueprint Docs — Documentación de Contexto

## ¿Qué es?

**Blueprint Docs** es un editor visual de diagramas de flujo (blueprints) basado en navegador, 100% client-side y offline. Permite crear gráficos de nodos y conexiones, documentar cada elemento con Markdown, y exportar la documentación a ficheros `.md`, un sitio HTML estático o un contexto LLM.

---

## Estructura del proyecto

```
Blueprints/
├── index.html            → Página principal (layout, toolbar, canvas, paneles)
├── calculadora-cientifica.json  → Datos de la plantilla "Calculadora Científica"
├── css/
│   └── style.css         → Todos los estilos (tema oscuro, layout, nodos, markdown)
├── js/
│   ├── app.js            → Orquestador: inicializa módulos, toolbar, drag, menú contextual, filtros
│   ├── graph.js          → Clase Graph: lógica del lienzo SVG, nodos, conexiones, zoom, pan, filtros, contenedores
│   ├── documentation.js  → Clase DocumentationPanel: editor Markdown, preview, propiedades, diario, interfaces
│   ├── storage.js        → Clase Storage: File System API, exportación, plantillas, notificaciones, contexto LLM
│   ├── templates.js      → Constantes TEMPLATES, EDGE_TYPES, generación de documentación desde plantillas
│   └── i18n/
│       ├── i18n.js       → Motor de internacionalización (t(), setLanguage(), _translateDOM())
│       ├── es.js         → Traducciones al español (cargado sincrónicamente)
│       └── en.json       → Traducciones al inglés (cargado asíncronamente vía fetch)
├── templates/            → (vacío) reservado para plantillas externas
├── serve.ps1             → Servidor HTTP local con Python (puerto 8080)
└── AGENTS.md             ← Este fichero
```

---

## Implementación por módulo

### `index.html` — Layout

- **Toolbar**: botones de acción (Nuevo, Abrir, Guardar, Exportar, Zoom, selector de plantilla, selector de idioma).
- **Sidebar izquierdo**: paleta de nodos (drag & drop) y botones de acción rápida.
- **Canvas**: SVG con sistema de coordenadas, grid, viewport transform, capas para containers, edges, temp-edge y nodes.
- **Sidebar derecho**: panel de propiedades (nombre, tipo, ID, descripción) y editor de documentación Markdown con vista previa.
- **Status bar**: texto de estado, coordenadas del ratón, contador de nodos/conexiones.
- **Context menu**: menú flotante contextual al hacer clic derecho.

### `css/style.css` — Estilos

- Tema oscuro completo con variables CSS (`--bg-primary`, `--text-primary`, etc.).
- Layout con flexbox: toolbar arriba, sidebar-left | canvas | sidebar-right en el centro, statusbar abajo.
- Estilos específicos para nodos SVG, pins, edges, markdown preview, notificaciones, scrollbar, animaciones.

### `js/templates.js` — Definición de tipos de nodo y edge

Define `TEMPLATES` (objeto global) con 7 tipos de nodo:
- **Start** (verde, cápsula, solo output)
- **Process** (azul, rectángulo, input+output)
- **Decision** (naranja, rombo, input + outputs: yes/no)
- **Document** (amarillo, rectángulo con doblez, input+output)
- **SubGraph** (púrpura, rectángulo con borde discontinuo, input+output)
- **Screen** (cian, rectángulo, input+output, con hijos y URLs de diseño)
- **End** (rojo, cápsula, solo input)

Cada template define: color, icono, dimensiones (width/height), shape y pines (inputs/outputs).
También contiene `TEMPLATE_DOC_DEFAULTS` con documentación predeterminada en inglés (usada como fallback).

Define `EDGE_TYPES` (objeto global) con 4 tipos de conexión:
- **DATA_FLOW** (`data-flow`): flujo de datos entre procesos (gris, línea sólida)
- **NAVIGATION** (`navigation`): navegación entre pantallas (cian, línea discontinua)
- **DATA_UI** (`data-ui`): dato → interfaz (púrpura, línea punteada)
- **USER_ACTION** (`user-action`): acción de usuario (rojo, línea punteada)

Funciones auxiliares: `getTemplate()`, `getTemplateLabel()`, `getTemplateDefaultName()`, `getPinLabel()`, `getDocTemplate()`, `generateDocFromTemplate()`, `getEdgeDocTemplate()`, `getNodeCategory()`, `inferEdgeType()`.

### `js/graph.js` — Clase Graph

Núcleo del editor. Maneja todo el canvas SVG interactivo.

**Propiedades clave:**
- `nodes` / `edges`: Mapas de nodos y conexiones.
- `viewX`, `viewY`, `viewScale`: transformación del viewport (pan/zoom).
- `selectedNode` / `selectedEdge`: IDs del elemento seleccionado.
- `dragState`, `panState`, `connectingState`: estados de interacción del ratón.
- `designGuide`: string con el contenido de la Guía de Diseño.
- `filterMode`: modo de filtro activo (`all`, `data-flow`, `interfaces`).

**Métodos principales:**
- `addNode(type, x, y, name)` → crea nodo desde template, lo renderiza en SVG.
- `removeNode(id)` → elimina nodo y sus conexiones, desvincula hijos/screns.
- `addEdge(fromNode, fromPin, toNode, toPin)` → crea conexión con tipo inferido automáticamente (evita duplicados y self-loops).
- `removeEdge(id)` → elimina conexión.
- `selectNode(id)` / `selectEdge(id)` / `deselectAll()` → selección con feedback visual.
- `setView()`, `pan()`, `zoomAt(scale, cx, cy)`, `zoomToFit()` → control de viewport.
- `toJSON()` / `fromJSON(data)` → serialización completa del grafo (incluye designGuide, interfaces, diary, children).
- `clear()` → reinicia el grafo.
- `_renderNode(node)` → renderiza SVG del nodo según su tipo (rect, diamond, capsule, subgraph, screen).
- `_renderEdge(edge)` → renderiza conexión con curva bezier, color y dash según tipo.
- `_updateEdgePath(edge)` → recalcula la curva bezier y aplica estilo según selección/tipo.
- `_bindEvents()` → mouse events: drag, pan, connection, doble click, context menu, wheel zoom.
- `_startDrag`, `_updateDrag`, `_endDrag` → arrastrar nodos (arrastra hijos si es Screen).
- `_startPan`, `_updatePan`, `_endPan` → panear el lienzo.
- `_startConnection`, `_updateConnection`, `_endConnection` → crear conexiones visuales arrastrando desde un pin output a un pin input.
- `screenToWorld(clientX, clientY)` → convierte coordenadas de pantalla a mundo.
- `getPinScreenPos(nodeId, pinId)` → posición en pantalla de un pin.
- `getNodeAt(worldX, worldY)` → nodo en una coordenada mundo (para drop en Screen).
- `addChildToScreen(screenId, childId)` / `removeChildFromScreen(screenId, childId)` → gestiona jerarquía Screen → hijos.
- `getEdgesForNode(nodeId)` / `getScreenChildren(screenId)` → consultas.
- `setFilter(mode)` / `_applyFilter()` / `_updateNodeVisibility()` / `_updateEdgeVisibility()` → sistema de filtros (All / Data Flow / Interfaces).
- `updateNodeName()`, `updateNodeDoc()`, `updateNodeDescription()`, `updateEdgeDoc()`, `updateEdgeDescription()`, `updateEdgeLabel()` → actualizaciones desde el panel de propiedades.
- `updateNodeOrder(id, order)` / `updateNodeStatus(id, status)` / `addDiaryEntry(id, note)` → propiedades de implementación.
- `updateNodeInterfaces(id, figma, html)` → URLs de diseño para Screen.
- `updateDesignGuide(content)` → actualiza la guía de diseño.
- `_updateContainerBounds(screen)` → redimensiona el Screen según la posición de sus hijos.

### `js/documentation.js` — Clase DocumentationPanel

Maneja el panel lateral derecho (propiedades + documentación).

- `showNode(node)` / `showEdge(edge)`: rellena el formulario de propiedades y editor Markdown.
- `showDesignGuide(content)`: editor para la guía de diseño del proyecto.
- `clear()`: limpia el panel.
- Editor Markdown con vista previa renderizada por `_markdownToHTML(md)` (parser casero que soporta: títulos, negrita, cursiva, código inline, bloques de código, listas, blockquotes, enlaces, hr, tablas).
- Botón "Plantilla" para insertar documentación predefinida según el tipo de nodo.
- Soporte para edit/label en edges (el nombre del edge es su label).
- Soporte para propiedades de implementación: orden, estado (pending/in-progress/done), diario de entradas.
- Soporte para URLs de interfaz (Figma, HTML) en nodos Screen.
- Soporte para lista de hijos asociados a un Screen.
- Auto-guardado de documentación y descripción al escribir.

### `js/storage.js` — Clase Storage

Manejo de archivos y exportación.

- **File System Access API**: `saveProject()`, `saveProjectAs()`, `loadProject()` — guarda/carga `project.json` más documentación individual en carpeta `docs/`.
- **Fallback**: si la API no está disponible, descarga un `.json`.
- **Exportación Markdown**: genera un `index.md` con tabla de nodos y conexiones, más un `.md` por nodo, `design-guide.md` y `llm-context.md`.
- **Exportación HTML**: genera un sitio estático completo (`index.html` de navegación + `docs/*.md`).
- **Plantillas**: `simple-process`, `decision-tree`, `pipeline`, `scientific-calculator` — generan grafos predefinidos.
- **Notificaciones**: sistema toast (info, success, error).
- Métodos auxiliares: `_generateDocIndex()`, `_generateLLMContext()`, `_generateStaticSite()`, `_generateTemplate()`.

### `js/app.js` — Orquestador (IIFE)

Inicialización y conexión entre módulos:
- Crea instancias de `Graph`, `DocumentationPanel`, `Storage`.
- Configura callbacks: `onSelect`, `onDeselect`, `onChange`, `onAddNode`, `onContextMenu`.
- Bindea eventos de toolbar (nuevo, abrir, guardar, exportar, zoom).
- Bindea el selector de plantillas.
- Bindea drag & drop desde la paleta de nodos al canvas.
- Bindea botones de añadir nodo desde la paleta.
- Bindea teclado (Delete, Backspace, Escape).
- Maneja el menú contextual (editar, duplicar, desconectar, eliminar).
- Maneja el cambio de idioma.
- Maneja filtros (All / Data Flow / Interfaces).
- Maneja drag & drop sobre Screens (asignación automática de hijos).
- Maneja inputs de interfaces (Figma, HTML) en nodos Screen.

### `js/i18n/i18n.js` — Internacionalización

Motor de traducción simple:
- `t(key, ...args)`: obtiene traducción con sustitución de argumentos `{0}`, `{1}`, etc.
- `_translateDOM()`: recorre el DOM actualizando `data-i18n`, `data-i18n-placeholder`, `data-i18n-title`.
- `setLanguage(lang)`: cambia idioma. Español ya está cargado en `es.js`. Inglés se carga vía fetch de `en.json`.
- Soporte para eventos `languagechange` para reaccionar al cambio.

### `js/i18n/es.js` — Traducciones español

Todas las claves de traducción en español, incluyendo `nodeType.*.docTemplate` con contenido en español.

### `serve.ps1` — Servidor local

Lanza `python -m http.server 8080`.

---

## Convenios y notas importantes

- **No hay dependencias externas**: todo es JavaScript vanilla, CSS puro, HTML estático.
- **No hay bundler ni build system**: se sirve directamente desde el sistema de archivos (necesita un servidor HTTP por los módulos ES y fetch de i18n).
- **SVG namespaces**: todos los elementos SVG se crean con `createElementNS('http://www.w3.org/2000/svg', ...)`.
- **Los scripts se cargan en orden** en `index.html`: `es.js` → `i18n.js` → `templates.js` → `graph.js` → `documentation.js` → `storage.js` → `app.js`.
- **El canvas SVG** tiene capas: fondo (grid) → containers-layer → edges → temp-edge → nodes.
- **Coordenadas**: el canvas usa un sistema de coordenadas "mundo" con transformación SVG (`translate + scale`). `screenToWorld()` convierte coordenadas de pantalla a mundo.
- **File System Access API**: solo disponible en Chromium. Fallback a descarga JSON.
- **Idioma por defecto**: español (`es`). Las traducciones al inglés se cargan asíncronamente.

---

## Reglas para el asistente

1. **Siempre leer este fichero primero** antes de hacer cambios significativos.
2. **No añadir dependencias externas** (npm, CDN, etc.). Mantener vanilla JS.
3. **Respetar el orden de carga** de los scripts en `index.html`.
4. **Seguir el patrón existente**: clases ES6 con métodos, IIFE para app.js, variables globales (`TEMPLATES`, `EDGE_TYPES`, `_translations`).
5. **CSS**: usar variables CSS del tema oscuro, no cambiar colores hardcodeados.
6. **Mantener compatibilidad con File System Access API** como método principal de guardado, con fallback a descarga.
7. **Todas las nuevas strings de UI deben añadirse** a `es.js` y `en.json` con sus respectivas claves `data-i18n`.
8. **No modificar la estructura HTML del layout** sin justificación.
9. **Los templates de documentación** en `templates.js` (inglés) y `es.js` (español) deben mantenerse sincronizados.
10.**No crear ficheros Markdown (.md) a menos que se solicite explícitamente.** Este fichero es la única excepción.
