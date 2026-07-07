class Storage {
  constructor() {
    this.dirHandle = null;
    this.projectName = t('app.untitled');
  }

  /* ─── File System Access API ─── */

  async saveProject(data) {
    if (this.dirHandle) {
      return this._saveToDir(this.dirHandle, data);
    }
    return this.saveProjectAs(data);
  }

  async saveProjectAs(data) {
    try {
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });
      this.dirHandle = dirHandle;
      return this._saveToDir(dirHandle, data);
    } catch (err) {
      if (err.name === 'AbortError') return false;
      this._fallbackSave(data);
      return false;
    }
  }

  async _saveToDir(dirHandle, data) {
    try {
      const projectFile = await dirHandle.getFileHandle('project.json', { create: true });
      const writable = await projectFile.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();

      const docsDir = await dirHandle.getDirectoryHandle('docs', { create: true });
      await this._saveDocumentation(dirHandle, data);

      this.projectName = data.name || 'Proyecto';
      this._updateProjectName();

      this._notify(t('notify.saved'), 'success');
      return true;
    } catch (err) {
      console.error('Save error:', err);
      this._notify(tFormat(t('notify.saveError'), err.message), 'error');
      return false;
    }
  }

  async _saveDocumentation(dirHandle, data) {
    try {
      const docsDir = await dirHandle.getDirectoryHandle('docs', { create: true });
      const sortedNodes = [...data.nodes].sort((a, b) => (a.implementationOrder || 0) - (b.implementationOrder || 0));

      for (const node of sortedNodes) {
        const safeName = node.name.replace(/[<>:"\/\\|?*]/g, '_').replace(/\s+/g, '_');
        const fileHandle = await docsDir.getFileHandle(`${safeName}.md`, { create: true });
        const writable = await fileHandle.createWritable();
        let content = node.doc || `# ${node.name}\n\n${t('export.noDoc')}\n`;
        if (node.diary && node.diary.length > 0) {
          content += `\n\n## ${t('export.diary')}\n\n`;
          content += `| ${t('export.diaryDate')} | ${t('export.diaryNote')} |\n`;
          content += `|---|---|\n`;
          for (const entry of node.diary) {
            const d = new Date(entry.timestamp).toLocaleString();
            content += `| ${d} | ${entry.note.replace(/\n/g, ' ')} |\n`;
          }
        }
        await writable.write(content);
        await writable.close();
      }

      const indexContent = this._generateDocIndex(data);
      const indexHandle = await docsDir.getFileHandle('index.md', { create: true });
      const indexWritable = await indexHandle.createWritable();
      await indexWritable.write(indexContent);
      await indexWritable.close();

      const llmContent = this._generateLLMContext(data);
      const llmHandle = await dirHandle.getFileHandle('llm-context.md', { create: true });
      const llmWritable = await llmHandle.createWritable();
      await llmWritable.write(llmContent);
      await llmWritable.close();

      const designGuideContent = data.designGuide || t('designGuide.default');
      const guideHandle = await docsDir.getFileHandle('design-guide.md', { create: true });
      const guideWritable = await guideHandle.createWritable();
      await guideWritable.write(designGuideContent);
      await guideWritable.close();

    } catch (err) {
      console.error('Doc export error:', err);
    }
  }

  async loadProject() {
    try {
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });
      this.dirHandle = dirHandle;

      const projectFile = await dirHandle.getFileHandle('project.json');
      const file = await projectFile.getFile();
      const text = await file.text();
      const data = JSON.parse(text);

      this.projectName = data.name || t('app.untitled');
      this._updateProjectName();
      this._notify(t('notify.loaded'), 'success');
      return data;
    } catch (err) {
      if (err.name === 'AbortError') return null;
      if (err.name === 'NotFoundError') {
        this._notify(t('notify.noProjectFile'), 'error');
        return null;
      }
      return this._fallbackLoad();
    }
  }

  /* ─── Export Documentation ─── */

  async exportMarkdown(data) {
    if (this.dirHandle) {
      await this._saveDocumentation(this.dirHandle, data);
      this._notify(t('notify.exported'), 'success');
      return true;
    }

    try {
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });
      this.dirHandle = dirHandle;
      await this._saveDocumentation(dirHandle, data);
      this._notify(t('notify.exported'), 'success');
      return true;
    } catch (err) {
      if (err.name === 'AbortError') return false;
      this._notify(tFormat(t('notify.error'), err.message), 'error');
      return false;
    }
  }

  async exportStaticHTML(data) {
    try {
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });

      const html = this._generateStaticSite(data);

      const fileHandle = await dirHandle.getFileHandle('index.html', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(html);
      await writable.close();

      const docsDir = await dirHandle.getDirectoryHandle('docs', { create: true });
      for (const node of data.nodes) {
        const safeName = node.name.replace(/[<>:"\/\\|?*]/g, '_').replace(/\s+/g, '_');
        const fileHandle = await docsDir.getFileHandle(`${safeName}.md`, { create: true });
        const w = await fileHandle.createWritable();
        await w.write(node.doc || `# ${node.name}\n\n${t('export.noDoc')}`);
        await w.close();
      }

      const designGuideContent = data.designGuide || t('designGuide.default');
      const guideHandle = await docsDir.getFileHandle('design-guide.md', { create: true });
      const guideWritable = await guideHandle.createWritable();
      await guideWritable.write(designGuideContent);
      await guideWritable.close();

      this._notify(t('notify.exportedHtml'), 'success');
      return true;
    } catch (err) {
      if (err.name === 'AbortError') return false;
      this._notify(tFormat(t('notify.error'), err.message), 'error');
      return false;
    }
  }

  /* ─── Fallback (download JSON) ─── */

  _fallbackSave(data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.name || 'blueprint'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this._notify(t('notify.jsonFallback'), 'info');
  }

  _fallbackLoad() {
    this._notify(t('notify.jsonLoadHint'), 'info');
    return null;
  }

  /* ─── Generators ─── */

  _generateDocIndex(data) {
    let md = `# ${data.name || t('export.indexTitle')}\n\n`;
    md += `> ${t('export.autoGenerated')}\n\n`;
    md += `## ${t('export.nodesSection')}\n\n`;
    md += `| ${t('export.tableOrder')} | ${t('export.tableName')} | ${t('export.tableType')} | ${t('export.tableStatus')} | ${t('export.tableDescription')} | ${t('export.interfaces')} |\n`;
    md += `|---|---|---|---|---|---|\n`;

    const sortedNodes = [...data.nodes].sort((a, b) => (a.implementationOrder || 0) - (b.implementationOrder || 0));

    for (const node of sortedNodes) {
      const order = node.implementationOrder || '-';
      const desc = (node.description || '').substring(0, 60).replace(/\n/g, ' ');
      const label = getTemplateLabel(node.type);
      const status = node.implementationStatus || 'pending';
      const statusLabel = t(`status.${status}`) || status;
      let iface = '';
      if (node.interfaces) {
        const parts = [];
        if (node.interfaces.figma) parts.push(`[Figma](${node.interfaces.figma})`);
        if (node.interfaces.html) parts.push(`[HTML](${node.interfaces.html})`);
        iface = parts.join(', ');
      }
      md += `| ${order} | [${node.name}](docs/${node.name.replace(/[<>:"\/\\|?*]/g, '_').replace(/\s+/g, '_')}.md) | ${label} | ${statusLabel} | ${desc} | ${iface} |\n`;
    }

    md += `\n## ${t('export.edgesSection')}\n\n`;
    md += `| ${t('export.tableFrom')} | ${t('export.tableTo')} | ${t('export.tableDescription')} |\n`;
    md += `|---|---|---|\n`;

    for (const edge of data.edges) {
      const fromNode = data.nodes.find(n => n.id === edge.fromNode);
      const toNode = data.nodes.find(n => n.id === edge.toNode);
      const fromName = fromNode ? fromNode.name : edge.fromNode;
      const toName = toNode ? toNode.name : edge.toNode;
      const desc = (edge.description || '').substring(0, 60).replace(/\n/g, ' ');
      md += `| ${fromName} | ${toName} | ${desc} |\n`;
    }

md += `\n## ${t('export.diagramSection')}\n\n`;
md += `\`\`\`\n`;
const flowNodes = [...data.nodes].sort((a, b) => (a.implementationOrder || 0) - (b.implementationOrder || 0));
md += `${t('export.flow')}: ${flowNodes.map(n => n.name).join(' → ')}\n`;
md += `\`\`\`\n`;

    md += `\n## ${t('export.designGuide')}\n\n`;
    md += `[${t('export.designGuide')}](docs/design-guide.md)\n`;

    return md;
  }

  _generateLLMContext(data) {
    const sortedNodes = [...(data.nodes || [])].sort((a, b) => (a.implementationOrder || 0) - (b.implementationOrder || 0));
    const edges = data.edges || [];

    let md = `# ${t('llm.title', data.name || t('app.untitled'))}\n\n`;
    md += `> ${t('llm.autoGenerated')}\n\n`;

    md += `## ${t('llm.instructions')}\n\n`;
    md += `${t('llm.instructionsText')}\n\n`;

    md += `## ${t('llm.orderTable')}\n\n`;
    md += `| ${t('export.tableOrder')} | ${t('export.tableName')} | ${t('export.tableType')} | ${t('export.tableStatus')} | ${t('export.tableDescription')} |\n`;
    md += `|---|---|---|---|---|\n`;

    for (const node of sortedNodes) {
      const order = node.implementationOrder || '-';
      const desc = (node.description || '').substring(0, 60).replace(/\n/g, ' ');
      const label = getTemplateLabel(node.type);
      const status = node.implementationStatus || 'pending';
      const statusLabel = t(`status.${status}`) || status;
      const safeName = node.name.replace(/[<>:"\/\\|?*]/g, '_').replace(/\s+/g, '_');
      md += `| ${order} | [${node.name}](docs/${safeName}.md) | ${label} | ${statusLabel} | ${desc} |\n`;
    }

    md += `\n## ${t('llm.diary')}\n\n`;

    for (const node of sortedNodes) {
      const status = node.implementationStatus || 'pending';
      const statusLabel = t(`status.${status}`) || status;
      md += `### ${node.implementationOrder ? node.implementationOrder + '. ' : ''}${node.name} — ${statusLabel}\n\n`;
      if (node.diary && node.diary.length > 0) {
        md += `| ${t('export.diaryDate')} | ${t('export.diaryNote')} |\n`;
        md += `|---|---|\n`;
        for (const entry of node.diary) {
          const d = new Date(entry.timestamp).toLocaleString();
          md += `| ${d} | ${entry.note.replace(/\n/g, ' ')} |\n`;
        }
      } else {
        md += `${t('llm.noDiaryEntries')}\n`;
      }
      md += `\n`;
    }

    md += `## ${t('llm.connections')}\n\n`;
    md += `| ${t('export.tableFrom')} | ${t('export.tableTo')} | ${t('export.tableDescription')} |\n`;
    md += `|---|---|---|\n`;
    for (const edge of edges) {
      const fromNode = data.nodes.find(n => n.id === edge.fromNode);
      const toNode = data.nodes.find(n => n.id === edge.toNode);
      const fromName = fromNode ? fromNode.name : edge.fromNode;
      const toName = toNode ? toNode.name : edge.toNode;
      const desc = (edge.description || '').substring(0, 60).replace(/\n/g, ' ');
      md += `| ${fromName} | ${toName} | ${desc} |\n`;
    }

    md += `\n## ${t('llm.systemDiagram')}\n\n`;
    md += '```mermaid\n';
    md += 'flowchart LR\n';
    for (const node of sortedNodes) {
      const safeId = 'N' + node.id.replace(/[^a-zA-Z0-9]/g, '_');
      md += `  ${safeId}["${node.name}"]\n`;
    }
    for (const edge of edges) {
      const fromSafe = 'N' + edge.fromNode.replace(/[^a-zA-Z0-9]/g, '_');
      const toSafe = 'N' + edge.toNode.replace(/[^a-zA-Z0-9]/g, '_');
      const edgeLabel = edge.label || edge.type;
      md += `  ${fromSafe} -->|${edgeLabel}| ${toSafe}\n`;
    }
    md += '```\n\n';

    md += `\n## ${t('llm.designGuide')}\n\n`;
    md += `[${t('export.designGuide')}](docs/design-guide.md)\n`;

    return md;
  }

  _generateStaticSite(data) {
    const nodes = data.nodes || [];
    const edges = data.edges || [];
    const lang = getCurrentLang();

    let navItems = nodes.map(n => {
      const safeName = n.name.replace(/[<>:"\/\\|?*]/g, '_').replace(/\s+/g, '_');
      return `<li><a href="docs/${safeName}.md">${n.name}</a></li>`;
    }).join('\n');

    let edgeList = edges.map(e => {
      const fromNode = nodes.find(n => n.id === e.fromNode);
      const toNode = nodes.find(n => n.id === e.toNode);
      return `<li>${fromNode ? fromNode.name : e.fromNode} → ${toNode ? toNode.name : e.toNode}</li>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${data.name || t('export.indexTitle')}</title>
<style>
  :root { --bg: #1a1a2e; --surface: #16213e; --text: #e0e0e0; --muted: #606080; --accent: #64B5F6; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); display: flex; min-height: 100vh; }
  nav { width: 260px; background: var(--surface); padding: 20px; border-right: 1px solid #2a2a4a; }
  nav h2 { font-size: 14px; color: var(--muted); margin: 16px 0 8px; text-transform: uppercase; }
  nav ul { list-style: none; }
  nav a { display: block; padding: 6px 0; color: var(--accent); text-decoration: none; font-size: 13px; }
  nav a:hover { text-decoration: underline; }
  main { flex: 1; padding: 32px; max-width: 800px; }
  h1 { color: var(--accent); margin-bottom: 8px; }
  .meta { color: var(--muted); font-size: 13px; margin-bottom: 24px; }
  .stats { display: flex; gap: 16px; margin-bottom: 24px; }
  .stat { background: var(--surface); padding: 12px 20px; border-radius: 6px; }
  .stat-value { font-size: 24px; font-weight: bold; color: var(--accent); }
  .stat-label { font-size: 11px; color: var(--muted); }
</style>
</head>
<body>
<nav>
  <h2>${data.name || t('export.indexTitle')}</h2>
  <p style="font-size:12px;color:var(--muted);margin-bottom:16px">${nodes.length} ${t('export.statsNodes')}, ${edges.length} ${t('export.statsEdges')}</p>
  <h2>${t('export.nodesLabel')}</h2>
  <ul>${navItems}</ul>
  <h2 style="margin-top:20px">${t('export.edgesLabel')}</h2>
  <ul style="font-size:12px;color:var(--muted)">${edgeList || '<li>' + t('export.noEdges') + '</li>'}</ul>
  <h2 style="margin-top:20px">${t('export.designGuide')}</h2>
  <ul style="font-size:12px"><li><a href="docs/design-guide.md">${t('export.designGuide')}</a></li></ul>
</nav>
<main>
  <h1>${data.name || t('export.indexTitle')}</h1>
  <p class="meta">${t('export.staticTitle')}</p>
  <div class="stats">
    <div class="stat"><div class="stat-value">${nodes.length}</div><div class="stat-label">${t('export.nodesLabel')}</div></div>
    <div class="stat"><div class="stat-value">${edges.length}</div><div class="stat-label">${t('export.edgesLabel')}</div></div>
  </div>
</main>
</body>
</html>`;
  }

  /* ─── Templates ─── */

  getTemplates() {
    return [
      { id: 'blank', name: t('template.blank'), data: null },
      {
        id: 'simple-process',
        name: t('template.simpleProcess'),
        data: () => this._generateTemplate('simple-process')
      },
      {
        id: 'decision-tree',
        name: t('template.decisionTree'),
        data: () => this._generateTemplate('decision-tree')
      },
      {
        id: 'pipeline',
        name: t('template.pipeline'),
        data: () => this._generateTemplate('pipeline')
      },
      {
        id: 'scientific-calculator',
        name: t('template.calculator'),
        data: () => this._generateTemplate('scientific-calculator')
      }
    ];
  }

  applyTemplate(templateId, graph) {
    const template = this.getTemplates().find(t => t.id === templateId);
    if (!template || !template.data) return;
    const data = template.data();
    if (data) {
      graph.clear();
      graph.fromJSON(data);
    }
  }

  _generateTemplate(type) {
    if (type === 'simple-process') {
      const graph = { nodes: [], edges: [], nextNodeId: 1, nextEdgeId: 1 };
      const n1 = this._addNodeData(graph, 'Start', 100, 200, 'Inicio');
      const n2 = this._addNodeData(graph, 'Process', 320, 200, 'Procesar Datos');
      const n3 = this._addNodeData(graph, 'Decision', 540, 200, '¿Es válido?');
      const n4 = this._addNodeData(graph, 'Process', 760, 140, 'Procesar OK');
      const n5 = this._addNodeData(graph, 'Process', 760, 280, 'Corregir Error');
      const n6 = this._addNodeData(graph, 'End', 960, 200, 'Fin');
      this._addEdgeData(graph, n1, 'out', n2, 'in');
      this._addEdgeData(graph, n2, 'out', n3, 'in');
      this._addEdgeData(graph, n3, 'yes', n4, 'in');
      this._addEdgeData(graph, n3, 'no', n5, 'in');
      this._addEdgeData(graph, n4, 'out', n6, 'in');
      this._addEdgeData(graph, n5, 'out', n2, 'in');
      return graph;
    }

    if (type === 'decision-tree') {
      const graph = { nodes: [], edges: [], nextNodeId: 1, nextEdgeId: 1 };
      const n1 = this._addNodeData(graph, 'Start', 300, 50, 'Inicio Evaluación');
      const n2 = this._addNodeData(graph, 'Decision', 300, 180, '¿Opción A?');
      const n3 = this._addNodeData(graph, 'Process', 100, 330, 'Implementar A');
      const n4 = this._addNodeData(graph, 'Decision', 500, 330, '¿Opción B?');
      const n5 = this._addNodeData(graph, 'Process', 300, 480, 'Implementar B');
      const n6 = this._addNodeData(graph, 'Process', 500, 480, 'Implementar C');
      const n7 = this._addNodeData(graph, 'End', 300, 620, 'Fin');
      this._addEdgeData(graph, n1, 'out', n2, 'in');
      this._addEdgeData(graph, n2, 'yes', n3, 'in');
      this._addEdgeData(graph, n2, 'no', n4, 'in');
      this._addEdgeData(graph, n4, 'yes', n5, 'in');
      this._addEdgeData(graph, n4, 'no', n6, 'in');
      this._addEdgeData(graph, n3, 'out', n7, 'in');
      this._addEdgeData(graph, n5, 'out', n7, 'in');
      this._addEdgeData(graph, n6, 'out', n7, 'in');
      return graph;
    }

    if (type === 'pipeline') {
      const graph = { nodes: [], edges: [], nextNodeId: 1, nextEdgeId: 1 };
      const n1 = this._addNodeData(graph, 'Start', 100, 250, 'Data Ingestion');
      const n2 = this._addNodeData(graph, 'Process', 320, 250, 'Preprocessing');
      const n3 = this._addNodeData(graph, 'Document', 320, 120, 'Data Dictionary');
      const n4 = this._addNodeData(graph, 'Process', 540, 250, 'Feature Engineering');
      const n5 = this._addNodeData(graph, 'Decision', 760, 250, '¿Modelo OK?');
      const n6 = this._addNodeData(graph, 'Process', 540, 400, 'Entrenar Modelo');
      const n7 = this._addNodeData(graph, 'Process', 760, 400, 'Evaluación');
      const n8 = this._addNodeData(graph, 'Document', 980, 250, 'Reporte Final');
      const n9 = this._addNodeData(graph, 'End', 980, 120, 'Deploy');
      this._addEdgeData(graph, n1, 'out', n2, 'in');
      this._addEdgeData(graph, n2, 'out', n3, 'in');
      this._addEdgeData(graph, n2, 'out', n4, 'in');
      this._addEdgeData(graph, n4, 'out', n5, 'in');
      this._addEdgeData(graph, n5, 'yes', n8, 'in');
      this._addEdgeData(graph, n5, 'no', n6, 'in');
      this._addEdgeData(graph, n6, 'out', n7, 'in');
      this._addEdgeData(graph, n7, 'out', n5, 'in');
      this._addEdgeData(graph, n8, 'out', n9, 'in');
      return graph;
    }

    if (type === 'scientific-calculator') {
      const graph = { nodes: [], edges: [], nextNodeId: 1, nextEdgeId: 1, designGuide:
`# Guía de Diseño — Calculadora Científica

## Colores
- **Primario**: #1565C0 (azul científico)
- **Secundario**: #00BCD4 (cian tecnológico)
- **Fondo**: #1a1a2e (oscuro) / #f5f5f5 (claro)
- **Display**: #001a00 con texto #00E676 (efecto terminal)
- **Funciones**: #FF6F00 (naranja)

## Tipografía
- **Display**: 'Cascadia Code', monospace, 28px
- **Botones**: 'Segoe UI', sans-serif, 16px
- **Historial**: 'Consolas', monospace, 12px

## Botonera
4 columnas, botones 48×48px, border-radius 8px.
Modo científico añade 2 filas extra con funciones.
` };

      const _add = (type, x, y, name, parent, doc, desc) => {
        const tmpl = getTemplate(type);
        const id = `node_${graph.nextNodeId++}`;
        const node = {
          id, type, name, x, y,
          width: tmpl.width, height: tmpl.height,
          doc: doc || generateDocFromTemplate(type, name),
          description: desc || ''
        };
        if (type === 'Screen') { node.children = []; node.interfaces = { figma: '', html: '' }; }
        if (parent) { node.parentScreen = parent; }
        graph.nodes.push(node);
        if (parent) {
          const p = graph.nodes.find(n => n.id === parent);
          if (p && p.children) p.children.push(id);
        }
        return id;
      };

      const _edge = (from, fromPin, to, toPin, type, doc, desc, label) => {
        const id = `edge_${graph.nextEdgeId++}`;
        graph.edges.push({ id, fromNode: from, fromPin, toNode: to, toPin,
          type: type || 'data-flow',
          doc: doc || '', description: desc || '', label: label || ''
        });
      };

      const sMain = _add('Screen', 350, 60, 'Pantalla Principal', null,
`# Pantalla Principal

## Descripción
Pantalla principal de la calculadora donde el usuario realiza todas las operaciones.

## Layout
- **Área superior**: Display de doble línea (expresión + resultado)
- **Área media**: Botonera completa con dígitos y operadores
- **Área inferior**: Indicador de modo (científico/estándar)

## Elementos incluidos
- **Display**: Muestra la entrada y el resultado en tiempo real
- **Botonera**: 30+ botones distribuidos en grid 4×N
- **Indicadores**: Separador de miles, modo DEG/RAD, memoria activa

## Interacciones
- Tap en botón numérico → añade dígito al display
- Tap en operador → prepara la operación
- Deslizar izquierda → abre el historial
- Botón engranaje → abre configuración
- Botón SCI → expande botonera con funciones científicas`,
        'Interfaz principal con display y botonera');

      const nDisplay = _add('Process', 410, 100, 'Display Calculadora', sMain,
`# Display Calculadora

## Descripción
Componente visual que ocupa la zona superior de la pantalla principal y muestra la interacción del usuario en tiempo real.

## Funcionamiento
Gestiona dos líneas de información:
- **Línea superior (secundaria)**: Muestra la expresión completa a medida que se escribe (ej: "12 + 34 ×")
- **Línea inferior (principal)**: Muestra el último valor introducido o el resultado (fuente más grande, 28px)

## Estados visuales
| Estado | Apariencia | Cuándo ocurre |
|--------|-----------|---------------|
| Normal | Fondo oscuro, texto verde neón | Entrada de datos |
| Resultado | Texto más brillante, animación sutil | Tras pulsar = |
| Error | Texto rojo, parpadeo | Math Error / Syntax Error |
| Memoria | Indicador 'M' en esquina | Cuando hay valor en memoria |

## Entradas
- **In (desde Evaluador)**: Resultado numérico a mostrar

## Salidas
- **Out (hacia Botonera)**: Confirmación de renderizado`,
        'Muestra expresión y resultado con formato tipo terminal');

      const nBotonera = _add('Process', 410, 180, 'Botonera Principal', sMain,
`# Botonera Principal

## Descripción
Conjunto completo de botones dispuestos en una cuadrícula de 4 columnas.

## Distribución (modo estándar)

| Fila | Col 1 | Col 2 | Col 3 | Col 4 |
|------|-------|-------|-------|-------|
| 1 | C | ± | % | ÷ |
| 2 | 7 | 8 | 9 | × |
| 3 | 4 | 5 | 6 | − |
| 4 | 1 | 2 | 3 | + |
| 5 | 0 (×2) | . | SCI | = |

## Modo científico (SCI activado)
Se añaden 2 filas extra:

| Fila | Col 1 | Col 2 | Col 3 | Col 4 |
|------|-------|-------|-------|-------|
| 6 | sin | cos | tan | ( ) |
| 7 | log | ln | √ | x! |

## Tipos de botón
- **Numéricos** (blanco): 0-9, punto decimal
- **Operadores** (azul): +, −, ×, ÷, %
- **Funciones** (naranja): sin, cos, tan, log, ln, √
- **Control** (rojo): C (limpiar), ± (signo)
- **Igual** (verde): = ejecuta la operación`,
        'Grid de 30+ botones numéricos, operadores y funciones');

      const nInput = _add('Process', 410, 260, 'Manejador Input', sMain,
`# Manejador Input

## Descripción
Captura cada pulsación de botón y gestiona el buffer de entrada aplicando reglas de validación en tiempo real.

## Reglas de validación
- No permitir dos operadores consecutivos (ej: "++" se ignora)
- Un solo punto decimal por número (segundo punto se ignora)
- Gestión automática del signo negativo
- Prevención de división por cero en tiempo real

## Máquina de estados del buffer

\`\`\`
           ┌─────────┐
           │  VACÍO   │ ←── Inicio / después de =
           └────┬────┘
                │ pulsa dígito
           ┌────▼────┐
           │ NÚMERO  │ ←── acumulando dígitos
           └────┬────┘
                │ pulsa operador
           ┌────▼────┐
           │ OPERADOR│ ←── esperando segundo operando
           └────┬────┘
                │ pulsa dígito
           ┌────▼────┐
           │ NÚMERO  │ (ciclo)
           └────┬────┘
                │ pulsa =
           ┌────▼────┐
           │ RESULT. │ → se envía al parser
           └─────────┘
\`\`\`

## Salida
- **Out**: Token o comando ya validado hacia el Parser`,
        'Valida y gestiona el buffer de entrada del usuario');

      const sHistory = _add('Screen', 950, 60, 'Pantalla Historial', null,
`# Pantalla Historial

## Descripción
Panel lateral deslizable que muestra el registro cronológico de todas las operaciones realizadas.

## Comportamiento
- Aparece deslizando desde la derecha o pulsando el botón 📋
- Cada entrada muestra: \`expresión → resultado\`
- Máximo 50 entradas (las más antiguas se descartan)
- Persistente en localStorage entre sesiones

## Interacciones
- **Tap en un ítem**: Carga la expresión en el display principal y cierra el panel
- **Tap sostenido**: Muestra el resultado completo si está truncado
- **Botón "Limpiar"**: Vacía todo el historial (con confirmación)
- **Deslizar hacia abajo**: Cierra el panel

## Formato de cada entrada
| Componente | Descripción |
|------------|-------------|
| Timestamp | Hora de la operación (formato 24h) |
| Expresión | La operación completa (ej: "sin(45) + 12 × 3") |
| Resultado | El valor numérico resultante |
| Estado | OK / Error según corresponda`,
        'Panel histórico de operaciones realizadas');

      const nHistoryList = _add('Process', 1010, 120, 'Lista Historial', sHistory,
`# Lista Historial

## Descripción
Componente interno que renderiza la lista de operaciones dentro del panel de historial.

## Funcionamiento
- Recibe nuevas entradas desde el Gestor de Historial
- Renderiza cada entrada siguiendo el formato definido
- Aplica scroll virtual si hay más de 20 entradas visibles
- Gestiona la eliminación de entradas antiguas (FIFO)

## Estructura de datos
\`\`\`js
{
  id: number,            // autoincremental
  timestamp: Date,       // momento de la operación
  expression: string,    // "45 + 12"
  result: number,        // 57
  status: 'ok' | 'error' // si la operación fue exitosa
}
\`\`\`

## Persistencia
Clave en localStorage: \`calc_history\`
Formato: JSON array de entradas, limitado a 50`,
        'Renderiza y gestiona la lista de operaciones');

      const sSettings = _add('Screen', 950, 360, 'Pantalla Configuración', null,
`# Pantalla Configuración

## Descripción
Pantalla de preferencias del usuario para personalizar la calculadora.

## Opciones disponibles

### Apariencia
- **Modo oscuro / claro**: Conmuta entre tema oscuro (#1a1a2e) y claro (#f5f5f5)
- **Tamaño de fuente**: Pequeña / Normal / Grande (afecta al display)

### Precisión
- **Decimales**: 0, 2, 4, 8 dígitos (por defecto: 4)
- **Redondeo**: Truncar / Redondear / Científico (notación exponencial automática)

### Comportamiento
- **Sonido de teclas**: ON / OFF
- **Vibración (móvil)**: ON / OFF
- **Separador de miles**: ON / OFF
- **Modo DEG/RAD**: Grados o Radianes (para funciones trigonométricas)

### Datos
- **Resetear historial**: Vacía todo el historial guardado
- **Restaurar valores**: Vuelve a la configuración de fábrica

## Diseño
- Formulario de una columna con secciones agrupadas
- Cada opción es un toggle o selector
- Los cambios se aplican en tiempo real (sin botón "Guardar")`,
        'Preferencias de apariencia, precisión y comportamiento');

      const nMode = _add('Decision', 1010, 420, 'Selector Modo', sSettings,
`# Selector Modo

## Decisión
¿Está activado el modo oscuro?

## Criterio
El usuario ha activado el toggle "Modo oscuro" en la pantalla de configuración.

## Ramas
- **Sí (yes)**: Aplica el tema oscuro — fondo #1a1a2e, texto #e0e0e0
- **No (no)**: Aplica el tema claro — fondo #f5f5f5, texto #212121

## Efectos secundarios
- Cambia las variables CSS del documento
- Persiste la preferencia en localStorage (\`calc_dark_mode\`)
- El cambio es inmediato y no requiere recarga`,
        'Conmuta entre tema oscuro y claro');

      const nPrefs = _add('Document', 1010, 530, 'Preferencias', sSettings,
`# Preferencias

## Contenido
Documento interno de configuración que persiste las opciones del usuario.

## Estructura del documento
\`\`\`json
{
  "darkMode": true,
  "fontSize": "normal",
  "decimals": 4,
  "rounding": "half-up",
  "sound": false,
  "vibration": true,
  "thousandsSeparator": true,
  "angleMode": "deg",
  "scientificMode": false
}
\`\`\`

## Formato de persistencia
- **Almacenamiento**: localStorage
- **Clave**: \`calc_preferences\`
- **Formato**: JSON stringify
- **Migración**: Si falta una clave, se usa el valor por defecto

## Referencias
- Ver [Selector Modo] para la lógica de tema
- Ver [Pantalla Configuración] para la UI de opciones`,
        'Documento JSON de configuración del usuario');

      const nStart = _add('Start', 130, 750, 'Inicio App', null,
`# Inicio App

## Propósito
Punto de entrada de la aplicación. Se ejecuta una sola vez al cargar la página.

## Secuencia de arranque
1. Cargar preferencias guardadas desde localStorage
2. Inicializar el motor de cálculo (parser + evaluador)
3. Restaurar el historial desde localStorage
4. Renderizar la UI con el tema seleccionado
5. Colocar el foco en el display (listo para entrada táctil/teclado)

## Condiciones previas
- El navegador soporta ES2020+ (BigInt, optional chaining)
- localStorage disponible
- Sin dependencias externas (vanilla JS)

## Salidas
- **Out**: Señal de inicialización completa hacia el Parser`,
        'Inicialización de la calculadora al cargar la página');

      const nParser = _add('Process', 350, 750, 'Parser Expresiones', null,
`# Parser Expresiones

## Descripción
Analizador sintáctico que convierte la cadena de texto introducida por el usuario en una estructura de datos evaluable (AST).

## Algoritmo: Shunting-yard (Dijkstra)

El parser implementa el algoritmo de patio de maniobras para convertir de notación infija a postfija (RPN).

### Entrada: "3 + 5 × sin(45)"
### Salida: [3, 5, 45, sin, ×, +]

## Fases del parseo

### 1. Tokenización
\`\`\`
"3+5×sin(45)" → ["3", "+", "5", "×", "sin", "(", "45", ")"]
\`\`\`

### 2. Clasificación
| Token | Tipo |
|-------|------|
| 3, 5, 45 | Literal numérico |
| +, −, ×, ÷ | Operador binario (2 precedence) |
| sin, cos, log | Función unaria |
| ( , ) | Paréntesis |

### 3. Construcción del AST
\`\`\`
      ×
     / \\
    3   sin
         |
        45
\`\`\`

## Tokens soportados
- **Numéricos**: 0-9, punto decimal, notación científica (1.5e3)
- **Operadores**: +, −, ×, ÷, %, ^
- **Funciones**: sin, cos, tan, asin, acos, atan, log, ln, sqrt, cbrt, abs, floor, ceil, round, exp, fact
- **Símbolos**: π (pi), e (constante), ( ), ±

## Entrada
- **In**: Cadena de texto cruda desde el Manejador Input

## Salida
- **Out**: AST (Array en notación postfija) hacia el Evaluador`,
        'Analiza y tokeniza expresiones matemáticas (Shunting-yard)');

      const nEval = _add('Process', 590, 750, 'Evaluador', null,
`# Evaluador

## Descripción
Módulo central que recibe el AST del parser y ejecuta las operaciones en el orden correcto para producir un resultado numérico.

## Algoritmo: Evaluación RPN (postfija)

Recorre el array de tokens en orden y usa una pila para resolver las operaciones.

### Funcionamiento
\`\`\`
Input: [3, 5, 45, sin, ×, +]
Pila: []
  ↑ 3  → push(3)       → [3]
  ↑ 5  → push(5)       → [3, 5]
  ↑ 45 → push(45)      → [3, 5, 45]
  ↑ sin → pop(45) → sin(45)=0.85 → push(0.85) → [3, 5, 0.85]
  ↑ ×   → pop(5), pop(0.85) → 5×0.85=4.26 → push(4.26) → [3, 4.26]
  ↑ +   → pop(3), pop(4.26) → 3+4.26=7.26 → push(7.26) → [7.26]
Resultado: 7.26
\`\`\`

## Manejo de errores
| Error | Causa | Mensaje |
|-------|-------|---------|
| DivByZero | Divisor = 0 | "Math Error" |
| SqrtNegative | sqrt(x) con x < 0 | "Math Error" |
| LogDomain | log/ln con x ≤ 0 | "Math Error" |
| SyntaxError | Expresión mal formada | "Syntax Error" |
| Overflow | Resultado > 1e308 | "Overflow" |
| FactDomain | factorial de no entero o > 170 | "Math Error" |

## Entrada
- **In**: AST desde el Parser, o valor desde Memoria (MR)

## Salidas
- **Out (→ Display)**: Resultado numérico formateado
- **Out (→ Aritméticas)**: Si hay operadores básicos
- **Out (→ Selector Función)**: Si hay funciones científicas
- **Out (→ Memoria)**: Valor a almacenar (M+, MS)
- **Out (→ Gestor Historial)**: Operación completa para registro
- **Out (→ Fin)**: Señal de operación completada`,
        'Evalúa el AST y produce el resultado aplicando precedencia');

      const nArith = _add('Process', 350, 870, 'Operaciones Aritméticas', null,
`# Operaciones Aritméticas

## Descripción
Módulo que implementa las operaciones binarias básicas con precisión de punto flotante IEEE 754 (64-bit).

## Operaciones

| Operación | Símbolo | Implementación | Precedencia |
|-----------|---------|---------------|-------------|
| Suma | + | \`a + b\` | 1 (baja) |
| Resta | − | \`a - b\` | 1 (baja) |
| Multiplicación | × | \`a * b\` | 2 (media) |
| División | ÷ | \`a / b\` | 2 (media) |
| Módulo | % | \`a % b\` | 2 (media) |
| Potencia | ^ | \`Math.pow(a, b)\` | 3 (alta) |

## Precisión
- Se evita el error clásico de punto flotante con redondeo bancario
- Ej: 0.1 + 0.2 = 0.3 (no 0.30000000000000004)
- El número de decimales visibles lo define la configuración

## Entrada
- **In**: Dos operandos y un operador desde el Evaluador

## Salida
- **Out**: Resultado parcial de vuelta al Evaluador

## Edge cases
- División por cero → no se procesa, se devuelve error al Evaluador
- 0^0 → 1 (convención matemática estándar)
- Inf − Inf → NaN (se muestra como "Math Error")`,
        'Operaciones binarias: +, −, ×, ÷, %, ^');

      const nFuncSel = _add('Decision', 590, 870, 'Selector Función', null,
`# Selector Función

## Decisión
¿El token actual corresponde a una función trigonométrica?

## Criterio de evaluación
Se inspecciona el nombre del token recibido:

\`\`\`js
const trigFunctions = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan'];
const logFunctions  = ['log', 'ln', 'sqrt', 'cbrt', 'abs', 'floor', 'ceil', 'round', 'exp', 'fact'];

if (trigFunctions.includes(token)) → rama SÍ
else if (logFunctions.includes(token)) → rama NO
\`\`\`

## Ramas
- **Sí (yes)**: Enrutar a Funciones Trigonométricas — recibe: nombre + argumento
- **No (no)**: Enrutar a Funciones Logarítmicas — recibe: nombre + argumento

## Notas
- Las funciones trigonométricas respetan el modo DEG/RAD configurado
- Si el token no pertenece a ninguna categoría, se devuelve Syntax Error`,
        'Enruta a trigonométricas o logarítmicas según el token');

      const nTrig = _add('Process', 300, 980, 'Funciones Trigonométricas', null,
`# Funciones Trigonométricas

## Descripción
Ejecuta funciones trigonométricas y sus inversas, respetando la configuración DEG/RAD.

## Funciones implementadas

| Función | Descripción | Fórmula |
|---------|-------------|---------|
| sin(x) | Seno | \`Math.sin(radians)\` |
| cos(x) | Coseno | \`Math.cos(radians)\` |
| tan(x) | Tangente | \`Math.tan(radians)\` |
| asin(x) | Arco seno | \`Math.asin(x)\` |
| acos(x) | Arco coseno | \`Math.acos(x)\` |
| atan(x) | Arco tangente | \`Math.atan(x)\` |

## Conversión DEG ↔ RAD
- **DEG → RAD**: \`rad = deg × π / 180\`
- **RAD → DEG**: \`deg = rad × 180 / π\`

## Dominios y restricciones
| Función | Dominio | Rango | Notas |
|---------|---------|-------|-------|
| sin(x) | ℝ | [−1, 1] | |
| cos(x) | ℝ | [−1, 1] | |
| tan(x) | x ≠ π/2 + kπ | ℝ | Asíntotas verticales |
| asin(x) | [−1, 1] | [−π/2, π/2] | Fuera de dominio → NaN |
| acos(x) | [−1, 1] | [0, π] | Fuera de dominio → NaN |
| atan(x) | ℝ | (−π/2, π/2) | |

## Entrada
- **In**: Nombre de función + argumento numérico

## Salida
- **Out**: Resultado trigonométrico de vuelta al Evaluador`,
        'sin, cos, tan, asin, acos, atan con soporte DEG/RAD');

      const nLog = _add('Process', 590, 980, 'Funciones Logarítmicas', null,
`# Funciones Logarítmicas

## Descripción
Ejecuta funciones logarítmicas, de raíz y otras funciones especiales.

## Funciones implementadas

| Función | Descripción | Fórmula |
|---------|-------------|---------|
| log(x) | Logaritmo base 10 | \`Math.log10(x)\` |
| ln(x) | Logaritmo natural | \`Math.log(x)\` |
| sqrt(x) | Raíz cuadrada | \`Math.sqrt(x)\` |
| cbrt(x) | Raíz cúbica | \`Math.cbrt(x)\` |
| exp(x) | Exponencial e^x | \`Math.exp(x)\` |
| abs(x) | Valor absoluto | \`Math.abs(x)\` |
| floor(x) | Redondeo hacia abajo | \`Math.floor(x)\` |
| ceil(x) | Redondeo hacia arriba | \`Math.ceil(x)\` |
| round(x) | Redondeo matemático | \`Math.round(x)\` |
| fact(x) | Factorial | Producto 1×2×...×x |

## Dominios y restricciones
| Función | Dominio | Notas |
|---------|---------|-------|
| log, ln | x > 0 | Error si x ≤ 0 |
| sqrt | x ≥ 0 | Error si x < 0 |
| cbrt | ℝ | Acepta negativos |
| fact | ℕ, x ≤ 170 | Error si no entero o > 170 |
| exp | ℝ | |
| abs, floor, ceil, round | ℝ | |

## Entrada
- **In**: Nombre de función + argumento numérico

## Salida
- **Out**: Resultado de vuelta al Evaluador`,
        'log, ln, sqrt, cbrt, exp, fact, abs, floor, ceil, round');

      const nMem = _add('Process', 800, 870, 'Memoria', null,
`# Memoria

## Descripción
Componente de almacenamiento temporal de un único valor numérico accesible entre operaciones.

## Operaciones

| Comando | Función | Comportamiento |
|---------|---------|----------------|
| **MC** | Memory Clear | Establece el valor guardado a \`null\` |
| **MR** | Memory Recall | Devuelve el valor guardado al evaluador |
| **M+** | Memory Add | Suma el resultado actual al valor guardado |
| **M−** | Memory Subtract | Resta el resultado actual al valor guardado |
| **MS** | Memory Store | Guarda el resultado actual (sobrescribe) |

## Comportamiento detallado

\`\`\`
Estado inicial: memoria = null

MS 45     → memoria = 45
M+ 10     → memoria = 55
M− 5      → memoria = 50
MR        → devuelve 50 al display
MC        → memoria = null (indicador M desaparece)
\`\`\`

## Indicador visual
- Cuando la memoria tiene un valor distinto de \`null\`, aparece un indicador "M" en el display
- El indicador desaparece al ejecutar MC

## Persistencia
- La memoria se mantiene mientras la app esté abierta
- NO persiste entre sesiones (a diferencia del historial)

## Entrada
- **In (desde Evaluador)**: Valor a almacenar (M+, M−, MS)

## Salida
- **Out (hacia Evaluador)**: Valor recuperado (MR)`,
        'MC, MR, M+, M−, MS — almacenamiento temporal de valores');

      const nHist = _add('Process', 800, 750, 'Gestor Historial', null,
`# Gestor Historial

## Descripción
Módulo que registra cada operación completada y gestiona la persistencia del historial.

## Ciclo de vida de una entrada

\`\`\`
1. Evaluador completa operación
2. Envía { expresión, resultado, estado } al Gestor
3. Gestor crea la entrada con timestamp
4. Añade al array en memoria (máx 50)
5. Persiste en localStorage
6. Emite evento de actualización hacia la UI
\`\`\`

## Formato interno de cada entrada
\`\`\`js
{
  id: Date.now(),          // timestamp como ID único
  expression: "sin(45) + 3", //原始表达式
  result: "3.7071",        // resultado formateado como string
  status: "ok",            // "ok" | "error"
  timestamp: "14:32:05"    // hora formateada
}
\`\`\`

## Persistencia
- Clave localStorage: \`calc_history\`
- Límite: 50 entradas (FIFO — las más antiguas se descartan)
- Formato: JSON.stringify

## Entrada
- **In**: Datos de la operación desde el Evaluador

## Salida
- **Out**: Entrada formateada hacia la Lista Historial (UI)`,
        'Registra, persiste y gestiona el histórico de operaciones');

      const nEnd = _add('End', 750, 645, 'Resultado Mostrado', null,
`# Resultado Mostrado

## Resultado final
El resultado de la operación se ha calculado y mostrado correctamente en el Display.

## Post-condiciones del sistema
1. ✅ Display actualizado con el resultado (formateado según configuración)
2. ✅ Historial actualizado con la nueva entrada
3. ✅ Memoria actualizada si se ejecutó M+ / M− / MS
4. ✅ Buffer de entrada listo para una nueva operación
5. ✅ Estado "resultado" activo (siguiente dígito inicia nueva operación)

## Estado del buffer tras el resultado
- Si el usuario pulsa un **dígito**: se inicia una nueva operación (el resultado anterior se pierde)
- Si el usuario pulsa un **operador**: se usa el resultado como primer operando
- Si el usuario pulsa **C**: se limpia todo`,
        'Operación completada — display e historial actualizados');

      _edge(sMain, 'out', sHistory, 'in', 'navigation',
`# Conexión: Pantalla Principal → Pantalla Historial

## Tipo: Navegación (navigation)

## Transición
El usuario accede al historial deslizando el dedo hacia la izquierda sobre el display, o pulsando el botón 📋 en la esquina superior derecha.

## Animación
- Slide horizontal de derecha a izquierda
- Duración: 300ms, easing cubic-bezier(0.4, 0, 0.2, 1)
- El panel del historial cubre ~60% de la pantalla`,
        'Deslizar izquierda o botón de historial', 'Abrir historial');

      _edge(sHistory, 'out', sMain, 'in', 'navigation',
`# Conexión: Pantalla Historial → Pantalla Principal

## Tipo: Navegación (navigation)

## Transiciones posibles
1. **Tap en un ítem**: Carga la expresión pulsada en el display y cierra el panel
2. **Deslizar hacia abajo**: Cierra el panel sin cargar nada
3. **Botón Cerrar**: Cierra el panel

## Acción adicional (caso 1)
Si se pulsa un ítem, la expresión se inyecta en el buffer del Manejador Input y se muestra en el display para que el usuario pueda modificarla o ejecutarla de nuevo.`,
        'Cerrar historial o cargar ítem', 'Cerrar');

      _edge(sMain, 'out', sSettings, 'in', 'navigation',
`# Conexión: Pantalla Principal → Pantalla Configuración

## Tipo: Navegación (navigation)

## Transición
El usuario pulsa el icono de engranaje ⚙ en la esquina superior izquierda de la pantalla principal.

## Animación
- El panel de configuración aparece como un modal centrado
- Fondo semitransparente (overlay)
- Escala de 0.9 → 1.0 con fade in (200ms)`,
        'Pulsar icono de ajustes', 'Abrir ajustes');

      _edge(sSettings, 'out', sMain, 'in', 'navigation',
`# Conexión: Pantalla Configuración → Pantalla Principal

## Tipo: Navegación (navigation)

## Transición
El usuario pulsa el botón "Volver" o "Cerrar" en la pantalla de configuración.

## Comportamiento
- Los cambios en las opciones se aplican en tiempo real
- No hay estado "sin guardar" — cada cambio persiste automáticamente
- Al volver, el display y la botonera reflejan el nuevo tema/configuración`,
        'Volver a la calculadora', 'Volver');

      _edge(nStart, 'out', nParser, 'in', 'data-flow',
`# Conexión: Inicio App → Parser Expresiones

## Tipo: Flujo de datos (data-flow)

## Descripción
Al cargar la aplicación, el Parser recibe la señal de inicialización para preparar sus tablas de tokens y reglas sintácticas.`,
        'Inicialización del parser');

      _edge(nInput, 'out', nParser, 'in', 'data-ui',
`# Conexión: Manejador Input → Parser Expresiones

## Tipo: Dato → UI (data-ui)

## Descripción
Cada pulsación de botón validada se envía como un token desde la interfaz de usuario al motor de parseo.

## Formato del mensaje
\`\`\`js
{ type: 'token', value: '3' | '+' | 'sin' | ... }
{ type: 'execute' }  // cuando se pulsa =
{ type: 'clear' }     // cuando se pulsa C
\`\`\`

## Flujo
1. Usuario pulsa botón en la Botonera Principal
2. Manejador Input valida y acumula en el buffer
3. Cuando se pulsa =, envía la cadena completa al Parser`,
        'Tokens de entrada desde la UI', 'Token');

      _edge(nParser, 'out', nEval, 'in', 'data-flow',
`# Conexión: Parser Expresiones → Evaluador

## Tipo: Flujo de datos (data-flow)

## Descripción
El AST en notación postfija (RPN) generado por el Parser se entrega al Evaluador para su ejecución.

## Formato del dato
\`\`\`js
// Expresión: "3 + 5 × 2"
[3, 5, 2, '×', '+']  // array de tokens en RPN
\`\`\``,
        'AST listo para evaluar', 'AST');

      _edge(nEval, 'out', nDisplay, 'in', 'data-ui',
`# Conexión: Evaluador → Display Calculadora

## Tipo: Dato → UI (data-ui)

## Descripción
El resultado numérico calculado se envía al componente Display para su renderizado visual.

## Formato
\`\`\`js
{
  value: 7.26,
  expression: "3 + 5 × sin(45)",
  status: "ok" | "error",
  errorMsg: "" | "Math Error"
}
\`\`\`

## Comportamiento del Display
- Si status === "ok": muestra el valor con formato (decimales, separador de miles)
- Si status === "error": muestra errorMsg en rojo`,
        'Resultado a mostrar en pantalla', 'Resultado');

      _edge(nEval, 'out', nArith, 'in', 'data-flow',
`# Conexión: Evaluador → Operaciones Aritméticas

## Tipo: Flujo de datos (data-flow)

## Descripción
Cuando el Evaluador encuentra un operador aritmético (+, −, ×, ÷, %, ^), delega la operación al módulo especializado.

## Datos enviados
\`\`\`js
{ op: '+', a: 3, b: 5 }
\`\`\``,
        'Operación básica detectada');

      _edge(nEval, 'out', nFuncSel, 'in', 'data-flow',
`# Conexión: Evaluador → Selector Función

## Tipo: Flujo de datos (data-flow)

## Descripción
Cuando el Evaluador encuentra un token de función (sin, cos, log, etc.), delega al Selector para determinar el tipo y enrutar al módulo correcto.`,
        'Función científica detectada');

      _edge(nFuncSel, 'yes', nTrig, 'in', 'data-flow',
`# Conexión: Selector Función → Trigonométricas

## Tipo: Flujo de datos (data-flow)

## Condición: Rama SÍ (yes)
El token coincide con una función trigonométrica: sin, cos, tan, asin, acos, atan.

## Datos
\`\`\`js
{ func: 'sin', arg: 45, angleMode: 'deg' }
\`\`\``,
        'sin/cos/tan/asin/acos/atan', 'Trig.');

      _edge(nFuncSel, 'no', nLog, 'in', 'data-flow',
`# Conexión: Selector Función → Logarítmicas

## Tipo: Flujo de datos (data-flow)

## Condición: Rama NO (no)
El token coincide con una función logarítmica o especial: log, ln, sqrt, cbrt, exp, abs, floor, ceil, round, fact.

## Datos
\`\`\`js
{ func: 'sqrt', arg: 144 }
\`\`\``,
        'log/ln/sqrt/fact/etc', 'Log.');

      _edge(nArith, 'out', nEval, 'in', 'data-flow',
`# Conexión: Operaciones Aritméticas → Evaluador

## Tipo: Flujo de datos (data-flow)

## Descripción
El resultado parcial de la operación aritmética regresa al Evaluador para continuar con la evaluación del resto de la expresión.`,
        'Resultado parcial', 'Resultado');

      _edge(nTrig, 'out', nEval, 'in', 'data-flow',
`# Conexión: Trigonométricas → Evaluador

## Tipo: Flujo de datos (data-flow)

## Descripción
El resultado de la función trigonométrica regresa al Evaluador para insertarse en la pila de evaluación RPN.`,
        'Valor trigonométrico calculado');

      _edge(nLog, 'out', nEval, 'in', 'data-flow',
`# Conexión: Logarítmicas → Evaluador

## Tipo: Flujo de datos (data-flow)

## Descripción
El resultado de la función logarítmica o especial regresa al Evaluador.`,
        'Valor logarítmico calculado');

      _edge(nMem, 'out', nEval, 'in', 'data-flow',
`# Conexión: Memoria → Evaluador

## Tipo: Flujo de datos (data-flow)

## Descripción
Cuando el usuario pulsa MR (Memory Recall), el valor almacenado en memoria se inyecta en el Evaluador como operando.

## Comportamiento
- Si memoria está vacía (null): se ignora, no se envía nada
- Si tiene valor: se inserta como literal numérico en la posición actual de la evaluación`,
        'Valor recuperado de memoria', 'MR');

      _edge(nEval, 'out', nMem, 'in', 'data-flow',
`# Conexión: Evaluador → Memoria

## Tipo: Flujo de datos (data-flow)

## Descripción
Cuando el usuario pulsa M+ o MS tras una operación, el resultado se envía al módulo de Memoria para su almacenamiento.

- **MS**: Sobrescribe el valor actual
- **M+**: Suma al valor actual
- **M−**: Resta al valor actual`,
        'Valor a almacenar', 'M+ / MS');

      _edge(nEval, 'out', nHist, 'in', 'data-flow',
`# Conexión: Evaluador → Gestor Historial

## Tipo: Flujo de datos (data-flow)

## Descripción
Cada operación completada se envía al Gestor de Historial para su registro y persistencia.

## Datos enviados
\`\`\`js
{
  expression: "sin(45) + 3",
  result: "3.7071",
  status: "ok"
}
\`\`\``,
        'Registrar en historial', 'Registrar');

      _edge(nHist, 'out', nHistoryList, 'in', 'data-ui',
`# Conexión: Gestor Historial → Lista Historial

## Tipo: Dato → UI (data-ui)

## Descripción
Cada nueva entrada del historial se envía desde el gestor a la UI de la lista de historial para su renderizado.

## Comportamiento
- Si la lista supera 50 entradas, se elimina la más antigua
- La lista se actualiza en tiempo real
- Si la pantalla de historial no está abierta, la UI se actualiza cuando se abra`,
        'Actualizar lista visual del historial');

      _edge(nEval, 'out', nEnd, 'in', 'data-flow',
`# Conexión: Evaluador → Resultado Mostrado

## Tipo: Flujo de datos (data-flow)

## Descripción
Señal de finalización: el resultado se ha calculado, mostrado en el display y registrado en el historial. El sistema queda listo para la siguiente operación.`,
        'Operación completada');

      return graph;
    }

    return null;
  }

  _addNodeData(graph, type, x, y, name, parentScreen) {
    const tmpl = getTemplate(type);
    const id = `node_${graph.nextNodeId++}`;
    const doc = generateDocFromTemplate(type, name);
    const node = {
      id, type, name, x, y,
      width: tmpl.width, height: tmpl.height,
      doc, description: ''
    };
    if (type === 'Screen') {
      node.children = [];
      node.interfaces = { figma: '', html: '' };
    }
    if (parentScreen) {
      node.parentScreen = parentScreen;
    }
    graph.nodes.push(node);
    if (parentScreen) {
      const parent = graph.nodes.find(n => n.id === parentScreen);
      if (parent && parent.children) {
        parent.children.push(id);
      }
    }
    return id;
  }

  _addEdgeData(graph, fromNode, fromPin, toNode, toPin, type) {
    const id = `edge_${graph.nextEdgeId++}`;
    graph.edges.push({
      id, fromNode, fromPin, toNode, toPin,
      type: type || 'data-flow',
      doc: '', description: '', label: ''
    });
  }

  /* ─── UI ─── */

  _updateProjectName() {
    const el = document.getElementById('project-name');
    if (el) el.textContent = this.projectName;
  }

  _notify(msg, type) {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.className = `notification ${type || 'info'}`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  getProjectName() { return this.projectName; }
  setProjectName(name) {
    this.projectName = name;
    this._updateProjectName();
  }
}
