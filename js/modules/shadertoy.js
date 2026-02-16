/**
 * ShaderToy Embed System for Hexo Blog
 * Automatically converts ShaderToy links in markdown content to embedded iframes
 */
export class ShaderToyEmbedManager {
    constructor() {
        this.initializeEmbeds();
    }

    initializeEmbeds() {
        // Find all text nodes that might contain ShaderToy URLs
        this.processTextNodes(document.body);
        
        // Also process any code blocks or pre elements that might contain URLs
        this.processCodeBlocks();
        
        // Process special markdown-style syntax like [shader:shaderID]
        this.processMarkdownSyntax();
    }

    processTextNodes(element) {
        // Skip script, style, and other non-content elements
        if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'CANVAS'].includes(element.tagName)) {
            return;
        }

        // Process text nodes
        if (element.nodeType === Node.TEXT_NODE) {
            this.processTextNode(element);
        } else {
            // Recursively process child nodes
            Array.from(element.childNodes).forEach(child => {
                this.processTextNodes(child);
            });
        }
    }

    processTextNode(textNode) {
        const text = textNode.textContent;
        // Support multiple ShaderToy URL formats
        const shaderToyRegex = /https?:\/\/(?:www\.)?shadertoy\.com\/view\/(\w+)(?:\?[^\s]*)?/g;
        
        let match;
        const replacements = [];
        
        while ((match = shaderToyRegex.exec(text)) !== null) {
            replacements.push({
                fullMatch: match[0],
                shaderID: match[1],
                index: match.index
            });
        }

        if (replacements.length > 0) {
            this.replaceWithIframes(textNode, replacements);
        }
    }

    processCodeBlocks() {
        // Process code blocks that might contain ShaderToy URLs
        const codeElements = document.querySelectorAll('code, pre');
        
        codeElements.forEach(codeElement => {
            const text = codeElement.textContent;
            const shaderToyRegex = /https?:\/\/(?:www\.)?shadertoy\.com\/view\/(\w+)(?:\?[^\s]*)?/g;
            
            let match;
            while ((match = shaderToyRegex.exec(text)) !== null) {
                // Only replace if the code block contains just the URL or is a simple link
                const trimmedText = text.trim();
                if (trimmedText === match[0] || trimmedText === match[0].replace(/\?.*$/, '')) {
                    this.replaceElementWithIframe(codeElement, match[1]);
                    break;
                }
            }
        });
    }

    replaceWithIframes(textNode, replacements) {
        const parent = textNode.parentNode;
        if (!parent) return;

        let currentText = textNode.textContent;
        const fragments = [];
        let lastIndex = 0;

        // Sort replacements by index (in reverse to handle multiple replacements correctly)
        replacements.sort((a, b) => b.index - a.index);

        // Split text and create fragments
        replacements.reverse().forEach(replacement => {
            // Add text before this match
            if (replacement.index > lastIndex) {
                fragments.unshift({
                    type: 'text',
                    content: currentText.substring(lastIndex, replacement.index)
                });
            }

            // Add iframe for this match
            fragments.unshift({
                type: 'iframe',
                shaderID: replacement.shaderID,
                originalURL: replacement.fullMatch
            });

            lastIndex = replacement.index + replacement.fullMatch.length;
        });

        // Add remaining text
        if (lastIndex < currentText.length) {
            fragments.unshift({
                type: 'text',
                content: currentText.substring(lastIndex)
            });
        }

        // Create new elements and replace the text node
        const newElements = [];
        fragments.forEach(fragment => {
            if (fragment.type === 'text' && fragment.content.trim()) {
                newElements.push(document.createTextNode(fragment.content));
            } else if (fragment.type === 'iframe') {
                const container = this.createShaderToyEmbed(fragment.shaderID, fragment.originalURL);
                newElements.push(container);
            }
        });

        // Replace the original text node with new elements
        newElements.forEach(element => {
            parent.insertBefore(element, textNode);
        });
        parent.removeChild(textNode);
    }

    replaceElementWithIframe(element, shaderID) {
        const container = this.createShaderToyEmbed(shaderID);
        element.parentNode.replaceChild(container, element);
    }

    createShaderToyEmbed(shaderID, originalURL = null) {
        // Create container div
        const container = document.createElement('div');
        container.className = 'shadertoy-embed-container';
        container.style.cssText = `
            margin: 25px auto;
            max-width: 800px;
            padding: 15px;
            border: 2px solid #444;
            border-radius: 12px;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            position: relative;
            overflow: hidden;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        `;

        // Add hover effect
        container.addEventListener('mouseenter', () => {
            container.style.transform = 'translateY(-3px)';
            container.style.boxShadow = '0 12px 35px rgba(0,0,0,0.4)';
        });
        container.addEventListener('mouseleave', () => {
            container.style.transform = 'translateY(0)';
            container.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
        });

        // Create header with title and link
        const header = document.createElement('div');
        header.className = 'shadertoy-embed-header';
        header.style.cssText = `
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #555;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
        `;

        const titleSection = document.createElement('div');
        titleSection.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
        `;

        const icon = document.createElement('span');
        icon.innerHTML = '🎨';
        icon.style.cssText = `
            font-size: 20px;
            filter: drop-shadow(0 0 5px rgba(255,215,0,0.5));
        `;

        const title = document.createElement('span');
        title.textContent = `ShaderToy: ${shaderID}`;
        title.style.cssText = `
            color: #ffd700;
            font-weight: bold;
            font-size: 16px;
            text-shadow: 0 0 10px rgba(255,215,0,0.3);
        `;

        titleSection.appendChild(icon);
        titleSection.appendChild(title);

        const linkSection = document.createElement('div');
        linkSection.style.cssText = `
            display: flex;
            gap: 8px;
        `;

        const link = document.createElement('a');
        link.href = originalURL || `https://www.shadertoy.com/view/${shaderID}`;
        link.target = '_blank';
        link.innerHTML = '🔗 Open in ShaderToy';
        link.style.cssText = `
            color: #66b3ff;
            text-decoration: none;
            font-size: 13px;
            padding: 6px 12px;
            border: 1px solid #66b3ff;
            border-radius: 6px;
            background: rgba(102,179,255,0.1);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 4px;
        `;
        
        link.addEventListener('mouseenter', () => {
            link.style.background = '#66b3ff';
            link.style.color = '#000';
            link.style.transform = 'translateY(-1px)';
        });
        link.addEventListener('mouseleave', () => {
            link.style.background = 'rgba(102,179,255,0.1)';
            link.style.color = '#66b3ff';
            link.style.transform = 'translateY(0)';
        });

        linkSection.appendChild(link);
        header.appendChild(titleSection);
        header.appendChild(linkSection);

        // Create iframe wrapper for aspect ratio
        const iframeWrapper = document.createElement('div');
        iframeWrapper.style.cssText = `
            position: relative;
            width: 100%;
            height: 0;
            padding-bottom: 50%; /* 2:1 aspect ratio */
            border-radius: 8px;
            overflow: hidden;
            background: #000;
        `;

        // Create iframe
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.shadertoy.com/embed/${shaderID}?gui=true&t=10&paused=false&muted=false`;
        iframe.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
        `;
        iframe.allowFullscreen = true;
        iframe.loading = 'lazy';

        // Add loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.innerHTML = `
            <div style="text-align: center;">
                <div style="display: inline-block; width: 40px; height: 40px; border: 3px solid #333; border-top: 3px solid #ffd700; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 10px;"></div>
                <div style="color: #999; font-size: 14px;">Loading ShaderToy...</div>
            </div>
        `;
        loadingIndicator.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1;
        `;

        // Add spinner animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        iframe.addEventListener('load', () => {
            loadingIndicator.style.display = 'none';
        });

        // Assemble iframe wrapper
        iframeWrapper.appendChild(iframe);
        iframeWrapper.appendChild(loadingIndicator);

        // Assemble container
        container.appendChild(header);
        container.appendChild(iframeWrapper);

        return container;
    }

    processMarkdownSyntax() {
        // Process special markdown syntax like [shader:shaderID] or [shadertoy:shaderID]
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // Skip script, style, and other non-content elements
                    const tagName = node.parentElement?.tagName;
                    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'CANVAS'].includes(tagName)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        textNodes.forEach(textNode => {
            const text = textNode.textContent;
            const markdownRegex = /\[(shader|shadertoy):(\w+)\]/g;
            
            let match;
            const replacements = [];
            
            while ((match = markdownRegex.exec(text)) !== null) {
                replacements.push({
                    fullMatch: match[0],
                    shaderID: match[2],
                    index: match.index
                });
            }

            if (replacements.length > 0) {
                this.replaceMarkdownSyntax(textNode, replacements);
            }
        });
    }

    replaceMarkdownSyntax(textNode, replacements) {
        const parent = textNode.parentNode;
        if (!parent) return;

        let currentText = textNode.textContent;
        const fragments = [];
        let lastIndex = 0;

        // Sort replacements by index (in reverse to handle multiple replacements correctly)
        replacements.sort((a, b) => b.index - a.index);

        // Split text and create fragments
        replacements.reverse().forEach(replacement => {
            // Add text before this match
            if (replacement.index > lastIndex) {
                fragments.unshift({
                    type: 'text',
                    content: currentText.substring(lastIndex, replacement.index)
                });
            }

            // Add iframe for this match
            fragments.unshift({
                type: 'iframe',
                shaderID: replacement.shaderID,
                originalURL: null
            });

            lastIndex = replacement.index + replacement.fullMatch.length;
        });

        // Add remaining text
        if (lastIndex < currentText.length) {
            fragments.unshift({
                type: 'text',
                content: currentText.substring(lastIndex)
            });
        }

        // Create new elements and replace the text node
        const newElements = [];
        fragments.forEach(fragment => {
            if (fragment.type === 'text' && fragment.content.trim()) {
                newElements.push(document.createTextNode(fragment.content));
            } else if (fragment.type === 'iframe') {
                const container = this.createShaderToyEmbed(fragment.shaderID, fragment.originalURL);
                newElements.push(container);
            }
        });

        // Replace the original text node with new elements
        newElements.forEach(element => {
            parent.insertBefore(element, textNode);
        });
        parent.removeChild(textNode);
    }
}

// Initialize when DOM is ready
