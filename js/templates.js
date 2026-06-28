const TEMPLATES = {
  Start: {
    color: '#4CAF50',
    icon: '\u25B6',
    width: 140,
    height: 46,
    shape: 'capsule',
    pins: {
      outputs: [{ id: 'out' }]
    }
  },

  Process: {
    color: '#2196F3',
    icon: '\u2699',
    width: 160,
    height: 52,
    shape: 'rect',
    pins: {
      inputs: [{ id: 'in' }],
      outputs: [{ id: 'out' }]
    }
  },

  Decision: {
    color: '#FF9800',
    icon: '\u25C7',
    width: 160,
    height: 80,
    shape: 'diamond',
    pins: {
      inputs: [{ id: 'in' }],
      outputs: [
        { id: 'yes' },
        { id: 'no' }
      ]
    }
  },

  Document: {
    color: '#FFC107',
    icon: '\uD83D\uDCC4',
    width: 160,
    height: 52,
    shape: 'rect',
    pins: {
      inputs: [{ id: 'in' }],
      outputs: [{ id: 'out' }]
    }
  },

  SubGraph: {
    color: '#9C27B0',
    icon: '\u229E',
    width: 160,
    height: 52,
    shape: 'subgraph',
    pins: {
      inputs: [{ id: 'in' }],
      outputs: [{ id: 'out' }]
    }
  },

  Screen: {
    color: '#00BCD4',
    icon: '\uD83D\uDDA5',
    width: 170,
    height: 60,
    shape: 'rect',
    pins: {
      inputs: [{ id: 'in' }],
      outputs: [{ id: 'out' }]
    }
  },

  End: {
    color: '#f44336',
    icon: '\u25A0',
    width: 140,
    height: 46,
    shape: 'capsule',
    pins: {
      inputs: [{ id: 'in' }]
    }
  }
};

function getTemplate(type) {
  return TEMPLATES[type] || TEMPLATES.Process;
}

function getTemplateLabel(type) {
  return t(`nodeType.${type}.label`);
}

function getTemplateDefaultName(type) {
  return t(`nodeType.${type}.defaultName`);
}

function getPinLabel(type, pinId) {
  return t(`nodeType.${type}.pin.${pinId}`);
}

function getDocTemplate(type) {
  const fromT = t(`nodeType.${type}.docTemplate`);
  const fromDef = TEMPLATE_DOC_DEFAULTS[type];
  return fromT || fromDef || '';
}

function generateDocFromTemplate(type, name, customFields) {
  let doc = getDocTemplate(type);
  doc = doc.replace(/\{\{name\}\}/g, name);
  if (customFields) {
    for (const [key, val] of Object.entries(customFields)) {
      doc = doc.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val || '');
    }
  }
  doc = doc.replace(/\{\{\w+\}\}/g, '');
  return doc;
}

function getNodeTypes() {
  return Object.keys(TEMPLATES);
}

function getEdgeDocTemplate(fromName, toName) {
  const tpl = t('edge.docTemplate');
  return tpl
    .replace(/\{from\}/g, fromName)
    .replace(/\{to\}/g, toName);
}

const TEMPLATE_DOC_DEFAULTS = {
  Start:
    '# Start: {{name}}\n\n' +
    '## Purpose\n' +
    'Describe the entry point of the flow.\n\n' +
    '## Activation\n' +
    '- **Trigger**: Describe what starts this flow\n' +
    '- **Conditions**: Prerequisites\n\n' +
    '## Outputs\n' +
    '- **Out**: Main process flow\n',

  Process:
    '# Process: {{name}}\n\n' +
    '## Description\n' +
    'Explain what this process does.\n\n' +
    '## Inputs\n' +
    '- **In**: Data received\n\n' +
    '## Processing\n' +
    'Detail the internal steps of the process.\n\n' +
    '## Outputs\n' +
    '- **Out**: Process result\n\n' +
    '## Notes\n' +
    '- Important considerations\n',

  Decision:
    '# Decision: {{name}}\n\n' +
    '## Question\n' +
    'What condition is being evaluated?\n\n' +
    '## Criteria\n' +
    'Describe the decision logic.\n\n' +
    '## Branches\n' +
    '- **Yes**: {{yesDescription}}\n' +
    '- **No**: {{noDescription}}\n\n' +
    '## Considerations\n' +
    '- Factors to take into account\n',

  Document:
    '# Document: {{name}}\n\n' +
    '## Content\n' +
    'Detailed description of the document.\n\n' +
    '## Format\n' +
    '- **Type**: Technical documentation\n' +
    '- **Extension**: .md / .pdf\n\n' +
    '## References\n' +
    '- Links to related resources\n',

  SubGraph:
    '# SubGraph: {{name}}\n\n' +
    '## Description\n' +
    'This node groups a set of subprocesses.\n\n' +
    '## Internal components\n' +
    'List the elements contained in this SubGraph.\n\n' +
    '## Interface\n' +
    '- **Input**: {{inDescription}}\n' +
    '- **Output**: {{outDescription}}\n',

  Screen:
    '# Screen: {{name}}\n\n' +
    '## Description\n' +
    'Describe this UI screen.\n\n' +
    '## Design References\n' +
    '- **Figma**: {{figmaUrl}}\n' +
    '- **HTML Prototype**: {{htmlUrl}}\n\n' +
    '## Elements\n' +
    'List the UI components on this screen.\n\n' +
    '## Interactions\n' +
    'Describe user interactions on this screen.\n',

  End:
    '# End: {{name}}\n\n' +
    '## Result\n' +
    'Describe the final result of the flow.\n\n' +
    '## Generated outputs\n' +
    '- List the resulting artifacts or decisions.\n\n' +
    '## Post-conditions\n' +
    'System state upon completion.\n'
};
