const EDGE_TYPES = {
  DATA_FLOW: 'data-flow',
  NAVIGATION: 'navigation',
  DATA_UI: 'data-ui',
  USER_ACTION: 'user-action'
};

const FILTER_ALL = 'all';
const FILTER_DATA_FLOW = 'data-flow';
const FILTER_INTERFACES = 'interfaces';

function getNodeCategory(type) {
  return type === 'Screen' ? 'interface' : 'process';
}

function inferEdgeType(fromNode, toNode) {
  const catFrom = getNodeCategory(fromNode.type);
  const catTo = getNodeCategory(toNode.type);
  if (catFrom === 'interface' && catTo === 'interface') return EDGE_TYPES.NAVIGATION;
  if (catFrom === 'interface' && catTo === 'process') return EDGE_TYPES.USER_ACTION;
  if (catFrom === 'process' && catTo === 'interface') return EDGE_TYPES.DATA_UI;
  return EDGE_TYPES.DATA_FLOW;
}

class Graph {
  constructor(svgElement) {
    this.svg = svgElement;
    this.viewport = svgElement.querySelector('#viewport-group');
    this.nodesLayer = svgElement.querySelector('#nodes-layer');
    this.edgesLayer = svgElement.querySelector('#edges-layer');
    this.tempEdgeLayer = svgElement.querySelector('#temp-edge-layer');
    this.containersLayer = svgElement.querySelector('#containers-layer');

    this.nodes = new Map();
    this.edges = new Map();
    this.nextNodeId = 1;
    this.nextEdgeId = 1;

    this.viewX = 0;
    this.viewY = 0;
    this.viewScale = 1;

    this.selectedNode = null;
    this.selectedEdge = null;

    this.designGuide = '';

    this.dragState = null;
    this.panState = null;
    this.connectingState = null;

    this.filterMode = FILTER_ALL;

    this.onSelect = null;
    this.onDeselect = null;
    this.onChange = null;
    this.onContextMenu = null;
    this.onFilterChange = null;

    this._bindEvents();
    this._updateTransform();
  }

  /* ─── Nodes ─── */

  addNode(type, x, y, name) {
    const tmpl = getTemplate(type);
    const id = `node_${this.nextNodeId++}`;
    const nodeName = name || `${getTemplateDefaultName(type)} ${this.nextNodeId - 1}`;

    const node = {
      id,
      type,
      name: nodeName,
      x, y,
      width: tmpl.width,
      height: tmpl.height,
      color: tmpl.color,
      icon: tmpl.icon,
      pins: JSON.parse(JSON.stringify(tmpl.pins)),
      doc: generateDocFromTemplate(type, nodeName),
      description: '',
      implementationOrder: 0,
      implementationStatus: 'pending',
      diary: [],
      interfaces: type === 'Screen' ? { figma: '', html: '' } : null,
      children: type === 'Screen' ? [] : null,
      parentScreen: null
    };

    this.nodes.set(id, node);
    this._renderNode(node);
    this._updateContainerBounds(node);
    this._updateEmptyHint();
    this._emitChange();
    return node;
  }

  removeNode(id) {
    const node = this.nodes.get(id);
    if (!node) return;

    const edgeIds = [];
    for (const [eid, edge] of this.edges) {
      if (edge.fromNode === id || edge.toNode === id) {
        edgeIds.push(eid);
      }
    }
    edgeIds.forEach(eid => this.removeEdge(eid));

    if (node.children) {
      [...node.children].forEach(childId => {
        const child = this.nodes.get(childId);
        if (child) {
          child.parentScreen = null;
          this._updateNodeVisibility(child);
        }
      });
    }

    if (node.parentScreen) {
      const parent = this.nodes.get(node.parentScreen);
      if (parent && parent.children) {
        parent.children = parent.children.filter(cid => cid !== id);
        this._updateContainerBounds(parent);
      }
    }

    const el = this.svg.querySelector(`.node-group[data-id="${id}"]`);
    if (el) el.remove();
    const containerEl = this.svg.querySelector(`.screen-container[data-id="${id}"]`);
    if (containerEl) containerEl.remove();
    this.nodes.delete(id);

    if (this.selectedNode === id) this._deselect();
    this._updateEmptyHint();
    this._emitChange();
  }

  addChildToScreen(screenId, childId) {
    const screen = this.nodes.get(screenId);
    const child = this.nodes.get(childId);
    if (!screen || !child || screen.type !== 'Screen') return false;
    if (child.type === 'Screen' || child.parentScreen) return false;
    if (childId === screenId) return false;

    if (child.parentScreen) {
      const oldParent = this.nodes.get(child.parentScreen);
      if (oldParent && oldParent.children) {
        oldParent.children = oldParent.children.filter(cid => cid !== childId);
        this._updateContainerBounds(oldParent);
      }
    }

    if (!screen.children) screen.children = [];
    if (!screen.children.includes(childId)) {
      screen.children.push(childId);
    }
    child.parentScreen = screenId;

    this._updateContainerBounds(screen);
    this._updateNodeVisibility(child);
    this._emitChange();
    return true;
  }

  removeChildFromScreen(screenId, childId) {
    const screen = this.nodes.get(screenId);
    const child = this.nodes.get(childId);
    if (!screen || !child) return false;
    if (child.parentScreen !== screenId) return false;

    screen.children = (screen.children || []).filter(cid => cid !== childId);
    child.parentScreen = null;

    this._updateContainerBounds(screen);
    this._updateNodeVisibility(child);
    this._emitChange();
    return true;
  }

  getNode(id) { return this.nodes.get(id); }

  /* ─── Edges ─── */

  addEdge(fromNodeId, fromPinId, toNodeId, toPinId) {
    const fromNode = this.nodes.get(fromNodeId);
    const toNode = this.nodes.get(toNodeId);
    if (!fromNode || !toNode) return null;
    if (fromNodeId === toNodeId) return null;

    for (const edge of this.edges.values()) {
      if (edge.fromNode === fromNodeId && edge.fromPin === fromPinId &&
          edge.toNode === toNodeId && edge.toPin === toPinId) {
        return null;
      }
    }

    const id = `edge_${this.nextEdgeId++}`;
    const edgeType = inferEdgeType(fromNode, toNode);
    const edge = {
      id,
      fromNode: fromNodeId,
      fromPin: fromPinId,
      toNode: toNodeId,
      toPin: toPinId,
      type: edgeType,
      doc: getEdgeDocTemplate(fromNode.name, toNode.name),
      description: '',
      label: ''
    };

    this.edges.set(id, edge);
    this._renderEdge(edge);
    this._updateEdgeVisibility(edge);
    this._emitChange();
    return edge;
  }

  removeEdge(id) {
    const edge = this.edges.get(id);
    if (!edge) return;

    const el = this.svg.querySelector(`.edge-group[data-id="${id}"]`);
    if (el) el.remove();
    this.edges.delete(id);

    this._updatePinClasses();
    if (this.selectedEdge === id) this._deselect();
    this._emitChange();
  }

  getEdge(id) { return this.edges.get(id); }

  getEdgesForNode(nodeId) {
    const result = [];
    for (const edge of this.edges.values()) {
      if (edge.fromNode === nodeId || edge.toNode === nodeId) {
        result.push(edge);
      }
    }
    return result;
  }

  getScreenChildren(screenId) {
    const screen = this.nodes.get(screenId);
    if (!screen || !screen.children) return [];
    return screen.children.map(cid => this.nodes.get(cid)).filter(Boolean);
  }

  /* ─── Selection ─── */

  selectNode(id) {
    this._deselect();
    this.selectedNode = id;
    const el = this.svg.querySelector(`.node-group[data-id="${id}"]`);
    if (el) el.classList.add('selected');
    for (const edge of this.edges.values()) {
      if (edge.fromNode === id || edge.toNode === id) {
        this._updateEdgePath(edge);
      }
    }
    if (this.onSelect) this.onSelect('node', id);
  }

  selectEdge(id) {
    this._deselect();
    this.selectedEdge = id;
    const el = this.svg.querySelector(`.edge-group[data-id="${id}"]`);
    if (el) el.classList.add('selected');
    this._updateEdgePath(this.edges.get(id));
    if (this.onSelect) this.onSelect('edge', id);
  }

  _deselect() {
    if (this.selectedNode) {
      const el = this.svg.querySelector(`.node-group[data-id="${this.selectedNode}"]`);
      if (el) el.classList.remove('selected');
      for (const edge of this.edges.values()) {
        if (edge.fromNode === this.selectedNode || edge.toNode === this.selectedNode) {
          this._updateEdgePath(edge);
        }
      }
    }
    if (this.selectedEdge) {
      const el = this.svg.querySelector(`.edge-group[data-id="${this.selectedEdge}"]`);
      if (el) el.classList.remove('selected');
      const edge = this.edges.get(this.selectedEdge);
      if (edge) this._updateEdgePath(edge);
    }
    this.selectedNode = null;
    this.selectedEdge = null;
    if (this.onDeselect) this.onDeselect();
  }

  deselectAll() { this._deselect(); }

  /* ─── Viewport ─── */

  setView(x, y, scale) {
    this.viewX = x;
    this.viewY = y;
    this.viewScale = scale;
    this._updateTransform();
    this._emitZoomChange();
  }

  pan(dx, dy) {
    this.viewX += dx;
    this.viewY += dy;
    this._updateTransform();
  }

  zoomAt(scale, cx, cy) {
    const newScale = Math.max(0.1, Math.min(3, this.viewScale * scale));
    const factor = newScale / this.viewScale;
    this.viewX = cx - factor * (cx - this.viewX);
    this.viewY = cy - factor * (cy - this.viewY);
    this.viewScale = newScale;
    this._updateTransform();
  }

  zoomToFit(padding) {
    if (this.nodes.size === 0) return;
    padding = padding || 40;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of this.nodes.values()) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    }

    const rect = this.svg.getBoundingClientRect();
    const availableW = rect.width - padding * 2;
    const availableH = rect.height - padding * 2;
    const graphW = maxX - minX || 1;
    const graphH = maxY - minY || 1;

    const scale = Math.min(availableW / graphW, availableH / graphH, 2);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    this.viewX = rect.width / 2 - cx * scale;
    this.viewY = rect.height / 2 - cy * scale;
    this.viewScale = scale;
    this._updateTransform();
  }

  /* ─── Serialization ─── */

  toJSON() {
    return {
      nodes: Array.from(this.nodes.values()).map(n => {
        const nd = {
          id: n.id, type: n.type, name: n.name,
          x: n.x, y: n.y,
          doc: n.doc, description: n.description,
          implementationOrder: n.implementationOrder || 0,
          implementationStatus: n.implementationStatus || 'pending',
          diary: n.diary || [],
          width: n.width, height: n.height
        };
        if (n.interfaces) nd.interfaces = n.interfaces;
        if (n.children && n.children.length > 0) nd.children = n.children;
        if (n.parentScreen) nd.parentScreen = n.parentScreen;
        return nd;
      }),
      edges: Array.from(this.edges.values()).map(e => ({
        id: e.id,
        fromNode: e.fromNode, fromPin: e.fromPin,
        toNode: e.toNode, toPin: e.toPin,
        type: e.type || EDGE_TYPES.DATA_FLOW,
        doc: e.doc, description: e.description, label: e.label
      })),
      nextNodeId: this.nextNodeId,
      nextEdgeId: this.nextEdgeId,
      viewX: this.viewX, viewY: this.viewY, viewScale: this.viewScale,
      designGuide: this.designGuide
    };
  }

  fromJSON(data) {
    this.nodes.clear();
    this.edges.clear();
    this.nodesLayer.innerHTML = '';
    this.edgesLayer.innerHTML = '';
    this.tempEdgeLayer.innerHTML = '';
    const containersLayer = this.svg.querySelector('#containers-layer');
    if (containersLayer) containersLayer.innerHTML = '';
    this._deselect();

    this.nextNodeId = data.nextNodeId || 1;
    this.nextEdgeId = data.nextEdgeId || 1;

    if (data.nodes) {
      for (const n of data.nodes) {
        const tmpl = getTemplate(n.type);
        const node = {
          id: n.id, type: n.type, name: n.name,
          x: n.x, y: n.y,
          width: n.width || tmpl.width,
          height: n.height || tmpl.height,
          color: n.color || tmpl.color,
          icon: n.icon || tmpl.icon,
          pins: JSON.parse(JSON.stringify(tmpl.pins)),
          doc: n.doc || generateDocFromTemplate(n.type, n.name),
          description: n.description || '',
          implementationOrder: n.implementationOrder || 0,
          implementationStatus: n.implementationStatus || 'pending',
          diary: n.diary || [],
          interfaces: n.interfaces || (n.type === 'Screen' ? { figma: '', html: '' } : null),
          children: n.children || (n.type === 'Screen' ? [] : null),
          parentScreen: n.parentScreen || null
        };
        this.nodes.set(node.id, node);
        this._renderNode(node);
      }
    }

    this.designGuide = data.designGuide || '';

    if (data.edges) {
      for (const e of data.edges) {
        const edge = {
          id: e.id,
          fromNode: e.fromNode, fromPin: e.fromPin,
          toNode: e.toNode, toPin: e.toPin,
          type: e.type || EDGE_TYPES.DATA_FLOW,
          doc: e.doc || '', description: e.description || '', label: e.label || ''
        };
        this.edges.set(edge.id, edge);
        this._renderEdge(edge);
      }
    }

    for (const node of this.nodes.values()) {
      if (node.children && node.children.length > 0) {
        this._updateContainerBounds(node);
      }
    }

    if (data.viewX != null) this.viewX = data.viewX;
    if (data.viewY != null) this.viewY = data.viewY;
    if (data.viewScale != null) this.viewScale = data.viewScale;
    this._updateTransform();
    this._updatePinClasses();
    this._updateEmptyHint();
    this._applyFilter();
  }

  clear() {
    this.nodes.clear();
    this.edges.clear();
    this.nodesLayer.innerHTML = '';
    this.edgesLayer.innerHTML = '';
    this.tempEdgeLayer.innerHTML = '';
    const containersLayer = this.svg.querySelector('#containers-layer');
    if (containersLayer) containersLayer.innerHTML = '';
    this._deselect();
    this.designGuide = '';
    this.viewX = 0;
    this.viewY = 0;
    this.viewScale = 1;
    this._updateTransform();
    this._updateEmptyHint();
    this._emitChange();
  }

  _updateContainerBounds(screen) {
    if (!screen || screen.type !== 'Screen') return;
    const children = screen.children || [];
    if (children.length === 0) {
      const tmpl = getTemplate('Screen');
      screen.width = tmpl.width;
      screen.height = tmpl.height;
    } else {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const cid of children) {
        const child = this.nodes.get(cid);
        if (!child) continue;
        minX = Math.min(minX, child.x);
        minY = Math.min(minY, child.y);
        maxX = Math.max(maxX, child.x + child.width);
        maxY = Math.max(maxY, child.y + child.height);
      }
      if (minX === Infinity) {
        const tmpl = getTemplate('Screen');
        screen.width = tmpl.width;
        screen.height = tmpl.height;
        return;
      }
      const padding = 60;
      const headerH = 36;
      screen.x = minX - padding;
      screen.y = minY - padding - headerH;
      screen.width = (maxX - minX) + padding * 2;
      screen.height = (maxY - minY) + padding * 2 + headerH;
    }
    const group = this.nodesLayer.querySelector(`.node-group[data-id="${screen.id}"]`);
    if (group) {
      group.setAttribute('transform', `translate(${screen.x},${screen.y})`);
      this._recreateNode(screen);
    }
  }

  _recreateNode(node) {
    const old = this.nodesLayer.querySelector(`.node-group[data-id="${node.id}"]`);
    if (old) old.remove();
    this._renderNode(node);
    const newEl = this.nodesLayer.querySelector(`.node-group[data-id="${node.id}"]`);
    if (newEl && this.selectedNode === node.id) {
      newEl.classList.add('selected');
    }
    for (const edge of this.edges.values()) {
      if (edge.fromNode === node.id || edge.toNode === node.id) {
        this._updateEdgePath(edge);
      }
    }
  }

  /* ─── Filter Views ─── */

  setFilter(mode) {
    this.filterMode = mode;
    this._applyFilter();
    if (this.onFilterChange) this.onFilterChange(mode);
  }

  getFilter() { return this.filterMode; }

  _applyFilter() {
    for (const node of this.nodes.values()) {
      this._updateNodeVisibility(node);
    }
    for (const edge of this.edges.values()) {
      this._updateEdgeVisibility(edge);
    }
  }

  _updateNodeVisibility(node) {
    const el = this.nodesLayer.querySelector(`.node-group[data-id="${node.id}"]`);
    if (!el) return;

    const mode = this.filterMode;
    const cat = getNodeCategory(node.type);

    if (mode === FILTER_ALL) {
      el.style.display = '';
      return;
    }

    if (mode === FILTER_DATA_FLOW) {
      el.style.display = cat === 'interface' ? 'none' : '';
      return;
    }

    if (mode === FILTER_INTERFACES) {
      const isVisible = cat === 'interface' || node.parentScreen;
      el.style.display = isVisible ? '' : 'none';
      return;
    }
  }

  _updateEdgeVisibility(edge) {
    const el = this.edgesLayer.querySelector(`.edge-group[data-id="${edge.id}"]`);
    if (!el) return;

    const mode = this.filterMode;

    if (mode === FILTER_ALL) {
      el.style.display = '';
      return;
    }

    if (mode === FILTER_DATA_FLOW) {
      el.style.display = (edge.type === EDGE_TYPES.NAVIGATION) ? 'none' : '';
      return;
    }

    if (mode === FILTER_INTERFACES) {
      el.style.display = (edge.type === EDGE_TYPES.DATA_FLOW) ? 'none' : '';
      return;
    }
  }

  /* ─── Rendering ─── */

  _renderNode(node) {
    const tmpl = getTemplate(node.type);
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'node-group');
    g.setAttribute('data-id', node.id);
    g.setAttribute('transform', `translate(${node.x},${node.y})`);

    const body = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    body.setAttribute('class', 'node-body');

    const border = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    border.setAttribute('class', 'node-border');

    const w = node.width;
    const h = node.height;
    const color = tmpl.color;

    if (node.type === 'Decision') {
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', `${w/2},0 ${w},${h/2} ${w/2},${h} 0,${h/2}`);
      poly.setAttribute('fill', color);
      poly.setAttribute('opacity', '0.85');
      poly.setAttribute('stroke', color);
      poly.setAttribute('stroke-width', '1.5');
      border.appendChild(poly);
    } else if (node.type === 'SubGraph') {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '0');
      rect.setAttribute('y', '0');
      rect.setAttribute('width', w);
      rect.setAttribute('height', h);
      rect.setAttribute('rx', '4');
      rect.setAttribute('ry', '4');
      rect.setAttribute('fill', color);
      rect.setAttribute('opacity', '0.85');
      rect.setAttribute('stroke', color);
      rect.setAttribute('stroke-width', '1.5');
      border.appendChild(rect);

      const inner = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      inner.setAttribute('x', '3');
      inner.setAttribute('y', '3');
      inner.setAttribute('width', w - 6);
      inner.setAttribute('height', h - 6);
      inner.setAttribute('rx', '3');
      inner.setAttribute('ry', '3');
      inner.setAttribute('fill', 'none');
      inner.setAttribute('stroke', color);
      inner.setAttribute('stroke-width', '1');
      inner.setAttribute('opacity', '0.4');
      inner.setAttribute('stroke-dasharray', '4,3');
      border.appendChild(inner);
    } else if (node.type === 'Start' || node.type === 'End') {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '0');
      rect.setAttribute('y', '0');
      rect.setAttribute('width', w);
      rect.setAttribute('height', h);
      rect.setAttribute('rx', h / 2);
      rect.setAttribute('ry', h / 2);
      rect.setAttribute('fill', color);
      rect.setAttribute('opacity', '0.85');
      rect.setAttribute('stroke', color);
      rect.setAttribute('stroke-width', '1.5');
      border.appendChild(rect);
    } else if (node.type === 'Screen') {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '0');
      rect.setAttribute('y', '0');
      rect.setAttribute('width', w);
      rect.setAttribute('height', h);
      rect.setAttribute('rx', '4');
      rect.setAttribute('ry', '4');
      rect.setAttribute('fill', color);
      rect.setAttribute('opacity', '0.85');
      rect.setAttribute('stroke', color);
      rect.setAttribute('stroke-width', '1.5');
      border.appendChild(rect);

      if (node.children && node.children.length > 0) {
        const inner = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        inner.setAttribute('x', '2');
        inner.setAttribute('y', '2');
        inner.setAttribute('width', w - 4);
        inner.setAttribute('height', h - 4);
        inner.setAttribute('rx', '3');
        inner.setAttribute('ry', '3');
        inner.setAttribute('fill', 'none');
        inner.setAttribute('stroke', '#00BCD4');
        inner.setAttribute('stroke-width', '1');
        inner.setAttribute('opacity', '0.5');
        inner.setAttribute('stroke-dasharray', '5,3');
        border.appendChild(inner);
      }
    } else {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '0');
      rect.setAttribute('y', '0');
      rect.setAttribute('width', w);
      rect.setAttribute('height', h);
      rect.setAttribute('rx', '4');
      rect.setAttribute('ry', '4');
      rect.setAttribute('fill', color);
      rect.setAttribute('opacity', '0.85');
      rect.setAttribute('stroke', color);
      rect.setAttribute('stroke-width', '1.5');

      if (node.type === 'Document') {
        const fold = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        fold.setAttribute('d', `M${w-12},0 L${w},12 L${w-12},${12} Z`);
        fold.setAttribute('fill', 'rgba(255,255,255,0.2)');
        border.appendChild(fold);
      }

      border.appendChild(rect);
    }

    body.appendChild(border);

    if (node.type === 'Decision') {
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      title.setAttribute('class', 'node-title');
      title.setAttribute('x', w / 2);
      title.setAttribute('y', h / 2 - 2);
      title.setAttribute('text-anchor', 'middle');
      title.setAttribute('dominant-baseline', 'auto');
      title.textContent = node.name;
      body.appendChild(title);

      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      icon.setAttribute('class', 'node-icon');
      icon.setAttribute('x', w / 2);
      icon.setAttribute('y', h / 2 + 18);
      icon.setAttribute('text-anchor', 'middle');
      icon.setAttribute('dominant-baseline', 'auto');
      icon.setAttribute('font-size', '14');
      icon.textContent = tmpl.icon;
      body.appendChild(icon);
    } else {
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      icon.setAttribute('class', 'node-icon');
      icon.setAttribute('x', '12');
      icon.setAttribute('y', h / 2 + 5);
      icon.setAttribute('text-anchor', 'middle');
      icon.setAttribute('dominant-baseline', 'auto');
      icon.textContent = tmpl.icon;
      body.appendChild(icon);

      const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      title.setAttribute('class', 'node-title');
      title.setAttribute('x', '28');
      title.setAttribute('y', h / 2 + 1);
      title.setAttribute('dominant-baseline', 'auto');
      title.setAttribute('font-size', '11');
      title.textContent = node.name;
      body.appendChild(title);
    }

    g.appendChild(body);

    const pinsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    pinsGroup.setAttribute('class', 'pins-group');

    const inputPins = (node.pins.inputs || []);
    const outputPins = (node.pins.outputs || []);

    const allPins = [
      ...inputPins.map(p => ({ ...p, dir: 'input', idx: inputPins.indexOf(p), count: inputPins.length })),
      ...outputPins.map(p => ({ ...p, dir: 'output', idx: outputPins.indexOf(p), count: outputPins.length }))
    ];

    for (const pin of allPins) {
      const pinEl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      const px = pin.dir === 'input' ? 0 : w;
      const spacing = h / (pin.count + 1);
      const py = spacing * (pin.idx + 1);

      pinEl.setAttribute('class', `pin ${pin.dir}`);
      pinEl.setAttribute('data-node', node.id);
      pinEl.setAttribute('data-pin', pin.id);
      pinEl.setAttribute('data-pin-dir', pin.dir);
      pinEl.setAttribute('cx', px);
      pinEl.setAttribute('cy', py);
      pinEl.setAttribute('r', '5');
      pinEl.setAttribute('fill', '#1a1a2e');
      pinEl.setAttribute('stroke', color);
      pinEl.setAttribute('stroke-width', '2');

      const pinLabel = getPinLabel(node.type, pin.id);
      if (pinLabel) {
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('class', 'node-subtitle');
        const lx = pin.dir === 'input' ? 10 : w - 10;
        label.setAttribute('x', lx);
        label.setAttribute('y', py + 3);
        label.setAttribute('text-anchor', pin.dir === 'input' ? 'start' : 'end');
        label.setAttribute('font-size', '8');
        label.textContent = pinLabel;
        pinsGroup.appendChild(label);
      }

      pin.pinEl = pinEl;
      pinsGroup.appendChild(pinEl);
    }

    g.appendChild(pinsGroup);
    this.nodesLayer.appendChild(g);

    this._updateNodeVisibility(node);
  }

  _getEdgeStyle(edge, selected) {
    const styles = {
      [EDGE_TYPES.DATA_FLOW]: {
        stroke: selected ? '#64B5F6' : '#888',
        width: selected ? '3' : '2',
        dash: '',
        marker: selected ? 'url(#arrowhead-selected)' : 'url(#arrowhead)',
        label: 'edge-label-data'
      },
      [EDGE_TYPES.NAVIGATION]: {
        stroke: selected ? '#4DD0E1' : '#00BCD4',
        width: selected ? '3' : '2.5',
        dash: '7,4',
        marker: 'url(#arrowhead-cyan)',
        label: 'edge-label-nav'
      },
      [EDGE_TYPES.DATA_UI]: {
        stroke: selected ? '#CE93D8' : '#9C27B0',
        width: selected ? '3' : '1.5',
        dash: '4,3',
        marker: 'url(#arrowhead-purple)',
        label: 'edge-label-ui'
      },
      [EDGE_TYPES.USER_ACTION]: {
        stroke: selected ? '#EF9A9A' : '#f44336',
        width: selected ? '3' : '1.5',
        dash: '4,3',
        marker: 'url(#arrowhead-red)',
        label: 'edge-label-action'
      }
    };
    return styles[edge.type] || styles[EDGE_TYPES.DATA_FLOW];
  }

  _renderEdge(edge) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'edge-group');
    group.setAttribute('data-id', edge.id);
    group.setAttribute('data-edge-type', edge.type);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'edge');
    path.setAttribute('fill', 'none');
    const style = this._getEdgeStyle(edge, false);
    path.setAttribute('stroke', style.stroke);
    path.setAttribute('stroke-width', style.width);
    if (style.dash) path.setAttribute('stroke-dasharray', style.dash);
    path.setAttribute('marker-end', style.marker);
    group.appendChild(path);

    const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitArea.setAttribute('class', 'edge-hitarea');
    hitArea.setAttribute('fill', 'none');
    hitArea.setAttribute('stroke', 'transparent');
    hitArea.setAttribute('stroke-width', '14');
    group.appendChild(hitArea);

    if (edge.label) {
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('class', `edge-label ${style.label}`);
      label.setAttribute('text-anchor', 'middle');
      label.textContent = edge.label;
      group.appendChild(label);
    }

    this.edgesLayer.appendChild(group);
    this._updateEdgePath(edge);
  }

  _updateEdgePath(edge) {
    const group = this.edgesLayer.querySelector(`.edge-group[data-id="${edge.id}"]`);
    if (!group) return;

    const fromPos = this._getPinPos(edge.fromNode, edge.fromPin);
    const toPos = this._getPinPos(edge.toNode, edge.toPin);

    if (!fromPos || !toPos) return;

    const dx = Math.abs(toPos.x - fromPos.x);
    const cpOffset = Math.max(50, dx * 0.5);

    const d = `M ${fromPos.x} ${fromPos.y} C ${fromPos.x + cpOffset} ${fromPos.y}, ${toPos.x - cpOffset} ${toPos.y}, ${toPos.x} ${toPos.y}`;

    const path = group.querySelector('.edge');
    const hitArea = group.querySelector('.edge-hitarea');

    const selected = (edge.fromNode === this.selectedNode || edge.toNode === this.selectedNode || this.selectedEdge === edge.id);
    const style = this._getEdgeStyle(edge, selected);
    path.setAttribute('stroke', style.stroke);
    path.setAttribute('stroke-width', style.width);
    path.setAttribute('marker-end', style.marker);
    if (style.dash) {
      path.setAttribute('stroke-dasharray', style.dash);
    } else {
      path.removeAttribute('stroke-dasharray');
    }

    path.setAttribute('d', d);
    hitArea.setAttribute('d', d);

    const label = group.querySelector('.edge-label');
    if (label) {
      const midX = (fromPos.x + toPos.x) / 2;
      const midY = (fromPos.y + toPos.y) / 2 - 10;
      label.setAttribute('x', midX);
      label.setAttribute('y', midY);
    }
  }

  _getPinPos(nodeId, pinId) {
    const node = this.nodes.get(nodeId);
    if (!node) return null;

    const allPins = [
      ...(node.pins.inputs || []).map(p => ({ ...p, dir: 'input' })),
      ...(node.pins.outputs || []).map(p => ({ ...p, dir: 'output' }))
    ];
    const pinDef = allPins.find(p => p.id === pinId);

    if (!pinDef) return null;

    const group = this.nodesLayer.querySelector(`.node-group[data-id="${nodeId}"]`);
    if (!group) return null;

    const pinEl = group.querySelector(`.pin[data-pin="${pinId}"]`);
    if (!pinEl) return null;

    const cx = parseFloat(pinEl.getAttribute('cx'));
    const cy = parseFloat(pinEl.getAttribute('cy'));

    return { x: node.x + cx, y: node.y + cy };
  }

  _updatePinClasses() {
    for (const [nid, node] of this.nodes) {
      const group = this.nodesLayer.querySelector(`.node-group[data-id="${nid}"]`);
      if (!group) continue;

      for (const pin of [...(node.pins.inputs || []), ...(node.pins.outputs || [])]) {
        const pinEl = group.querySelector(`.pin[data-pin="${pin.id}"]`);
        if (!pinEl) continue;

        let connected = false;
        for (const edge of this.edges.values()) {
          if ((edge.fromNode === nid && edge.fromPin === pin.id) ||
              (edge.toNode === nid && edge.toPin === pin.id)) {
            connected = true;
            break;
          }
        }
        pinEl.classList.toggle('connected', connected);
      }
    }
  }

  _updateTransform() {
    this.viewport.setAttribute('transform',
      `translate(${this.viewX},${this.viewY}) scale(${this.viewScale})`);
    this._emitZoomChange();
  }

  _updateEmptyHint() {
    const hint = document.getElementById('canvas-empty-hint');
    if (hint) {
      hint.classList.toggle('hidden', this.nodes.size > 0);
    }
  }

  _emitChange() {
    if (this.onChange) this.onChange(this.nodes.size, this.edges.size);
    this._updatePinClasses();
    for (const edge of this.edges.values()) {
      this._updateEdgePath(edge);
    }
    for (const node of this.nodes.values()) {
      if (node.type === 'Screen') {
        this._updateContainerBounds(node);
      }
    }
  }

  /* ─── Events ─── */

  _bindEvents() {
    let self = this;

    this.svg.addEventListener('mousedown', e => this._onMouseDown(e));
    window.addEventListener('mousemove', e => this._onMouseMove(e));
    window.addEventListener('mouseup', e => this._onMouseUp(e));

    this.svg.addEventListener('wheel', e => {
      e.preventDefault();
      const rect = this.svg.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.zoomAt(delta, cx, cy);
      this._emitZoomChange();
    }, { passive: false });

    this.svg.addEventListener('dblclick', e => {
      if (e.target === this.svg || e.target.id === 'canvas-bg') {
        const rect = this.svg.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.viewX) / this.viewScale;
        const y = (e.clientY - rect.top - this.viewY) / this.viewScale;
        if (this.onAddNode) this.onAddNode(x, y);
      }
    });

    this.svg.addEventListener('contextmenu', e => {
      e.preventDefault();
      let target = e.target.closest('.node-group') || e.target.closest('.edge-group');
      if (target) {
        const id = target.getAttribute('data-id');
        const type = target.classList.contains('node-group') ? 'node' : 'edge';
        if (this.onContextMenu) this.onContextMenu(e.clientX, e.clientY, type, id);
      }
    });
  }

  _onMouseDown(e) {
    const pin = e.target.closest('.pin');
    if (pin) {
      const nodeId = pin.getAttribute('data-node');
      const pinId = pin.getAttribute('data-pin');
      const dir = pin.getAttribute('data-pin-dir');
      if (dir === 'output') {
        this._startConnection(nodeId, pinId, e);
        return;
      }
    }

    const nodeGroup = e.target.closest('.node-group');
    if (nodeGroup) {
      const id = nodeGroup.getAttribute('data-id');
      this.selectNode(id);
      this._startDrag(id, e);
      return;
    }

    const edgeGroup = e.target.closest('.edge-group');
    if (edgeGroup) {
      const id = edgeGroup.getAttribute('data-id');
      this.selectEdge(id);
      return;
    }

    this._deselect();
    this._startPan(e);
  }

  _onMouseMove(e) {
    if (this.dragState) {
      this._updateDrag(e);
    } else if (this.panState) {
      this._updatePan(e);
    } else if (this.connectingState) {
      this._updateConnection(e);
    } else {
      this._updateStatusCoords(e);
    }
  }

  _onMouseUp(e) {
    if (this.dragState) {
      this._endDrag();
    } else if (this.panState) {
      this._endPan();
    } else if (this.connectingState) {
      this._endConnection(e);
    }
  }

  /* ─── Drag ─── */

  _startDrag(nodeId, e) {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    const childIds = [];
    if (node.children) {
      for (const cid of node.children) {
        const child = this.nodes.get(cid);
        if (child) childIds.push({ id: cid, origX: child.x, origY: child.y });
      }
    }

    this.dragState = {
      nodeId,
      startX: e.clientX,
      startY: e.clientY,
      origX: node.x,
      origY: node.y,
      children: childIds
    };
    this.svg.classList.add('dragging-node');
  }

  _updateDrag(e) {
    const state = this.dragState;
    const dx = (e.clientX - state.startX) / this.viewScale;
    const dy = (e.clientY - state.startY) / this.viewScale;

    const node = this.nodes.get(state.nodeId);
    if (!node) return;

    node.x = state.origX + dx;
    node.y = state.origY + dy;

    const group = this.nodesLayer.querySelector(`.node-group[data-id="${state.nodeId}"]`);
    if (group) {
      group.setAttribute('transform', `translate(${node.x},${node.y})`);
    }

    for (const child of state.children) {
      const cNode = this.nodes.get(child.id);
      if (cNode) {
        cNode.x = child.origX + dx;
        cNode.y = child.origY + dy;
        const cGroup = this.nodesLayer.querySelector(`.node-group[data-id="${child.id}"]`);
        if (cGroup) {
          cGroup.setAttribute('transform', `translate(${cNode.x},${cNode.y})`);
        }
      }
    }

    const allIds = [state.nodeId, ...state.children.map(c => c.id)];
    for (const edge of this.edges.values()) {
      if (allIds.includes(edge.fromNode) || allIds.includes(edge.toNode)) {
        this._updateEdgePath(edge);
      }
    }
    this._updateStatusCoords(e);
  }

  _endDrag() {
    this.dragState = null;
    this.svg.classList.remove('dragging-node');
    for (const node of this.nodes.values()) {
      if (node.type === 'Screen' && node.children && node.children.length > 0) {
        this._updateContainerBounds(node);
      }
    }
    this._emitChange();
  }

  /* ─── Pan ─── */

  _startPan(e) {
    if (e.button !== 0) return;
    this.panState = {
      startX: e.clientX,
      startY: e.clientY,
      origX: this.viewX,
      origY: this.viewY
    };
    this.svg.classList.add('panning');
  }

  _updatePan(e) {
    const state = this.panState;
    this.viewX = state.origX + (e.clientX - state.startX);
    this.viewY = state.origY + (e.clientY - state.startY);
    this._updateTransform();
  }

  _endPan() {
    this.panState = null;
    this.svg.classList.remove('panning');
    this._emitZoomChange();
  }

  /* ─── Connection ─── */

  _startConnection(nodeId, pinId, e) {
    this.connectingState = {
      fromNode: nodeId,
      fromPin: pinId,
      startX: e.clientX,
      startY: e.clientY
    };

    const pinEl = e.target.closest('.pin');
    if (pinEl) pinEl.classList.add('dragging');
  }

  _updateConnection(e) {
    const state = this.connectingState;
    const rect = this.svg.getBoundingClientRect();
    const x1 = (state.startX - rect.left - this.viewX) / this.viewScale;
    const y1 = (state.startY - rect.top - this.viewY) / this.viewScale;
    const x2 = (e.clientX - rect.left - this.viewX) / this.viewScale;
    const y2 = (e.clientY - rect.top - this.viewY) / this.viewScale;

    this.tempEdgeLayer.innerHTML = '';
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const dx = Math.abs(x2 - x1);
    const cp = Math.max(50, dx * 0.5);
    path.setAttribute('d', `M ${x1} ${y1} C ${x1 + cp} ${y1}, ${x2 - cp} ${y2}, ${x2} ${y2}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#64B5F6');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-dasharray', '6,3');
    path.setAttribute('marker-end', 'url(#arrowhead-selected)');
    this.tempEdgeLayer.appendChild(path);

    this._highlightValidTarget(e);
  }

  _endConnection(e) {
    this.tempEdgeLayer.innerHTML = '';

    const pin = e.target.closest('.pin');
    if (pin) {
      const nodeId = pin.getAttribute('data-node');
      const pinId = pin.getAttribute('data-pin');
      const dir = pin.getAttribute('data-pin-dir');

      if (dir === 'input' && nodeId !== this.connectingState.fromNode) {
        this.addEdge(this.connectingState.fromNode, this.connectingState.fromPin, nodeId, pinId);
      }
    }

    document.querySelectorAll('.pin.dragging').forEach(el => el.classList.remove('dragging'));
    document.querySelectorAll('.pin.highlight-target').forEach(el => el.classList.remove('highlight-target'));
    this.connectingState = null;
  }

  _highlightValidTarget(e) {
    document.querySelectorAll('.pin.highlight-target').forEach(el => el.classList.remove('highlight-target'));
    const pin = e.target.closest('.pin');
    if (pin) {
      const dir = pin.getAttribute('data-pin-dir');
      const nodeId = pin.getAttribute('data-node');
      if (dir === 'input' && nodeId !== this.connectingState.fromNode) {
        pin.classList.add('highlight-target');
      }
    }
  }

  /* ─── Utils ─── */

  _updateStatusCoords(e) {
    const rect = this.svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) - this.viewX) / this.viewScale;
    const y = ((e.clientY - rect.top) - this.viewY) / this.viewScale;
    const coordsEl = document.getElementById('status-coords');
    if (coordsEl) {
      coordsEl.textContent = `X: ${Math.round(x)} Y: ${Math.round(y)}`;
    }
  }

  _emitZoomChange() {
    const el = document.getElementById('zoom-level');
    if (el) el.textContent = `${Math.round(this.viewScale * 100)}%`;
  }

  /* ─── Pin screen position helper ─── */

  getPinScreenPos(nodeId, pinId) {
    const node = this.nodes.get(nodeId);
    if (!node) return null;
    const group = this.nodesLayer.querySelector(`.node-group[data-id="${nodeId}"]`);
    if (!group) return null;
    const pinEl = group.querySelector(`.pin[data-pin="${pinId}"]`);
    if (!pinEl) return null;

    const cx = parseFloat(pinEl.getAttribute('cx'));
    const cy = parseFloat(pinEl.getAttribute('cy'));
    const worldX = (node.x + cx) * this.viewScale + this.viewX;
    const worldY = (node.y + cy) * this.viewScale + this.viewY;
    return { x: worldX, y: worldY };
  }

  /* ─── Node position helper ─── */

  getNodeAt(worldX, worldY) {
    let topNode = null;
    for (const node of this.nodes.values()) {
      if (worldX >= node.x && worldX <= node.x + node.width &&
          worldY >= node.y && worldY <= node.y + node.height) {
        topNode = node;
      }
    }
    return topNode;
  }

  screenToWorld(clientX, clientY) {
    const rect = this.svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left - this.viewX) / this.viewScale,
      y: (clientY - rect.top - this.viewY) / this.viewScale
    };
  }

  updateNodeName(id, name) {
    const node = this.nodes.get(id);
    if (!node) return;
    node.name = name;
    const group = this.nodesLayer.querySelector(`.node-group[data-id="${id}"]`);
    if (group) {
      const title = group.querySelector('.node-title');
      if (title) title.textContent = name;
    }
    this._emitChange();
  }

  updateNodeDoc(id, doc) {
    const node = this.nodes.get(id);
    if (node) node.doc = doc;
  }

  updateEdgeDoc(id, doc) {
    const edge = this.edges.get(id);
    if (edge) edge.doc = doc;
  }

  updateNodeDescription(id, desc) {
    const node = this.nodes.get(id);
    if (node) node.description = desc;
  }

  updateNodeInterfaces(id, figma, html) {
    const node = this.nodes.get(id);
    if (!node || !node.interfaces) return;
    node.interfaces.figma = figma;
    node.interfaces.html = html;
    this._emitChange();
  }

  updateDesignGuide(content) {
    this.designGuide = content;
    this._emitChange();
  }

  updateEdgeDescription(id, desc) {
    const edge = this.edges.get(id);
    if (edge) edge.description = desc;
  }

  updateEdgeLabel(id, label) {
    const edge = this.edges.get(id);
    if (!edge) return;
    edge.label = label;
    const group = this.edgesLayer.querySelector(`.edge-group[data-id="${id}"]`);
    if (group) {
      let text = group.querySelector('.edge-label');
      if (!text && label) {
        text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        const style = this._getEdgeStyle(edge, false);
        text.setAttribute('class', `edge-label ${style.label}`);
        text.setAttribute('text-anchor', 'middle');
        group.appendChild(text);
      }
      if (text) text.textContent = label;
    }
    this._updateEdgePath(edge);
  }

  updateNodeOrder(id, order) {
    const node = this.nodes.get(id);
    if (node) { node.implementationOrder = order; this._emitChange(); }
  }

  updateNodeStatus(id, status) {
    const node = this.nodes.get(id);
    if (node) { node.implementationStatus = status; this._emitChange(); }
  }

  addDiaryEntry(id, note) {
    const node = this.nodes.get(id);
    if (!node || !note.trim()) return;
    node.diary.push({ timestamp: new Date().toISOString(), note: note.trim() });
    this._emitChange();
  }
}
