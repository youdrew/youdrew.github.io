/**
 * Language Switcher
 * Switches the interface language and, when the current page has an alternate
 * language version, navigates to it.
 *
 * Phase 4 change: alternate page URLs are now resolved at build time via
 * `<link rel="alternate" hreflang="...">` tags in <head>, instead of probing
 * candidate URLs at runtime with fetch HEAD. One fewer round trip per click,
 * and no false positives from servers that 200 on missing pages.
 *
 * Phase 8 change: ESM module. i18nData is imported directly; tagTranslations
 * is still read from window.tagTranslations because it is injected by
 * after-footer.ejs at build time (single source of truth in theme _config.yml).
 */
import { i18nData } from './i18n-data.js';

const getBrowserLanguage = () => {
  const lang = navigator.language || navigator.userLanguage;
  return lang.startsWith('zh') ? 'zh-CN' : 'en';
};

const getCurrentLanguage = () => {
  return localStorage.getItem('siteLanguage') || getBrowserLanguage();
};

// Get current page language from <meta name="article:lang"> or URL fallback.
const getCurrentPageLanguage = () => {
  const langMeta = document.querySelector('meta[name="article:lang"]');
  if (langMeta) return langMeta.content;

  if (window.location.pathname.includes('.zh-CN')) return 'zh-CN';
  return 'en';
};

// Look up the alternate-language URL emitted by the build
// (<link rel="alternate" hreflang="..."> in <head>).
const getAlternateUrl = (targetLang) => {
  const link = document.querySelector(`link[rel="alternate"][hreflang="${targetLang}"]`);
  return link ? link.href : null;
};

const applyLanguage = (lang) => {
  const translations = i18nData[lang];

  if (!translations) {
    console.warn('Language data not available for:', lang);
    return;
  }

  document.documentElement.lang = lang;

  // Update navigation menu items
  const navLinks = document.querySelectorAll('nav ul li a');
  navLinks.forEach((link) => {
    const key = link.getAttribute('data-i18n-key');
    if (key && translations[key]) {
      link.textContent = translations[key];
    }
  });

  // Update elements with data-i18n attribute
  const i18nElements = document.querySelectorAll('[data-i18n]');
  i18nElements.forEach((element) => {
    const key = element.getAttribute('data-i18n');
    if (translations[key]) {
      element.textContent = translations[key];
    }
  });

  // Update tooltips (data-title attributes)
  const tooltipElements = document.querySelectorAll('[data-title]');
  tooltipElements.forEach((element) => {
    const key = element.getAttribute('data-title');
    if (translations[key]) {
      element.setAttribute('data-title', translations[key]);
    }
  });

  // Update pagination links
  const olderPosts = document.querySelector('.pagination .extend.prev');
  const newerPosts = document.querySelector('.pagination .extend.next');
  if (olderPosts) {
    olderPosts.textContent = translations['Older Posts'] || olderPosts.textContent;
  }
  if (newerPosts) {
    newerPosts.textContent = translations['Newer Posts'] || newerPosts.textContent;
  }

  localStorage.setItem('siteLanguage', lang);

  // Translate tag names
  const tagElements = document.querySelectorAll('[data-i18n-tag]');
  tagElements.forEach((element) => {
    const originalTag = element.getAttribute('data-i18n-tag');
    if (lang === 'zh-CN') {
      const zhName = window.tagTranslations && window.tagTranslations[originalTag];
      if (zhName) {
        element.textContent = zhName;
      }
    } else {
      element.textContent = originalTag;
    }
  });
};

const showNotification = (message) => {
  const existingNotification = document.querySelector('.lang-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement('div');
  notification.className = 'lang-notification';
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 2000);
};

const switchLanguage = () => {
  const currentInterfaceLang = getCurrentLanguage();
  const targetLang = currentInterfaceLang === 'zh-CN' ? 'en' : 'zh-CN';

  const alternateUrl = getAlternateUrl(targetLang);
  if (alternateUrl) {
    localStorage.setItem('siteLanguage', targetLang);
    window.location.href = alternateUrl;
    return;
  }

  applyLanguage(targetLang);

  const message = i18nData[targetLang]
    ? i18nData[targetLang]['languageSwitched']
    : 'Language switched';
  showNotification(message);
};

const initLanguage = () => {
  const preferredLang = getCurrentLanguage();
  const currentPageLang = getCurrentPageLanguage();

  applyLanguage(preferredLang);

  // If the page we landed on isn't in the preferred language and an
  // alternate exists, silently redirect to it.
  if (preferredLang !== currentPageLang) {
    const alternateUrl = getAlternateUrl(preferredLang);
    if (alternateUrl) {
      window.location.replace(alternateUrl);
    }
  }
};

export function initLanguageSwitcher() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLanguage);
  } else {
    initLanguage();
  }

  window.addEventListener('load', () => {
    const langSwitch = document.getElementById('langSwitch');
    if (langSwitch) {
      langSwitch.addEventListener('click', (e) => {
        e.preventDefault();
        switchLanguage();
      });
    }
  });
}
