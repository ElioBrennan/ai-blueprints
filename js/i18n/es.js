window._translations = window._translations || {};
window._translations.es = {

  /* ─── App ─── */
  'app.name': 'Blueprint Docs',
  'app.untitled': 'Proyecto sin nombre',

  /* ─── Toolbar ─── */
  'toolbar.new': '\uD83D\uDCC4 Nuevo',
  'toolbar.open': '\uD83D\uDCC2 Abrir',
  'toolbar.save': '\uD83D\uDCBE Guardar',
  'toolbar.saveAs': '\uD83D\uDCBE Guardar como...',
  'toolbar.export': '\uD83D\uDCDA Exportar Docs',
  'toolbar.exportHtml': '\uD83C\uDF10 Exportar HTML',
  'toolbar.zoomOut': '\uD83D\uDD0D\u2212',
  'toolbar.zoomIn': '\uD83D\uDD0D+',
  'toolbar.zoomFit': '\u2291',
  'toolbar.template': 'Plantilla:',
  'toolbar.designGuide': '\uD83C\uDFA8 Gu\u00EDa de Dise\u00F1o',

  /* ─── Template Select ─── */
  'template.blank': 'Vac\u00EDa',
  'template.simpleProcess': 'Proceso Simple',
  'template.decisionTree': '\u00C1rbol de Decisi\u00F3n',
  'template.pipeline': 'Pipeline de IA',
  'template.calculator': 'Calculadora Cient\u00EDfica',

  /* ─── Palette ─── */
  'palette.header': 'Paleta de Nodos',
  'palette.actions': 'Acciones',
  'palette.addScreen': '\u2795 A\u00F1adir Pantalla',
  'palette.addStart': '\u2795 A\u00F1adir Inicio',
  'palette.addProcess': '\u2795 A\u00F1adir Proceso',
  'palette.addDecision': '\u2795 A\u00F1adir Decisi\u00F3n',
  'palette.addDocument': '\u2795 A\u00F1adir Documento',
  'palette.addSubGraph': '\u2795 A\u00F1adir SubGrafo',
  'palette.addEnd': '\u2795 A\u00F1adir Fin',
  'palette.deleteSelected': '\uD83D\uDDD1 Eliminar seleccionado',

  /* ─── Node Types ─── */
  'palette.node.Screen': 'Pantalla',
  'palette.node.Start': 'Inicio',
  'palette.node.Process': 'Proceso',
  'palette.node.Decision': 'Decisi\u00F3n',
  'palette.node.Document': 'Documento',
  'palette.node.SubGraph': 'SubGrafo',
  'palette.node.End': 'Fin',

  'nodeType.Start.label': 'Inicio',
  'nodeType.Start.defaultName': 'Inicio',
  'nodeType.Start.pin.out': 'Out',
  'nodeType.Start.docTemplate':
    '# Inicio: {{name}}\n\n' +
    '## Prop\u00F3sito\n' +
    'Describir el punto de entrada del flujo.\n\n' +
    '## Activaci\u00F3n\n' +
    '- **Trigger**: Describir qu\u00E9 inicia este flujo\n' +
    '- **Condiciones**: Requisitos previos\n\n' +
    '## Salidas\n' +
    '- **Out**: Flujo principal del proceso\n',

  'nodeType.Process.label': 'Proceso',
  'nodeType.Process.defaultName': 'Proceso',
  'nodeType.Process.pin.in': 'In',
  'nodeType.Process.pin.out': 'Out',
  'nodeType.Process.docTemplate':
    '# Proceso: {{name}}\n\n' +
    '## Descripci\u00F3n\n' +
    'Explicar qu\u00E9 hace este proceso.\n\n' +
    '## Entradas\n' +
    '- **In**: Datos que recibe\n\n' +
    '## Procesamiento\n' +
    'Detallar los pasos internos del proceso.\n\n' +
    '## Salidas\n' +
    '- **Out**: Resultado del proceso\n\n' +
    '## Notas\n' +
    '- Consideraciones importantes\n',

  'nodeType.Decision.label': 'Decisi\u00F3n',
  'nodeType.Decision.defaultName': 'Decisi\u00F3n',
  'nodeType.Decision.pin.in': 'In',
  'nodeType.Decision.pin.yes': 'S\u00ED',
  'nodeType.Decision.pin.no': 'No',
  'nodeType.Decision.docTemplate':
    '# Decisi\u00F3n: {{name}}\n\n' +
    '## Pregunta\n' +
    '\u00BFQu\u00E9 condici\u00F3n se eval\u00FAa?\n\n' +
    '## Criterios\n' +
    'Describir la l\u00F3gica de decisi\u00F3n.\n\n' +
    '## Ramas\n' +
    '- **S\u00ED**: {{yesDescription}}\n' +
    '- **No**: {{noDescription}}\n\n' +
    '## Consideraciones\n' +
    '- Factores a tener en cuenta\n',

  'nodeType.Document.label': 'Documento',
  'nodeType.Document.defaultName': 'Documento',
  'nodeType.Document.pin.in': 'In',
  'nodeType.Document.pin.out': 'Out',
  'nodeType.Document.docTemplate':
    '# Documento: {{name}}\n\n' +
    '## Contenido\n' +
    'Descripci\u00F3n detallada del documento.\n\n' +
    '## Formato\n' +
    '- **Tipo**: Documentaci\u00F3n t\u00E9cnica\n' +
    '- **Extensi\u00F3n**: .md / .pdf\n\n' +
    '## Referencias\n' +
    '- Enlaces a recursos relacionados\n',

  'nodeType.SubGraph.label': 'SubGrafo',
  'nodeType.SubGraph.defaultName': 'SubGrafo',
  'nodeType.SubGraph.pin.in': 'In',
  'nodeType.SubGraph.pin.out': 'Out',
  'nodeType.SubGraph.docTemplate':
    '# SubGrafo: {{name}}\n\n' +
    '## Descripci\u00F3n\n' +
    'Este nodo agrupa un conjunto de subprocesos.\n\n' +
    '## Componentes internos\n' +
    'Listar los elementos contenidos en este SubGrafo.\n\n' +
    '## Interface\n' +
    '- **Entrada**: {{inDescription}}\n' +
    '- **Salida**: {{outDescription}}\n',

  'nodeType.Screen.label': 'Pantalla',
  'nodeType.Screen.defaultName': 'Pantalla',
  'nodeType.Screen.pin.in': 'In',
  'nodeType.Screen.pin.out': 'Out',
  'nodeType.Screen.pin.children': 'Tareas',
  'nodeType.Screen.docTemplate':
    '# Pantalla: {{name}}\n\n' +
    '## Descripci\u00F3n\n' +
    'Describir esta pantalla.\n\n' +
    '## Referencias de Dise\u00F1o\n' +
    '- **Figma**: {{figmaUrl}}\n' +
    '- **Prototipo HTML**: {{htmlUrl}}\n\n' +
    '## Elementos\n' +
    'Listar los componentes de esta pantalla.\n\n' +
    '## Interacciones\n' +
    'Describir las interacciones de usuario.\n',

  'nodeType.End.label': 'Fin',
  'nodeType.End.defaultName': 'Fin',
  'nodeType.End.pin.in': 'In',
  'nodeType.End.docTemplate':
    '# Fin: {{name}}\n\n' +
    '## Resultado\n' +
    'Describir el resultado final del flujo.\n\n' +
    '## Salidas generadas\n' +
    '- Listar los artefactos o decisiones resultantes.\n\n' +
    '## Post-condiciones\n' +
    'Estado del sistema al finalizar.\n',

  /* ─── Edge ─── */
  'edge.docTemplate':
    '# Conexi\u00F3n: {from} \u2192 {to}\n\n' +
    '## Descripci\u00F3n\n' +
    'Describir la transici\u00F3n entre estos nodos.\n',

  /* ─── Properties Panel ─── */
  'properties.header': 'Propiedades',
  'properties.placeholder': 'Selecciona un nodo o conexi\u00F3n para ver sus propiedades',
  'properties.name': 'Nombre',
  'properties.type': 'Tipo',
  'properties.id': 'ID',
  'properties.description': 'Descripci\u00F3n corta',
  'properties.edgeFrom': 'Desde \u2192 Hasta',
  'properties.connection': 'Conexi\u00F3n',
  'properties.section.interfaces': 'Interfaces',
  'properties.figmaUrl': 'URL de Figma',
  'properties.htmlUrl': 'URL de HTML Prototipo',
  'properties.openLink': 'Abrir',
  'properties.noInterface': 'Sin dise\u00F1o asignado. Seguir la Gu\u00EDa de Dise\u00F1o del proyecto.',
  'properties.interfaceHint': 'A\u00F1ade una URL de Figma o un prototipo HTML',

  /* ─── Documentation Panel ─── */
  'doc.header': 'Documentaci\u00F3n',
  'doc.edit': '\u270F\uFE0F Editar',
  'doc.preview': '\uD83D\uDC41 Vista',
  'doc.template': '\uD83D\uDCCB Plantilla',
  'doc.placeholder': 'Selecciona un elemento para documentar',
  'doc.editorPlaceholder': 'Escribe la documentaci\u00F3n en Markdown...',
  'doc.noDoc': 'Sin documentaci\u00F3n',

  /* ─── Canvas ─── */
  'canvas.emptyHint': 'Arrastra nodos desde la paleta o haz doble clic en el lienzo',

  /* ─── Implementation Status ─── */
  'status.pending': 'Pendiente',
  'status.in-progress': 'En progreso',
  'status.done': 'Completado',

  /* ─── Properties — Implementation ─── */
  'properties.implHeader': 'Implementaci\u00F3n',
  'properties.order': 'Orden',
  'properties.status': 'Estado',
  'properties.diary': 'Diario de Implementaci\u00F3n',
  'properties.diaryPlaceholder': 'A\u00F1adir entrada al diario...',
  'properties.diaryAdd': 'A\u00F1adir',

  /* ─── Status Bar ─── */
  'status.ready': 'Listo',
  'status.counts': '{0} nodos \u00B7 {1} conexiones',
  'status.coords': 'X: {0} Y: {1}',

  /* ─── Context Menu ─── */
  'ctx.edit': '\u270F\uFE0F Editar documentaci\u00F3n',
  'ctx.duplicate': '\uD83D\uDCCB Duplicar',
  'ctx.disconnect': '\uD83D\uDD17 Desconectar',
  'ctx.delete': '\uD83D\uDDD1 Eliminar',
  'ctx.duplicateSuffix': '(copia)',

  /* ─── Confirm Dialogs ─── */
  'confirm.newProject': '\u00BFCrear nuevo proyecto? Se perder\u00E1n los cambios no guardados.',
  'confirm.applyTemplate': '\u00BFAplicar plantilla? Se perder\u00E1n los cambios actuales.',

  /* ─── Notifications ─── */
  'notify.saved': 'Proyecto guardado correctamente',
  'notify.loaded': 'Proyecto cargado correctamente',
  'notify.noProjectFile': 'No se encontr\u00F3 project.json en la carpeta',
  'notify.exported': 'Documentaci\u00F3n exportada correctamente',
  'notify.exportedHtml': 'Sitio HTML exportado',
  'notify.saveError': 'Error al guardar: {0}',
  'notify.error': 'Error: {0}',
  'notify.jsonFallback': 'Descargado como JSON (usar en otro navegador que soporte File System API)',
  'notify.jsonLoadHint': 'Abre un archivo .json guardado previamente',
  'notify.copied': 'Copiado al portapapeles',

  /* ─── Export Index ─── */
  'export.indexTitle': 'Documentaci\u00F3n del Blueprint',
  'export.autoGenerated': 'Documentaci\u00F3n generada autom\u00E1ticamente.',
  'export.nodesSection': 'Nodos',
  'export.edgesSection': 'Conexiones',
  'export.diagramSection': 'Diagrama',
  'export.tableName': 'Nombre',
  'export.tableType': 'Tipo',
  'export.tableDescription': 'Descripci\u00F3n',
  'export.tableFrom': 'Desde',
  'export.tableTo': 'Hasta',
  'export.flow': 'Flow',
  'export.staticTitle': 'Diagrama de documentaci\u00F3n de proyecto',
  'export.statsNodes': 'nodos',
  'export.statsEdges': 'conexiones',
  'export.nodesLabel': 'Nodos',
  'export.edgesLabel': 'Conexiones',
  'export.noEdges': 'Sin conexiones',
  'export.interfaces': 'Interfaces',
  'export.noDoc': 'Sin documentaci\u00F3n.',
  'export.designGuide': 'Gu\u00EDa de Dise\u00F1o',
  'export.tableOrder': '#',
  'export.tableStatus': 'Estado',
  'export.diary': 'Diario de Implementaci\u00F3n',
  'export.diaryDate': 'Fecha',
  'export.diaryNote': 'Nota',

  /* ─── LLM Context ─── */
  'llm.title': 'Contexto LLM \u2014 {0}',
  'llm.autoGenerated': 'Contexto generado autom\u00E1ticamente para guiar la implementaci\u00F3n por un asistente IA.',
  'llm.instructions': 'Instrucciones',
  'llm.instructionsText':
    'Implementa los nodos en el orden indicado respetando las dependencias del grafo (los nodos sin dependencias primero).\n\n' +
    '### Flujo de trabajo\n' +
    '1. Lee la documentaci\u00F3n completa de cada nodo antes de implementarlo\n' +
    '2. Implementa la funcionalidad siguiendo la Gu\u00EDa de Dise\u00F1o del proyecto\n' +
    '3. Verifica que las conexiones entrantes y salientes del nodo sean compatibles\n' +
    '4. Despu\u00E9s de completar cada m\u00F3dulo, actualiza su entrada en el diario con:\n' +
    '   - Resumen de lo implementado\n' +
    '   - Problemas encontrados y decisiones tomadas\n' +
    '   - Tiempo estimado de implementaci\u00F3n\n\n' +
    '### Validaci\u00F3n post-implementaci\u00F3n\n' +
    '- Aseg\u00FArate de que el flujo de datos entre nodos conectados sea correcto\n' +
    '- Verifica que las interfaces (Figma/HTML) coincidan con la implementaci\u00F3n\n' +
    '- Comprueba que todos los pines de entrada/salida est\u00E9n correctamente cableados\n\n' +
    'Cada nodo es una unidad modular e independiente. Sigue el orden de implementaci\u00F3n para minimizar dependencias cruzadas.',
  'llm.orderTable': 'Orden de Implementaci\u00F3n',
  'llm.diary': 'Diario de Implementaci\u00F3n',
  'llm.noDiaryEntries': '(Sin entradas en el diario)',
  'llm.connections': 'Conexiones entre Nodos',
  'llm.edgeLabel': 'Etiqueta',
  'llm.designGuide': 'Gu\u00EDa de Dise\u00F1o',
  'llm.projectInfo': 'Información del Proyecto',
  'llm.exportDate': 'Fecha de exportación',
  'llm.lang': 'Idioma',

  /* ─── Edge Types ─── */
  'edgeType.data-flow': 'Flujo de Datos',
  'edgeType.navigation': 'Navegaci\u00F3n',
  'edgeType.data-ui': 'Dato \u2192 UI',
  'edgeType.user-action': 'Acci\u00F3n Usuario',
  'llm.nodeDocs': 'Documentaci\u00F3n completa de nodos',
  'llm.systemDiagram': 'Diagrama del Sistema',
  'llm.topologicalNote': 'Los nodos están ordenados topológicamente según sus dependencias (los nodos sin dependencias primero).',
  'llm.screenHierarchy': 'Jerarquía de Pantallas',
  'llm.noScreensWithChildren': '(No hay pantallas con tareas asociadas)',

  /* ─── Filters ─── */
  'filter.all': 'Todo',
  'filter.dataFlow': 'Flujo de Datos',
  'filter.interfaces': 'Interfaces',

  /* ─── Screen Container ─── */
  'screen.children': 'Tareas asociadas',
  'screen.noChildren': 'Arrastra procesos aqu\u00ED o usa el men\u00FA contextual para asignarlos',
  'screen.removeChild': 'Desvincular tarea',
  'ctx.addToScreen': 'Vincular a Pantalla...',
  'ctx.addToScreenHint': 'Escribe el n\u00FAmero de la pantalla:',

  'designGuide.title': 'Gu\u00EDa de Dise\u00F1o del Proyecto',
  'designGuide.default':
    '# Gu\u00EDa de Dise\u00F1o\n\n' +
    '## Colores\n' +
    '- **Primario**: \n' +
    '- **Secundario**: \n' +
    '- **Fondo**: \n' +
    '- **Texto**: \n\n' +
    '## Tipograf\u00EDa\n' +
    '- **Fuente principal**: \n' +
    '- **Tama\u00F1os**: \n\n' +
    '## Componentes\n' +
    'Describir los componentes UI del sistema.\n\n' +
    '## Layout\n' +
    'Describir la estructura de las pantallas.\n\n' +
    '## Accesibilidad\n' +
    'Notas sobre accesibilidad.\n'
};
