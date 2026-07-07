(function () {
  'use strict';

  let graph, docPanel, storage;
  let initialized = false;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    if (initialized) return;
    initialized = true;

    const svg = document.getElementById('canvas-svg');
    graph = new Graph(svg);
    docPanel = new DocumentationPanel();
    docPanel.setGraph(graph);
    storage = new Storage();

    /* ─── Graph Callbacks ─── */

    graph.onSelect = (type, id) => {
      if (type === 'node') {
        const node = graph.getNode(id);
        if (node) docPanel.showNode(node);
      } else if (type === 'edge') {
        const edge = graph.getEdge(id);
        if (edge) docPanel.showEdge(edge);
      }
    };

    graph.onDeselect = () => {
      docPanel.clear();
    };

    graph.onChange = (nodeCount, edgeCount) => {
      const el = document.getElementById('status-counts');
      if (el) el.textContent = t('status.counts', nodeCount, edgeCount);
    };

    graph.onAddNode = (x, y) => {
      const node = graph.addNode('Process', x, y);
      graph.selectNode(node.id);
    };

    graph.onContextMenu = (x, y, type, id) => {
      showContextMenu(x, y, type, id);
    };

    /* ─── Toolbar ─── */

    document.getElementById('btn-new').addEventListener('click', () => {
      if (graph.nodes.size > 0 && !confirm(t('confirm.newProject'))) return;
      graph.clear();
      storage.dirHandle = null;
      storage.setProjectName(t('app.untitled'));
      storage.llmTarget = 'generic';
      graph.llmTarget = 'generic';
      document.getElementById('llm-target-select').value = 'generic';
      docPanel.clear();
    });

    document.getElementById('btn-open').addEventListener('click', async () => {
      const data = await storage.loadProject();
      if (data) {
        graph.fromJSON(data);
        storage.setProjectName(data.name || t('app.untitled'));
        storage.llmTarget = graph.llmTarget;
        document.getElementById('llm-target-select').value = graph.llmTarget;
        docPanel.clear();
      }
    });

    document.getElementById('btn-save').addEventListener('click', async () => {
      const data = graph.toJSON();
      data.name = storage.getProjectName();
      await storage.saveProject(data);
    });

    document.getElementById('btn-saveas').addEventListener('click', async () => {
      const data = graph.toJSON();
      data.name = storage.getProjectName();
      await storage.saveProjectAs(data);
    });

    document.getElementById('btn-export').addEventListener('click', async () => {
      const data = graph.toJSON();
      data.name = storage.getProjectName();
      await storage.exportMarkdown(data);
    });

    document.getElementById('btn-export-html').addEventListener('click', async () => {
      const data = graph.toJSON();
      data.name = storage.getProjectName();
      await storage.exportStaticHTML(data);
    });

    document.getElementById('btn-zoom-in').addEventListener('click', () => {
      graph.zoomAt(1.2, window.innerWidth / 2, window.innerHeight / 2);
    });

    document.getElementById('btn-zoom-out').addEventListener('click', () => {
      graph.zoomAt(0.8, window.innerWidth / 2, window.innerHeight / 2);
    });

    document.getElementById('btn-zoom-fit').addEventListener('click', () => {
      graph.zoomToFit();
    });

    document.getElementById('btn-design-guide').addEventListener('click', () => {
      const content = graph.designGuide || t('designGuide.default');
      docPanel.showDesignGuide(content);
    });

    /* ─── Template Select ─── */

    document.getElementById('template-select').addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'blank') return;
      if (graph.nodes.size > 0 && !confirm(t('confirm.applyTemplate'))) {
        e.target.value = 'blank';
        return;
      }
      storage.applyTemplate(val, graph);
      e.target.value = 'blank';
      document.getElementById('llm-target-select').value = graph.llmTarget;
      storage.llmTarget = graph.llmTarget;
      setTimeout(() => graph.zoomToFit(), 50);
    });

    /* ─── Palette Drag & Drop ─── */

    const paletteItems = document.querySelectorAll('.palette-item[draggable]');
    paletteItems.forEach(item => {
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', item.dataset.type);
        e.dataTransfer.effectAllowed = 'copy';
      });
    });

    const canvasContainer = document.getElementById('canvas-container');

    /* ─── Palette Buttons ─── */

    document.getElementById('action-add-start').addEventListener('click', () => addNodeAtCenter('Start'));
    document.getElementById('action-add-process').addEventListener('click', () => addNodeAtCenter('Process'));
    document.getElementById('action-add-decision').addEventListener('click', () => addNodeAtCenter('Decision'));
    document.getElementById('action-add-document').addEventListener('click', () => addNodeAtCenter('Document'));
    document.getElementById('action-add-subgraph').addEventListener('click', () => addNodeAtCenter('SubGraph'));
    document.getElementById('action-add-screen').addEventListener('click', () => addNodeAtCenter('Screen'));
    document.getElementById('action-add-end').addEventListener('click', () => addNodeAtCenter('End'));

    /* ─── Interface URL inputs ─── */

    document.getElementById('prop-figma-url').addEventListener('input', () => {
      if (graph.selectedNode) {
        const figma = document.getElementById('prop-figma-url').value;
        const html = document.getElementById('prop-html-url').value;
        graph.updateNodeInterfaces(graph.selectedNode, figma, html);
        const hasAny = figma || html;
        document.getElementById('prop-interface-hint').classList.toggle('hidden', hasAny);
      }
    });

    document.getElementById('prop-html-url').addEventListener('input', () => {
      if (graph.selectedNode) {
        const figma = document.getElementById('prop-figma-url').value;
        const html = document.getElementById('prop-html-url').value;
        graph.updateNodeInterfaces(graph.selectedNode, figma, html);
        const hasAny = figma || html;
        document.getElementById('prop-interface-hint').classList.toggle('hidden', hasAny);
      }
    });

    document.getElementById('btn-open-figma').addEventListener('click', () => {
      const url = document.getElementById('prop-figma-url').value;
      if (url) window.open(url, '_blank');
    });

    document.getElementById('btn-open-html').addEventListener('click', () => {
      const url = document.getElementById('prop-html-url').value;
      if (url) window.open(url, '_blank');
    });

    /* ─── Palette Buttons ─── */

    document.getElementById('action-delete-selected').addEventListener('click', () => {
      if (graph.selectedNode) {
        graph.removeNode(graph.selectedNode);
        docPanel.clear();
      } else if (graph.selectedEdge) {
        graph.removeEdge(graph.selectedEdge);
        docPanel.clear();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (graph.selectedNode) {
          graph.removeNode(graph.selectedNode);
          docPanel.clear();
        } else if (graph.selectedEdge) {
          graph.removeEdge(graph.selectedEdge);
          docPanel.clear();
        }
      }
      if (e.key === 'Escape') {
        graph.deselectAll();
        docPanel.clear();
        hideContextMenu();
      }
    });

    /* ─── Context Menu ─── */

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#context-menu')) {
        hideContextMenu();
      }
    });

    /* ─── Filter Views ─── */

    function setActiveFilter(mode) {
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      if (mode === 'all') document.getElementById('btn-filter-all').classList.add('active');
      else if (mode === 'data-flow') document.getElementById('btn-filter-data-flow').classList.add('active');
      else if (mode === 'interfaces') document.getElementById('btn-filter-interfaces').classList.add('active');
    }

    document.getElementById('btn-filter-all').addEventListener('click', () => {
      graph.setFilter('all');
      setActiveFilter('all');
    });

    document.getElementById('btn-filter-data-flow').addEventListener('click', () => {
      graph.setFilter('data-flow');
      setActiveFilter('data-flow');
    });

    document.getElementById('btn-filter-interfaces').addEventListener('click', () => {
      graph.setFilter('interfaces');
      setActiveFilter('interfaces');
    });

    graph.onFilterChange = (mode) => {
      setActiveFilter(mode);
    };

    /* ─── Drag & Drop onto Screens ─── */

    canvasContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    canvasContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('text/plain');
      if (type && TEMPLATES[type]) {
        const pos = graph.screenToWorld(e.clientX, e.clientY);
        const node = graph.addNode(type, pos.x - 80, pos.y - 26);

        const screen = graph.getNodeAt(pos.x, pos.y);
        if (screen && screen.type === 'Screen' && type !== 'Screen') {
          graph.addChildToScreen(screen.id, node.id);
        }

        graph.selectNode(node.id);
      }
    });

    canvasContainer.addEventListener('dragend', (e) => {
      if (graph.selectedNode) {
        const node = graph.getNode(graph.selectedNode);
        if (node && node.type !== 'Screen') {
          const cx = node.x + node.width / 2;
          const cy = node.y + node.height / 2;
          const screen = graph.getNodeAt(cx, cy);
          const currentParent = node.parentScreen;
          if (screen && screen.type === 'Screen' && screen.id !== currentParent) {
            graph.addChildToScreen(screen.id, node.id);
          } else if (!screen && currentParent) {
            graph.removeChildFromScreen(currentParent, node.id);
          }
        }
      }
    });

    /* ─── LLM Target Selector ─── */

    document.getElementById('llm-target-select').addEventListener('change', (e) => {
      graph.llmTarget = e.target.value;
      storage.llmTarget = e.target.value;
    });

    /* ─── Language Switcher ─── */

    document.getElementById('lang-select').addEventListener('change', (e) => {
      setLanguage(e.target.value);
    });

    document.addEventListener('languagechange', () => {
      const select = document.getElementById('lang-select');
      if (select) select.value = getCurrentLang();

      graph.onChange(graph.nodes.size, graph.edges.size);
      storage.setProjectName(storage.getProjectName());

      const templateSelect = document.getElementById('template-select');
      const currentVal = templateSelect.value;
      templateSelect.innerHTML = '';
      storage.getTemplates().forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.name;
        templateSelect.appendChild(opt);
      });
      templateSelect.value = currentVal;

      const llmSelect = document.getElementById('llm-target-select');
      const llmVal = llmSelect.value;
      llmSelect.innerHTML = '';
      for (const [key, target] of Object.entries(LLM_TARGETS)) {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = t(target.labelKey) || target.file;
        llmSelect.appendChild(opt);
      }
      llmSelect.value = llmVal;
    });

    /* ─── Keyboard shortcuts hints ─── */

    graph._emitChange();
    graph._updateEmptyHint();

    /* ─── Initial zoom ─── */
    setTimeout(() => graph.zoomToFit(), 100);
  }

  function addNodeAtCenter(type) {
    const rect = graph.svg.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const world = {
      x: (cx - graph.viewX) / graph.viewScale - 80,
      y: (cy - graph.viewY) / graph.viewScale - 26
    };
    const node = graph.addNode(type, world.x, world.y);
    graph.selectNode(node.id);
  }

  function showContextMenu(x, y, type, id) {
    const menu = document.getElementById('context-menu');
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.classList.remove('hidden');
    menu.dataset.type = type;
    menu.dataset.id = id;
    menu.dataset.fromX = x;
    menu.dataset.fromY = y;

    const items = menu.querySelectorAll('.ctx-item');
    items.forEach(item => {
      item.onclick = () => {
        const action = item.dataset.action;
        handleContextAction(action, type, id);
        hideContextMenu();
      };
    });
  }

  function hideContextMenu() {
    const menu = document.getElementById('context-menu');
    menu.classList.add('hidden');
  }

  function handleContextAction(action, type, id) {
    switch (action) {
      case 'edit':
        if (type === 'node') {
          const node = graph.getNode(id);
          if (node) docPanel.showNode(node);
        } else if (type === 'edge') {
          const edge = graph.getEdge(id);
          if (edge) docPanel.showEdge(edge);
        }
        break;
      case 'duplicate':
        if (type === 'node') {
          const node = graph.getNode(id);
          if (node) {
            const newNode = graph.addNode(node.type, node.x + 30, node.y + 30, node.name + ' ' + t('ctx.duplicateSuffix'));
            if (node.children && node.children.length > 0) {
              node.children.forEach(cid => {
                const child = graph.getNode(cid);
                if (child) {
                  const newChild = graph.addNode(child.type, child.x + 30, child.y + 30, child.name);
                  graph.addChildToScreen(newNode.id, newChild.id);
                }
              });
            }
          }
        }
        break;
      case 'add-to-screen':
        if (type === 'node') {
          const node = graph.getNode(id);
          if (!node || node.type === 'Screen') return;
          const screens = [];
          for (const n of graph.nodes.values()) {
            if (n.type === 'Screen' && n.id !== id) screens.push(n);
          }
          if (screens.length === 0) return;
          const screenNames = screens.map((s, i) => `${i + 1}. ${s.name}`).join('\n');
          const choice = prompt(t('ctx.addToScreen') + '\n\n' + screenNames + '\n\n' + t('ctx.addToScreenHint'));
          if (choice !== null) {
            const idx = parseInt(choice) - 1;
            if (idx >= 0 && idx < screens.length) {
              graph.addChildToScreen(screens[idx].id, id);
              docPanel.clear();
              const updated = graph.getNode(screens[idx].id);
              if (updated) docPanel.showNode(updated);
            }
          }
        }
        break;
      case 'disconnect':
        if (type === 'edge') {
          graph.removeEdge(id);
          docPanel.clear();
        }
        break;
      case 'delete':
        if (type === 'node') {
          graph.removeNode(id);
        } else if (type === 'edge') {
          graph.removeEdge(id);
        }
        docPanel.clear();
        break;
    }
  }
})();
