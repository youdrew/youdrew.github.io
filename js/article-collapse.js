document.addEventListener('DOMContentLoaded', function() {
    const articleContent = document.querySelector('.content');
    if (!articleContent) return;

    // 查找所有标题
    const headings = articleContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    headings.forEach(heading => {
        // 创建折叠按钮
        const collapseButton = document.createElement('span');
        collapseButton.className = 'collapse-button';
        heading.insertBefore(collapseButton, heading.firstChild);

        // 添加点击事件
        collapseButton.addEventListener('click', function(e) {
            e.stopPropagation();
            const headingLevel = parseInt(heading.tagName[1]);
            let nextEl = heading.nextElementSibling;
            heading.classList.toggle('collapsed');

            // 隐藏所有下级内容直到遇到同级或更高级的标题
            while (nextEl) {
                const isHeading = nextEl.tagName && nextEl.tagName.match(/^H[1-6]$/);
                if (isHeading) {
                    const nextLevel = parseInt(nextEl.tagName[1]);
                    if (nextLevel <= headingLevel) break;
                }
                
                nextEl.style.display = heading.classList.contains('collapsed') ? 'none' : '';
                nextEl = nextEl.nextElementSibling;
            }
        });
    });
});