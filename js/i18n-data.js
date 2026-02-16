/**
 * i18n Data
 * 界面元素的中英文对照数据
 */

const i18nData = {
    'en': {
        // Navigation menu
        'Home': 'Home',
        'Archives': 'Archives',
        'About': 'About',
        'Portfolio': 'Portfolio',
        
        // Tooltips
        'Bilibili': 'Bilibili',
        'Instagram': 'Instagram',
        'Douban': 'Douban',
        'Email': 'Email',
        'RSS': 'RSS',
        'Language': 'Language',
        
        // Footer
        'Copyright': 'Copyright',
        'Powered by': 'Powered by',
        'Modified based on': 'Modified based on',
        'theme': 'theme',
        
        // Pagination
        'Older Posts': 'Older Posts',
        'Newer Posts': 'Newer Posts',
        
        // Other
        'Comments': 'Comments',
        'Archives': 'Archives',
        
        // Article language switch
        'Switch to Chinese': 'Switch to Chinese',
        'Switch to English': 'Switch to English',
        'View Chinese Version': '查看中文版',
        'View English Version': 'View English Version',
        
        // Notification
        'languageSwitched': 'Switched to English',
        'articleLanguageSwitched': 'Switched to English version'
    },
    'zh-CN': {
        // Navigation menu
        'Home': '首页',
        'Archives': '归档',
        'About': '关于',
        'Portfolio': '作品集',
        
        // Tooltips
        'Bilibili': '哔哩哔哩',
        'Instagram': 'Instagram',
        'Douban': '豆瓣',
        'Email': '邮箱',
        'RSS': 'RSS',
        'Language': '语言',
        
        // Footer
        'Copyright': '版权所有',
        'Powered by': '技术支持',
        'Modified based on': '基于',
        'theme': '主题',
        
        // Pagination
        'Older Posts': '上一页',
        'Newer Posts': '下一页',
        
        // Other
        'Comments': '留言',
        'Archives': '归档',
        
        // Article language switch
        'Switch to Chinese': '切换至中文',
        'Switch to English': '切换至英文',
        'View Chinese Version': '查看中文版',
        'View English Version': 'View English Version',
        
        // Notification
        'languageSwitched': '已切换至中文',
        'articleLanguageSwitched': '已切换至中文版本'
    }
};

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.i18nData = i18nData;
}
