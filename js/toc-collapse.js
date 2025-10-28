document.addEventListener('DOMContentLoaded', function() {
    initTOCCollapse();
    
    function initTOCCollapse() {
        // 确保在文章页面上，但不在Archives页面上
        const content = document.querySelector('.content');
        if (!content) return;
        
        // 如果是Archives页面，不显示TOC
        if (content.classList.contains('archives')) return;
        
        // 创建 TOC 容器
        const tocContainer = createTOCContainer();
        
        // 初始化拖拽功能
        initTOCDragMove(tocContainer);
        
        // 等待 TOC 生成完毕
        setTimeout(() => {
            const tocItems = document.querySelectorAll('.toc-item');
            const headings = document.querySelectorAll('.content h1, .content h2, .content h3, .content h4, .content h5, .content h6');
            
            // 为每个标题添加 ID
            headings.forEach((heading, index) => {
                if (!heading.id) {
                    heading.id = `heading-${index}`;
                }
            });
            
            // 为每个 TOC 项目添加折叠按钮
            tocItems.forEach((item, index) => {
                // 获取标题级别
                const level = item.getAttribute('data-level') || '1';
                
                // 创建折叠按钮
                const collapseBtn = document.createElement('div');
                collapseBtn.className = 'toc-collapse-btn';
                
                // 检查正文中对应标题的初始状态
                const correspondingHeading = headings[index];
                const isInitiallyCollapsed = correspondingHeading && correspondingHeading.classList.contains('collapsed');
                
                // 如果正文标题已经是折叠状态，同步到TOC
                if (isInitiallyCollapsed) {
                    item.classList.add('collapsed');
                    console.log(`初始化：TOC项${index}设为折叠状态，同步正文状态`);
                }
                
                // 保存原始文本
                const originalText = item.textContent;
                
                // 重构 item 内容
                const textSpan = document.createElement('span');
                textSpan.className = 'toc-item-text';
                textSpan.textContent = originalText;
                textSpan.style.cursor = 'pointer';
                
                item.innerHTML = '';
                item.appendChild(collapseBtn);
                item.appendChild(textSpan);
                
                // 添加折叠按钮点击事件
                collapseBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    toggleTOCCollapse(item, index, tocItems, headings);
                });
                
                // 为标题文本添加点击跳转功能
                textSpan.addEventListener('click', function() {
                    if (headings[index]) {
                        headings[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                });
            });
            
            // 监听正文中的折叠按钮
            headings.forEach((heading, index) => {
                const collapseButton = heading.querySelector('.collapse-button');
                if (collapseButton) {
                    collapseButton.addEventListener('click', function() {
                        // 使用更长的延迟确保DOM更新完成
                        setTimeout(() => {
                            const isCollapsed = heading.classList.contains('collapsed');
                            console.log(`同步状态 - 标题${index}: ${isCollapsed ? '已折叠' : '已展开'}`);
                            syncTOCFromHeading(index, isCollapsed, tocItems);
                        }, 10);
                    });
                }
            });
            
            // 创建观察器来监听DOM变化，确保状态同步
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        const target = mutation.target;
                        if (target.tagName && target.tagName.match(/^H[1-6]$/)) {
                            const index = Array.from(headings).indexOf(target);
                            if (index !== -1) {
                                const isCollapsed = target.classList.contains('collapsed');
                                console.log(`DOM变化检测 - 标题${index}: ${isCollapsed ? '已折叠' : '已展开'}`);
                                syncTOCFromHeading(index, isCollapsed, tocItems);
                            }
                        }
                    }
                });
            });
            
            // 观察所有标题的class变化
            headings.forEach(heading => {
                observer.observe(heading, { attributes: true, attributeFilter: ['class'] });
            });
        }, 100);
    }
    
    function createTOCContainer() {
        const container = document.createElement('div');
        container.className = 'toc-container';
        container.innerHTML = `
            <div class="toc-content">
                <div class="toc-list"></div>
            </div>
        `;
        document.body.appendChild(container);
        
        // 生成 TOC 内容
        generateTOC(container.querySelector('.toc-list'));
        
        // 初始化滚动变色功能
        initScrollColorChange(container);
        
        return container;
    }
    
    function initTOCDragMove(tocContainer) {
        let isDragging = false;
        let isResizing = false;
        let resizeDirection = '';
        let startX, startY, startLeft, startTop, startWidth, startHeight;
        
        // 检测鼠标位置，确定是移动还是调整大小
        tocContainer.addEventListener('mousemove', function(e) {
            if (isDragging || isResizing) return;
            
            const rect = tocContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const edge = 8; // 边缘检测区域宽度
            
            let cursor = 'move';
            resizeDirection = '';
            
            // 检测是否在边缘区域
            if (x <= edge && y <= edge) {
                cursor = 'nw-resize';
                resizeDirection = 'nw';
            } else if (x >= rect.width - edge && y <= edge) {
                cursor = 'ne-resize';
                resizeDirection = 'ne';
            } else if (x <= edge && y >= rect.height - edge) {
                cursor = 'sw-resize';
                resizeDirection = 'sw';
            } else if (x >= rect.width - edge && y >= rect.height - edge) {
                cursor = 'se-resize';
                resizeDirection = 'se';
            } else if (x <= edge) {
                cursor = 'w-resize';
                resizeDirection = 'w';
            } else if (x >= rect.width - edge) {
                cursor = 'e-resize';
                resizeDirection = 'e';
            } else if (y <= edge) {
                cursor = 'n-resize';
                resizeDirection = 'n';
            } else if (y >= rect.height - edge) {
                cursor = 's-resize';
                resizeDirection = 's';
            }
            
            tocContainer.style.cursor = cursor;
        });
        
        // 鼠标离开容器时恢复默认光标
        tocContainer.addEventListener('mouseleave', function() {
            if (!isDragging && !isResizing) {
                tocContainer.style.cursor = 'default';
            }
        });
        
        // 鼠标按下开始操作
        tocContainer.addEventListener('mousedown', function(e) {
            // 如果点击的是折叠按钮或文本链接，不启动操作
            if (e.target.classList.contains('toc-collapse-btn') || 
                e.target.classList.contains('toc-item-text') ||
                e.target.closest('.toc-collapse-btn') ||
                e.target.closest('.toc-item-text')) {
                return;
            }
            
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = tocContainer.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            startWidth = rect.width;
            startHeight = rect.height;
            
            if (resizeDirection) {
                isResizing = true;
                document.addEventListener('mousemove', handleResize);
                document.addEventListener('mouseup', stopResize);
            } else {
                isDragging = true;
                document.addEventListener('mousemove', handleDrag);
                document.addEventListener('mouseup', stopDrag);
            }
            
            e.preventDefault();
        });
        
        function handleResize(e) {
            if (!isResizing) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            let newWidth = startWidth;
            let newHeight = startHeight;
            let newLeft = startLeft;
            let newTop = startTop;
            
            // 根据调整方向计算新的尺寸和位置
            if (resizeDirection.includes('e')) {
                newWidth = startWidth + deltaX;
            }
            if (resizeDirection.includes('w')) {
                newWidth = startWidth - deltaX;
                newLeft = startLeft + deltaX;
            }
            if (resizeDirection.includes('s')) {
                newHeight = startHeight + deltaY;
            }
            if (resizeDirection.includes('n')) {
                newHeight = startHeight - deltaY;
                newTop = startTop + deltaY;
            }
            
            // 限制最小尺寸
            const minWidth = 200;
            const minHeight = 150;
            
            if (newWidth < minWidth) {
                if (resizeDirection.includes('w')) {
                    newLeft = startLeft + startWidth - minWidth;
                }
                newWidth = minWidth;
            }
            if (newHeight < minHeight) {
                if (resizeDirection.includes('n')) {
                    newTop = startTop + startHeight - minHeight;
                }
                newHeight = minHeight;
            }
            
            // 限制在窗口范围内
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            
            newLeft = Math.max(0, Math.min(newLeft, windowWidth - newWidth));
            newTop = Math.max(0, Math.min(newTop, windowHeight - newHeight));
            
            tocContainer.style.width = newWidth + 'px';
            tocContainer.style.height = newHeight + 'px';
            tocContainer.style.left = newLeft + 'px';
            tocContainer.style.top = newTop + 'px';
            tocContainer.style.right = 'auto';
            tocContainer.style.bottom = 'auto';
        }
        
        function stopResize() {
            isResizing = false;
            resizeDirection = '';
            document.removeEventListener('mousemove', handleResize);
            document.removeEventListener('mouseup', stopResize);
        }
        
        function handleDrag(e) {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            let newLeft = startLeft + deltaX;
            let newTop = startTop + deltaY;
            
            // 限制在窗口范围内
            const containerRect = tocContainer.getBoundingClientRect();
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            
            newLeft = Math.max(0, Math.min(newLeft, windowWidth - containerRect.width));
            newTop = Math.max(0, Math.min(newTop, windowHeight - containerRect.height));
            
            tocContainer.style.left = newLeft + 'px';
            tocContainer.style.top = newTop + 'px';
            tocContainer.style.right = 'auto';
            tocContainer.style.bottom = 'auto';
        }
        
        function stopDrag() {
            isDragging = false;
            document.removeEventListener('mousemove', handleDrag);
            document.removeEventListener('mouseup', stopDrag);
        }
    }
    
    function generateTOC(tocList) {
        const content = document.querySelector('.content');
        const headers = content.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        headers.forEach((header, index) => {
            // 为每个标题创建唯一ID
            const id = `header-${index}`;
            header.id = id;
            
            // 创建目录项
            const level = parseInt(header.tagName[1]);
            const item = document.createElement('div');
            item.className = 'toc-item';
            item.setAttribute('data-level', level);
            item.textContent = header.textContent;
            
            tocList.appendChild(item);
        });
    }
    
    function toggleTOCCollapse(tocItem, index, tocItems, headings) {
        const isCollapsed = tocItem.classList.contains('collapsed');
        const heading = headings[index];
        const currentLevel = parseInt(tocItem.getAttribute('data-level') || '1');
        
        if (!heading) return;
        
        console.log(`TOC折叠切换 - 索引${index}: ${isCollapsed ? '展开' : '折叠'}`);
        
        if (isCollapsed) {
            // 展开
            tocItem.classList.remove('collapsed');
            expandHeading(heading);
            showTOCChildren(index, currentLevel, tocItems);
            
            // 同步正文中的状态 - 移除collapsed类
            if (heading.classList.contains('collapsed')) {
                heading.classList.remove('collapsed');
                console.log(`同步正文标题${index}为展开状态`);
            }
        } else {
            // 折叠
            tocItem.classList.add('collapsed');
            collapseHeading(heading);
            hideTOCChildren(index, currentLevel, tocItems);
            
            // 同步正文中的状态 - 添加collapsed类
            if (!heading.classList.contains('collapsed')) {
                heading.classList.add('collapsed');
                console.log(`同步正文标题${index}为折叠状态`);
            }
        }
    }
    
    function hideTOCChildren(startIndex, parentLevel, tocItems) {
        // 隐藏 TOC 中的子项
        for (let i = startIndex + 1; i < tocItems.length; i++) {
            const level = parseInt(tocItems[i].getAttribute('data-level') || '1');
            if (level <= parentLevel) break;
            
            tocItems[i].classList.add('toc-hidden');
        }
    }
    
    function showTOCChildren(startIndex, parentLevel, tocItems) {
        // 显示 TOC 中的直接子项（递归处理嵌套折叠）
        for (let i = startIndex + 1; i < tocItems.length; i++) {
            const level = parseInt(tocItems[i].getAttribute('data-level') || '1');
            if (level <= parentLevel) break;
            
            if (level === parentLevel + 1) {
                // 只显示直接子项
                tocItems[i].classList.remove('toc-hidden');
            }
            // 更深层的项目要检查其父项是否也被折叠了
            else if (level > parentLevel + 1) {
                // 检查所有父级是否都展开
                let shouldShow = true;
                for (let j = i - 1; j > startIndex; j--) {
                    const prevLevel = parseInt(tocItems[j].getAttribute('data-level') || '1');
                    if (prevLevel < level && tocItems[j].classList.contains('collapsed')) {
                        shouldShow = false;
                        break;
                    }
                    if (prevLevel <= parentLevel) break;
                }
                
                if (shouldShow) {
                    tocItems[i].classList.remove('toc-hidden');
                }
            }
        }
    }
    
    function collapseHeading(heading) {
        const level = parseInt(heading.tagName.charAt(1));
        let next = heading.nextElementSibling;
        
        // 添加折叠状态
        heading.classList.add('collapsed');
        
        // 隐藏直到下一个相同或更高级别的标题
        while (next) {
            if (next.tagName && next.tagName.match(/^H[1-6]$/)) {
                const nextLevel = parseInt(next.tagName.charAt(1));
                if (nextLevel <= level) break;
            }
            
            // 不隐藏tags区域
            if (next.classList && next.classList.contains('tags')) {
                next = next.nextElementSibling;
                continue;
            }
            
            next.style.display = 'none';
            next = next.nextElementSibling;
        }
    }
    
    function expandHeading(heading) {
        const level = parseInt(heading.tagName.charAt(1));
        let next = heading.nextElementSibling;
        
        // 移除折叠状态
        heading.classList.remove('collapsed');
        
        // 显示内容直到下一个相同或更高级别的标题
        while (next) {
            if (next.tagName && next.tagName.match(/^H[1-6]$/)) {
                const nextLevel = parseInt(next.tagName.charAt(1));
                if (nextLevel <= level) break;
            }
            
            // tags区域始终保持显示，跳过处理
            if (next.classList && next.classList.contains('tags')) {
                next.style.display = '';
                next = next.nextElementSibling;
                continue;
            }
            
            next.style.display = '';
            next = next.nextElementSibling;
        }
    }
    
    function syncTOCFromHeading(headingIndex, isCollapsed, tocItems) {
        const tocItem = tocItems[headingIndex];
        
        if (!tocItem) return;
        
        console.log(`同步TOC状态 - 索引${headingIndex}: ${isCollapsed ? '折叠' : '展开'}`);
        
        // 更新TOC项的折叠状态
        if (isCollapsed) {
            if (!tocItem.classList.contains('collapsed')) {
                tocItem.classList.add('collapsed');
                const currentLevel = parseInt(tocItem.getAttribute('data-level') || '1');
                hideTOCChildren(headingIndex, currentLevel, tocItems);
                console.log(`TOC项${headingIndex}已设为折叠状态`);
            }
        } else {
            if (tocItem.classList.contains('collapsed')) {
                tocItem.classList.remove('collapsed');
                const currentLevel = parseInt(tocItem.getAttribute('data-level') || '1');
                showTOCChildren(headingIndex, currentLevel, tocItems);
                console.log(`TOC项${headingIndex}已设为展开状态`);
            }
        }
    }
    
    // 初始化滚动变色功能
    function initScrollColorChange(tocContainer) {
        const content = document.querySelector('.content');
        if (!content) return;
        
        const headings = content.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const tocItems = tocContainer.querySelectorAll('.toc-item');
        
        // 定义每个层级的颜色主题 - 只改变背景色，保持字体色不变
        const levelColors = {
            1: { 
                passedBg: 'rgba(128, 128, 128, 0.1)',    // 已读：浅灰背景
                readingBg: 'rgba(66, 153, 225, 0.15)',   // 正在读：浅蓝背景
                comingBg: 'rgba(200, 200, 200, 0.05)',   // 未读：极浅灰背景
                activeBg: 'rgba(66, 153, 225, 0.25)'     // 主焦点：深蓝背景
            },
            2: { 
                passedBg: 'rgba(128, 128, 128, 0.1)',
                readingBg: 'rgba(49, 130, 206, 0.15)',
                comingBg: 'rgba(200, 200, 200, 0.05)',
                activeBg: 'rgba(49, 130, 206, 0.25)'
            },
            3: { 
                passedBg: 'rgba(128, 128, 128, 0.1)',
                readingBg: 'rgba(44, 82, 130, 0.15)',
                comingBg: 'rgba(200, 200, 200, 0.05)',
                activeBg: 'rgba(44, 82, 130, 0.25)'
            },
            4: { 
                passedBg: 'rgba(128, 128, 128, 0.1)',
                readingBg: 'rgba(42, 67, 101, 0.15)',
                comingBg: 'rgba(200, 200, 200, 0.05)',
                activeBg: 'rgba(42, 67, 101, 0.25)'
            },
            5: { 
                passedBg: 'rgba(128, 128, 128, 0.1)',
                readingBg: 'rgba(26, 54, 93, 0.15)',
                comingBg: 'rgba(200, 200, 200, 0.05)',
                activeBg: 'rgba(26, 54, 93, 0.25)'
            },
            6: { 
                passedBg: 'rgba(128, 128, 128, 0.1)',
                readingBg: 'rgba(21, 62, 117, 0.15)',
                comingBg: 'rgba(200, 200, 200, 0.05)',
                activeBg: 'rgba(21, 62, 117, 0.25)'
            }
        };
        
        let lastUpdateTime = 0;
        
        function updateTOCColors() {
            const now = Date.now();
            if (now - lastUpdateTime < 50) return; // 节流，每50ms最多更新一次
            lastUpdateTime = now;
            
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const windowHeight = window.innerHeight;
            const viewportTop = scrollTop;
            const viewportBottom = scrollTop + windowHeight;
            const viewportCenter = scrollTop + windowHeight / 2;
            
            // 重置所有TOC项的状态 - 保持字体颜色不变，只重置背景
            tocItems.forEach(item => {
                item.classList.remove('toc-reading', 'toc-passed', 'toc-coming');
                item.style.backgroundColor = '';  // 清空背景色
                item.style.opacity = '1';
                item.style.fontWeight = '';
                item.style.transform = '';
                item.style.boxShadow = '';
                // 不修改 color 和 borderLeftColor，保持CSS中定义的固定颜色
            });
            
            let currentReadingIndex = -1;
            
            // 检查每个标题的位置状态
            headings.forEach((heading, index) => {
                const rect = heading.getBoundingClientRect();
                const headingTop = scrollTop + rect.top;
                const headingBottom = scrollTop + rect.bottom;
                const tocItem = tocItems[index];
                
                if (!tocItem) return;
                
                const level = parseInt(tocItem.getAttribute('data-level') || '1');
                const colors = levelColors[level];
                
                // 判断标题状态 - 只改变背景色，保持字体色不变
                if (headingBottom < viewportTop) {
                    // 已经滚过的标题 - 灰色背景
                    tocItem.classList.add('toc-passed');
                    tocItem.style.backgroundColor = colors.passedBg;
                    tocItem.style.opacity = '0.7';
                } else if (headingTop > viewportBottom) {
                    // 还未到达的标题 - 极浅背景
                    tocItem.classList.add('toc-coming');
                    tocItem.style.backgroundColor = colors.comingBg;
                    tocItem.style.opacity = '0.5';
                } else {
                    // 当前视口中的标题 - 蓝色背景
                    tocItem.classList.add('toc-reading');
                    tocItem.style.backgroundColor = colors.readingBg;
                    tocItem.style.opacity = '1';
                    tocItem.style.fontWeight = '600';
                    
                    // 如果标题在视口中心附近，设为主要阅读标题
                    if (headingTop <= viewportCenter && headingBottom >= viewportCenter) {
                        currentReadingIndex = index;
                        tocItem.style.backgroundColor = colors.activeBg;
                        tocItem.style.boxShadow = `inset 0 0 0 2px rgba(66, 153, 225, 0.3)`;
                    }
                }
            });
            
            // 为当前主要阅读的标题添加特殊效果
            if (currentReadingIndex >= 0) {
                const mainTocItem = tocItems[currentReadingIndex];
                if (mainTocItem) {
                    mainTocItem.style.transform = 'scale(1.02)';
                    mainTocItem.style.transition = 'all 0.2s ease';
                }
            }
            
            // 清理其他项的transform
            tocItems.forEach((item, index) => {
                if (index !== currentReadingIndex) {
                    item.style.transform = '';
                }
            });
        }
        
        // 监听滚动事件
        window.addEventListener('scroll', updateTOCColors, { passive: true });
        
        // 监听resize事件，重新计算
        window.addEventListener('resize', updateTOCColors, { passive: true });
        
        // 初始更新
        setTimeout(updateTOCColors, 300);
        
        // 为TOC项添加点击跳转功能
        tocItems.forEach((item, index) => {
            const textSpan = item.querySelector('.toc-item-text');
            if (textSpan) {
                textSpan.addEventListener('click', function() {
                    const heading = headings[index];
                    if (heading) {
                        heading.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center' 
                        });
                        
                        // 短暂高亮点击的项 - 只改变背景色
                        item.style.backgroundColor = 'rgba(66, 153, 225, 0.4)';
                        setTimeout(() => {
                            updateTOCColors();
                        }, 300);
                    }
                });
            }
        });
    }
});