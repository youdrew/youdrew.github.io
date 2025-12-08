(function () {
    const LANGUAGE_CYCLE = ['zh', 'en'];

    function resolveTranslation(translations, lang, key) {
        if (!translations || !lang || !key) return null;
        const parts = key.split('.');
        let result = translations[lang];
        for (const part of parts) {
            if (result && Object.prototype.hasOwnProperty.call(result, part)) {
                result = result[part];
            } else {
                return null;
            }
        }
        return typeof result === 'string' ? result : null;
    }

    function applyPlaceholders(template, vars) {
        if (typeof template !== 'string') return template;
        if (!vars) return template;
        return template.replace(/%([a-zA-Z0-9_]+)%/g, function (match, name) {
            if (Object.prototype.hasOwnProperty.call(vars, name)) {
                return vars[name];
            }
            return '';
        });
    }

    function getVars(el) {
        const raw = el.getAttribute('data-i18n-vars');
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch (err) {
            console.warn('Invalid data-i18n-vars JSON:', raw, err);
            return null;
        }
    }

    function applyLanguage(lang) {
        const translations = window.UI_LANG || {};
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(function (el) {
            const key = el.getAttribute('data-i18n');
            const fallback = el.getAttribute('data-i18n-default') || el.textContent;
            const vars = getVars(el);
            let value = resolveTranslation(translations, lang, key) || fallback;
            value = applyPlaceholders(value, vars);
            el.innerHTML = value;
        });

        document.documentElement.setAttribute('lang', lang);
        document.documentElement.dataset.lang = lang;
        localStorage.setItem('siteLang', lang);

        const toggle = document.querySelector('[data-lang-toggle]');
        if (toggle) {
            toggle.setAttribute('data-current-lang', lang);
            const nextLang = getNextLang(lang, translations);
            toggle.setAttribute('title', lang === 'zh' ? 'Switch to English' : '切换为中文');
            toggle.setAttribute('aria-label', lang === 'zh' ? '切换为中文' : 'Switch to English');
            toggle.dataset.nextLang = nextLang;
        }
    }

    function getNextLang(current, translations) {
        const available = LANGUAGE_CYCLE.filter(function (code) {
            return translations[code];
        });
        if (available.length === 0) {
            return current;
        }
        const idx = available.indexOf(current);
        if (idx === -1) {
            return available[0];
        }
        return available[(idx + 1) % available.length];
    }

    document.addEventListener('DOMContentLoaded', function () {
        const translations = window.UI_LANG || {};
        const defaultLang = window.UI_DEFAULT_LANG && translations[window.UI_DEFAULT_LANG]
            ? window.UI_DEFAULT_LANG
            : (translations.zh ? 'zh' : Object.keys(translations)[0]);
        let currentLang = localStorage.getItem('siteLang');
        if (!currentLang || !translations[currentLang]) {
            currentLang = defaultLang || 'en';
        }

        applyLanguage(currentLang);

        const toggleButton = document.querySelector('[data-lang-toggle]');
        if (toggleButton) {
            toggleButton.addEventListener('click', function () {
                const translations = window.UI_LANG || {};
                const next = getNextLang(localStorage.getItem('siteLang') || currentLang, translations);
                applyLanguage(next);
                currentLang = next;
            });
        }
    });
})();
