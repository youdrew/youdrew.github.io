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
        
        // Notification
        'languageSwitched': 'Switched to English'
    },
    'zh-CN': {
        // Navigation menu
        'Home': '首页',
        'Archives': '归档',
        'About': '关于',
        
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
        
        // Notification
        'languageSwitched': '已切换至中文'
    }
};

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.i18nData = i18nData;
}
