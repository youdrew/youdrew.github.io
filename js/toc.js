class TableOfContents {
    constructor() {
        this.init();
    }

    init() {
        // 确保在文章页面上，但不在Archives页面上
        const content = document.querySelector('.content');
        if (!content) return;
        
        // 如果是Archives页面，不显示TOC
        if (content.classList.contains('archives')) return;

        this.createTocContainer();
        this.generateToc();
    }

    createTocContainer() {
        const container = document.createElement('div');
        container.className = 'toc-container';
        container.innerHTML = `
            <div class="toc-header">
                <h3 class="toc-title">文档导航</h3>
            </div>
            <div class="toc-content">
                <ul class="toc-list"></ul>
            </div>
        `;
        document.body.appendChild(container);

        this.container = container;
        this.list = container.querySelector('.toc-list');
    }

    generateToc() {
        const content = document.querySelector('.content');
        const headers = content.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        headers.forEach((header, index) => {
            // 为每个标题创建唯一ID
            const id = `header-${index}`;
            header.id = id;
            
            // 创建目录项
            const level = parseInt(header.tagName[1]);
            const item = document.createElement('li');
            item.className = 'toc-item';
            item.setAttribute('data-level', level);
            item.textContent = header.textContent;
            
            // 添加点击事件
            item.addEventListener('click', (e) => {
                e.preventDefault();
                header.scrollIntoView({ behavior: 'smooth' });
            });
            
            this.list.appendChild(item);
        });
    }
}

// 在文档加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new TableOfContents();
});
