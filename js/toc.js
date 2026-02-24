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

        // 用于追踪每级的计数
        const counters = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        const parentStack = []; // 存储父级编号

        headers.forEach((header, index) => {
            // 为每个标题创建唯一ID
            const id = `header-${index}`;
            header.id = id;

            // 获取标题级别
            const level = parseInt(header.tagName[1]);

            // 更新计数器
            counters[level]++;
            // 清除更低级别的计数
            for (let l = level + 1; l <= 6; l++) {
                counters[l] = 0;
            }

            // 更新父级栈
            parentStack.length = level; // 裁剪到当前级别之前
            parentStack.push(counters[level]);

            // 生成编号（如 1, 1.1, 1.2.1 等）
            const number = parentStack.join('.');

            // 创建目录项
            const item = document.createElement('li');
            item.className = 'toc-item';
            item.setAttribute('data-level', level);

            // 创建编号和标题的容器
            const titleSpan = document.createElement('span');
            titleSpan.className = 'toc-title';
            titleSpan.innerHTML = `<span class="toc-number">${number}.</span> ${header.textContent}`;
            item.appendChild(titleSpan);

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
