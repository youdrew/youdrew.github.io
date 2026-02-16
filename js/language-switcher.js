/**
 * Language Switcher
 * Dynamically switches interface language and article version
 */

(function() {
    'use strict';

    // Get i18n data
    const getI18nData = () => window.i18nData || {};

    // Get browser language
    const getBrowserLanguage = () => {
        const lang = navigator.language || navigator.userLanguage;
        return lang.startsWith('zh') ? 'zh-CN' : 'en';
    };

    // Get current language from localStorage or browser
    const getCurrentLanguage = () => {
        return localStorage.getItem('siteLanguage') || getBrowserLanguage();
    };

    // Get current page language from URL and meta tag
    const getCurrentPageLanguage = () => {
        const path = window.location.pathname;
        
        // Check if URL contains .zh-CN
        if (path.includes('.zh-CN')) {
            return 'zh-CN';
        }
        
        // Check meta tag
        const langMeta = document.querySelector('meta[name="article:lang"]');
        if (langMeta) {
            return langMeta.content;
        }
        
        // Default to en
        return 'en';
    };

    // Generate alternate language URL
    const getAlternateLanguageUrl = (currentPageLang, targetLang) => {
        const path = window.location.pathname;
        
        if (targetLang === 'zh-CN' && currentPageLang === 'en') {
            // Switch from English to Chinese: add .zh-CN
            // /about/ -> /about/index.zh-CN.html
            // /2025/01/01/my-post/ -> /2025/01/01/my-post/index.zh-CN.html
            if (path.endsWith('/')) {
                return path + 'index.zh-CN.html';
            } else if (path.endsWith('.html')) {
                return path.replace(/\.html$/, '.zh-CN.html');
            } else {
                return path + '/index.zh-CN.html';
            }
        } else if (targetLang === 'en' && currentPageLang === 'zh-CN') {
            // Switch from Chinese to English: remove .zh-CN
            // /about/index.zh-CN.html -> /about/
            // Handle both /index.zh-CN.html and .zh-CN.html patterns
            if (path.includes('/index.zh-CN.html')) {
                return path.replace('/index.zh-CN.html', '/');
            } else if (path.includes('.zh-CN.html')) {
                return path.replace('.zh-CN.html', '.html');
            } else if (path.includes('.zh-CN')) {
                return path.replace('.zh-CN', '');
            }
        }
        
        return null;
    };

    // Check if alternate version exists
    const checkAlternateVersionExists = async (url) => {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            return false;
        }
    };

    // Update page language
    const applyLanguage = (lang) => {
        const i18n = getI18nData();
        const translations = i18n[lang];
        
        if (!translations) {
            console.warn('Language data not available for:', lang);
            return;
        }

        // Update document language
        document.documentElement.lang = lang;

        // Update navigation menu items
        const navLinks = document.querySelectorAll('nav ul li a');
        navLinks.forEach(link => {
            const key = link.getAttribute('data-i18n-key');
            if (key && translations[key]) {
                link.textContent = translations[key];
            }
        });

        // Update elements with data-i18n attribute
        const i18nElements = document.querySelectorAll('[data-i18n]');
        i18nElements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (translations[key]) {
                element.textContent = translations[key];
            }
        });

        // Update tooltips (data-title attributes)
        const tooltipElements = document.querySelectorAll('[data-title]');
        tooltipElements.forEach(element => {
            const key = element.getAttribute('data-title');
            // Only update if it's a known translation key
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

        // Save language preference
        localStorage.setItem('siteLanguage', lang);
    };

    // Switch language and navigate to alternate version if exists
    const switchLanguage = async () => {
        const currentInterfaceLang = getCurrentLanguage();
        const currentPageLang = getCurrentPageLanguage();
        const targetLang = currentInterfaceLang === 'zh-CN' ? 'en' : 'zh-CN';
        
        // Try to find alternate language version
        const alternateUrl = getAlternateLanguageUrl(currentPageLang, targetLang);
        
        if (alternateUrl) {
            // Check if alternate version exists
            const exists = await checkAlternateVersionExists(alternateUrl);
            
            if (exists) {
                // Apply language and redirect
                localStorage.setItem('siteLanguage', targetLang);
                window.location.href = alternateUrl;
                return;
            }
        }
        
        // If no alternate version exists, just switch interface language
        applyLanguage(targetLang);
        
        const i18n = getI18nData();
        const message = i18n[targetLang] ? i18n[targetLang]['languageSwitched'] : 'Language switched';
        showNotification(message);
    };

    // Show notification
    const showNotification = (message) => {
        // Remove any existing notifications
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

    // Initialize language on page load
    const initLanguage = () => {
        const preferredLang = getCurrentLanguage();
        const currentPageLang = getCurrentPageLanguage();
        
        // Apply interface language
        applyLanguage(preferredLang);
        
        // If interface language doesn't match page language, check if we should redirect
        if (preferredLang !== currentPageLang) {
            const alternateUrl = getAlternateLanguageUrl(currentPageLang, preferredLang);
            
            if (alternateUrl) {
                checkAlternateVersionExists(alternateUrl).then(exists => {
                    if (exists) {
                        // Silently redirect to preferred language version
                        window.location.replace(alternateUrl);
                    }
                });
            }
        }
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLanguage);
    } else {
        initLanguage();
    }

    // Bind language switcher on page load
    window.addEventListener('load', () => {
        const langSwitch = document.getElementById('langSwitch');
        if (langSwitch) {
            langSwitch.addEventListener('click', (e) => {
                e.preventDefault();
                switchLanguage();
            });
        }
    });

})();
