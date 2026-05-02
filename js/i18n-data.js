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
        'GitHub': 'GitHub',
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
        'Mainly maintained using AI': 'Mainly maintained using AI',
        
        // Pagination
        'Older Posts': 'Older Posts',
        'Newer Posts': 'Newer Posts',
        
        // Other
        'Comments': 'Comments',

        // Article language switch
        'Switch to Chinese': 'Switch to Chinese',
        'Switch to English': 'Switch to English',
        'View Chinese Version': '查看中文版',
        'View English Version': 'View English Version',
        
        // Notification
        'languageSwitched': 'Switched to English',
        'articleLanguageSwitched': 'Switched to English version',

        // Tag graph
        'tag-graph-hint': 'Click tag to explore · Scroll to zoom · Drag to rearrange'
    },
    'zh-CN': {
        // Navigation menu
        'Home': '首页',
        'Archives': '归档',
        'About': '关于',
        'Portfolio': '作品集',
        
        // Tooltips
        'Bilibili': '哔哩哔哩',
        'GitHub': 'GitHub',
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
        'Mainly maintained using AI': '主要使用AI来维护',
        
        // Pagination
        'Older Posts': '上一页',
        'Newer Posts': '下一页',
        
        // Other
        'Comments': '留言',

        // Article language switch
        'Switch to Chinese': '切换至中文',
        'Switch to English': '切换至英文',
        'View Chinese Version': '查看中文版',
        'View English Version': 'View English Version',
        
        // Notification
        'languageSwitched': '已切换至中文',
        'articleLanguageSwitched': '已切换至中文版本',

        // Tag graph
        'tag-graph-hint': '点击标签探索 · 滚轮缩放 · 拖拽移动'
    }
};

// Tag name translations (English -> Chinese)
// Tags not listed here will keep their original name
const tagTranslations = {
    'Software Projects': '软件项目',
    'Learning Notes': '学习笔记',
    'Peresonal Essays': '个人随笔',
    'Art Pieces': '艺术作品',
    'Game-Development': '游戏开发',
    'Game-Framework': '游戏框架',
    'Gameplay-Ability-System': '游戏能力系统',
    'Graphics-Programming': '图形编程',
    'Computer-Graphics': '计算机图形学',
    'Network-Programming': '网络编程',
    'Unreal-Engine': '虚幻引擎',
    'Vibe-Coding': '氛围编程',
    'Game-Development-Shader-001': '游戏开发着色器-001',
    'Subscription': '订阅',
    'Shader': '着色器'
};

// Build reverse mapping (Chinese -> English) automatically
const tagTranslationsReverse = {};
for (const [en, zh] of Object.entries(tagTranslations)) {
    tagTranslationsReverse[zh] = en;
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.i18nData = i18nData;
    window.tagTranslations = tagTranslations;
    window.tagTranslationsReverse = tagTranslationsReverse;
}
