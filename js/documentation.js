class DocumentationPanel {
  constructor() {
    this.graph = null;
    this.currentType = null;
    this.currentId = null;
    this.editing = false;

    this.docEditor = document.getElementById('doc-editor');
    this.docPreview = document.getElementById('doc-preview');
    this.docSection = document.getElementById('doc-section');
    this.docPlaceholder = document.getElementById('doc-placeholder');
    this.propContent = document.getElementById('prop-content');
    this.propPlaceholder = document.getElementById('prop-placeholder');

    this.propName = document.getElementById('prop-name');
    this.propType = document.getElementById('prop-type');
    this.propId = document.getElementById('prop-id');
    this.propDescription = document.getElementById('prop-description');
    this.propEdgeSection = document.getElementById('prop-edge-section');
    this.propEdgeFrom = document.getElementById('prop-edge-from');
    this.propEdgeTo = document.getElementById('prop-edge-to');

    this.propInterfaceSection = document.getElementById('prop-interface-section');
    this.propFigmaUrl = document.getElementById('prop-figma-url');
    this.propHtmlUrl = document.getElementById('prop-html-url');
    this.propInterfaceHint = document.getElementById('prop-interface-hint');

    this.propScreenChildren = document.getElementById('prop-screen-children');
    this.propChildrenList = document.getElementById('prop-children-list');

    this.propImplSection = document.getElementById('prop-impl-section');
    this.propOrder = document.getElementById('prop-order');
    this.propStatus = document.getElementById('prop-status');
    this.propDiarySection = document.getElementById('prop-diary-section');
    this.propDiaryList = document.getElementById('prop-diary-list');
    this.propDiaryInput = document.getElementById('prop-diary-input');
    this.propDiaryAddBtn = document.getElementById('prop-diary-add-btn');

    this._bindEvents();
  }

  setGraph(graph) {
    this.graph = graph;
  }

  _bindEvents() {
    document.getElementById('doc-edit-btn').addEventListener('click', () => this._switchMode('edit'));
    document.getElementById('doc-preview-btn').addEventListener('click', () => this._switchMode('preview'));
    document.getElementById('doc-template-btn').addEventListener('click', () => this._insertTemplate());

    this.docEditor.addEventListener('input', () => {
      if (this.currentType === 'designGuide' && this.graph) {
        this.graph.updateDesignGuide(this.docEditor.value);
      } else if (this.currentType && this.currentId) {
        this._saveDoc();
      }
    });

    this.propName.addEventListener('input', () => {
      if (this.currentType === 'node' && this.currentId && this.graph) {
        this.graph.updateNodeName(this.currentId, this.propName.value);
      } else if (this.currentType === 'edge' && this.currentId && this.graph) {
        this.graph.updateEdgeLabel(this.currentId, this.propName.value);
      }
    });

    this.propDescription.addEventListener('input', () => {
      if (this.currentType === 'node' && this.currentId && this.graph) {
        this.graph.updateNodeDescription(this.currentId, this.propDescription.value);
      } else if (this.currentType === 'edge' && this.currentId && this.graph) {
        this.graph.updateEdgeDescription(this.currentId, this.propDescription.value);
      }
    });

    this.propOrder.addEventListener('input', () => {
      if (this.currentType === 'node' && this.currentId && this.graph) {
        this.graph.updateNodeOrder(this.currentId, parseInt(this.propOrder.value, 10) || 0);
      }
    });

    this.propStatus.addEventListener('change', () => {
      if (this.currentType === 'node' && this.currentId && this.graph) {
        this.graph.updateNodeStatus(this.currentId, this.propStatus.value);
      }
    });

    this.propDiaryAddBtn.addEventListener('click', () => this._addDiaryEntry());
    this.propDiaryInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._addDiaryEntry();
    });
  }

  showNode(node) {
    this.currentType = 'node';
    this.currentId = node.id;
    this.editing = true;

    this.propContent.classList.remove('hidden');
    this.propPlaceholder.classList.add('hidden');
    this.docSection.classList.remove('hidden');
    this.docPlaceholder.classList.add('hidden');

    this.propEdgeSection.style.display = 'none';
    this.propImplSection.classList.remove('hidden');

    if (node.type === 'Screen') {
      if (node.interfaces) {
        this.propInterfaceSection.classList.remove('hidden');
        this.propFigmaUrl.value = node.interfaces.figma || '';
        this.propHtmlUrl.value = node.interfaces.html || '';
        const hasAny = node.interfaces.figma || node.interfaces.html;
        this.propInterfaceHint.classList.toggle('hidden', hasAny);
      } else {
        this.propInterfaceSection.classList.add('hidden');
      }
      if (this.propScreenChildren && this.graph) {
        this.propScreenChildren.classList.remove('hidden');
        this._renderChildrenList(node);
      }
    } else {
      this.propInterfaceSection.classList.add('hidden');
      if (this.propScreenChildren) this.propScreenChildren.classList.add('hidden');
    }

    this.propName.value = node.name;
    this.propType.value = getTemplateLabel(node.type);
    this.propId.value = node.id;
    this.propDescription.value = node.description || '';
    this.propOrder.value = node.implementationOrder || 0;
    this.propStatus.value = node.implementationStatus || 'pending';

    this.propDiarySection.classList.remove('hidden');
    this._renderDiaryEntries(node);

    this._loadDoc(node.doc || '');
    document.getElementById('doc-edit-btn').click();
  }

  showEdge(edge) {
    this.currentType = 'edge';
    this.currentId = edge.id;
    this.editing = true;

    this.propContent.classList.remove('hidden');
    this.propPlaceholder.classList.add('hidden');
    this.docSection.classList.remove('hidden');
    this.docPlaceholder.classList.add('hidden');

    this.propEdgeSection.style.display = 'block';
    this.propImplSection.classList.add('hidden');

    const fromNode = this.graph ? this.graph.getNode(edge.fromNode) : null;
    const toNode = this.graph ? this.graph.getNode(edge.toNode) : null;

    this.propName.value = edge.label || '';
    this.propType.value = t('properties.connection');
    this.propId.value = edge.id;
    this.propDescription.value = edge.description || '';
    this.propEdgeFrom.value = fromNode ? fromNode.name : edge.fromNode;
    this.propEdgeTo.value = toNode ? toNode.name : edge.toNode;

    this._loadDoc(edge.doc || '');
    document.getElementById('doc-edit-btn').click();
  }

  clear() {
    this.currentType = null;
    this.currentId = null;
    this.editing = false;

    this.propContent.classList.add('hidden');
    this.propPlaceholder.classList.remove('hidden');
    this.docSection.classList.add('hidden');
    this.docPlaceholder.classList.remove('hidden');
    this.propInterfaceSection.classList.add('hidden');
    this.propImplSection.classList.add('hidden');
  }

  showDesignGuide(content) {
    this.currentType = 'designGuide';
    this.currentId = null;
    this.editing = true;

    this.propContent.classList.remove('hidden');
    this.propPlaceholder.classList.add('hidden');
    this.docSection.classList.remove('hidden');
    this.docPlaceholder.classList.add('hidden');
    this.propInterfaceSection.classList.add('hidden');

    this.propEdgeSection.style.display = 'none';
    this.propImplSection.classList.add('hidden');
    this.propName.value = t('designGuide.title');
    this.propType.value = '';
    this.propId.value = 'design-guide';
    this.propDescription.value = '';

    this._loadDoc(content || '');
    document.getElementById('doc-edit-btn').click();
  }

  _loadDoc(content) {
    this.docEditor.value = content;
    this._renderPreview(content);
  }

  _switchMode(mode) {
    const editBtn = document.getElementById('doc-edit-btn');
    const previewBtn = document.getElementById('doc-preview-btn');

    if (mode === 'edit') {
      this.docEditor.classList.remove('hidden');
      this.docPreview.classList.add('hidden');
      editBtn.classList.add('active');
      previewBtn.classList.remove('active');
    } else {
      this.docEditor.classList.add('hidden');
      this.docPreview.classList.remove('hidden');
      editBtn.classList.remove('active');
      previewBtn.classList.add('active');
      this._renderPreview(this.docEditor.value);
    }
  }

  _renderPreview(markdown) {
    this.docPreview.innerHTML = this._markdownToHTML(markdown);
  }

  _saveDoc() {
    const content = this.docEditor.value;
    if (this.currentType === 'node' && this.graph) {
      this.graph.updateNodeDoc(this.currentId, content);
    } else if (this.currentType === 'edge' && this.graph) {
      this.graph.updateEdgeDoc(this.currentId, content);
    }
  }

  _insertTemplate() {
    if (this.currentType === 'node' && this.graph) {
      const node = this.graph.getNode(this.currentId);
      if (node) {
        const currentDoc = this.docEditor.value;
        if (currentDoc && currentDoc.trim() && !confirm(t('confirm.applyTemplate'))) return;
        const customFields = node.interfaces || {};
        const doc = generateDocFromTemplate(node.type, node.name, customFields);
        this._loadDoc(doc);
        this._saveDoc();
      }
    }
  }

  _renderChildrenList(screen) {
    if (!this.propChildrenList) return;
    const children = this.graph.getScreenChildren(screen.id);
    if (!children || children.length === 0) {
      this.propChildrenList.innerHTML = `<div class="prop-interface-hint">${t('screen.noChildren')}</div>`;
      return;
    }
    this.propChildrenList.innerHTML = '';
    for (const child of children) {
      const row = document.createElement('div');
      row.className = 'screen-child-row';
      const label = getTemplateLabel(child.type);
      const name = document.createElement('span');
      name.className = 'screen-child-name';
      name.textContent = `${label}: ${child.name}`;
      name.addEventListener('click', () => {
        if (this.graph) this.graph.selectNode(child.id);
      });
      const removeBtn = document.createElement('button');
      removeBtn.className = 'tb-btn-sm screen-child-remove';
      removeBtn.textContent = '✕';
      removeBtn.title = t('screen.removeChild');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.graph) {
          this.graph.removeChildFromScreen(screen.id, child.id);
          const updated = this.graph.getNode(screen.id);
          if (updated) this._renderChildrenList(updated);
        }
      });
      row.appendChild(name);
      row.appendChild(removeBtn);
      this.propChildrenList.appendChild(row);
    }
  }

  getCurrentDoc() {
    if (this.currentType === 'node' && this.graph) {
      const node = this.graph.getNode(this.currentId);
      return node ? node.doc : '';
    }
    if (this.currentType === 'edge' && this.graph) {
      const edge = this.graph.getEdge(this.currentId);
      return edge ? edge.doc : '';
    }
    return '';
  }

  _addDiaryEntry() {
    const note = this.propDiaryInput.value.trim();
    if (!note || !this.currentId || !this.graph) return;
    this.graph.addDiaryEntry(this.currentId, note);
    this.propDiaryInput.value = '';
    const node = this.graph.getNode(this.currentId);
    if (node) this._renderDiaryEntries(node);
  }

  _renderDiaryEntries(node) {
    if (!this.propDiaryList) return;
    const diary = node.diary || [];
    if (diary.length === 0) {
      this.propDiarySection.classList.add('hidden');
      return;
    }
    this.propDiarySection.classList.remove('hidden');
    this.propDiaryList.innerHTML = '';
    for (const entry of diary) {
      const div = document.createElement('div');
      div.className = 'prop-diary-entry';
      const ts = document.createElement('span');
      ts.className = 'diary-timestamp';
      const d = new Date(entry.timestamp);
      ts.textContent = d.toLocaleString();
      const note = document.createElement('span');
      note.className = 'diary-note';
      note.textContent = entry.note;
      div.appendChild(ts);
      div.appendChild(note);
      this.propDiaryList.appendChild(div);
    }
    this.propDiaryList.scrollTop = this.propDiaryList.scrollHeight;
  }

  /* ─── Simple Markdown Parser ─── */

  _markdownToHTML(md) {
    if (!md) return `<p style="color:var(--text-muted)">${t('doc.noDoc')}</p>`;

    let html = md;

    html = html.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');

    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');

    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    html = html.replace(/^(\d+)\. (.+)$/gm, '<li value="$1">$2</li>');

    html = html.replace(/(<li value=".*<\/li>\n?)+/g, '<ol>$&</ol>');

    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');

    html = html.replace(/^---$/gm, '<hr>');

    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    html = html.replace(/^((?!<[houbp<]\s).+)$/gm, (match) => {
      const trimmed = match.trim();
      if (!trimmed || trimmed.startsWith('<')) return match;
      return `<p>${trimmed}</p>`;
    });

    html = html.replace(/<\/ul>\s*<ul>/g, '');
    html = html.replace(/<\/ol>\s*<ol>/g, '');
    html = html.replace(/<\/blockquote>\s*<blockquote>/g, '<br>');

    return html;
  }
}
