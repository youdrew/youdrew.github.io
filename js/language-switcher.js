/**
 * Language Switcher
 * Dynamically switches interface language between Chinese and English
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
            const text = link.textContent.trim();
            // Match both English and Chinese text
            if (translations[text] || translations[link.getAttribute('data-i18n-key')]) {
                const key = link.getAttribute('data-i18n-key') || text;
                if (translations[key]) {
                    link.textContent = translations[key];
                }
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

        // Update HTML lang attribute for screen readers and SEO
        document.documentElement.setAttribute('lang', lang);
    };

    // Switch language
    const switchLanguage = () => {
        const currentLang = getCurrentLanguage();
        const newLang = currentLang === 'zh-CN' ? 'en' : 'zh-CN';
        
        applyLanguage(newLang);
        
        const i18n = getI18nData();
        const message = i18n[newLang] ? i18n[newLang]['languageSwitched'] : 'Language switched';
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
        const currentLang = getCurrentLanguage();
        applyLanguage(currentLang);
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
