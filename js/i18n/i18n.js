const _translations = window._translations || {};
let _current = 'es';
let _defaultLang = 'es';

function t(key, ...args) {
  const langData = _translations[_current];
  const fallback = _defaultLang !== _current ? _translations[_defaultLang] : null;

  let val = null;
  if (langData && langData[key] != null) val = langData[key];
  if (val == null && fallback && fallback[key] != null) val = fallback[key];
  if (val == null) val = key;

  if (args.length > 0 && typeof val === 'string') {
    args.forEach((arg, i) => {
      val = val.replace(new RegExp(`\\{${i}\\}`, 'g'), arg);
    });
  }

  return val;
}

function tFormat(template, ...args) {
  let result = template;
  args.forEach((arg, i) => {
    result = result.replace(new RegExp(`\\{${i}\\}`, 'g'), arg);
  });
  return result;
}

function _translateDOM(root) {
  root = root || document;
  root.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });
  root.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    el.title = t(key);
  });
}

async function setLanguage(lang) {
  if (lang === _current) return;
  if (lang === 'es') {
    _current = 'es';
    _translateDOM();
    document.documentElement.lang = 'es';
    document.dispatchEvent(new CustomEvent('languagechange', { detail: { lang: 'es' } }));
    return;
  }

  if (!_translations[lang]) {
    try {
      const resp = await fetch(`js/i18n/${lang}.json`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      _translations[lang] = await resp.json();
    } catch (e) {
      console.warn(`No se pudo cargar el idioma "${lang}":`, e);
      return;
    }
  }

  _current = lang;
  _translateDOM();
  document.documentElement.lang = lang;
  document.dispatchEvent(new CustomEvent('languagechange', { detail: { lang } }));
}

function getCurrentLang() {
  return _current;
}

document.addEventListener('DOMContentLoaded', () => {
  _translateDOM();
});
