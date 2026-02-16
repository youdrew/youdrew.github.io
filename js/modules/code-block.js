/**
 * 代码块功能模块
 * 支持代码块展开、复制、全屏显示
 */
export class CodeBlock {
  constructor() {
    this.init();
  }

  init() {
    this.initCodeBlockExpansion();

    // 使用 MutationObserver 监听新添加的代码块
    const observer = new MutationObserver((mutations) => {
      let needsReinit = false;
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (
              node.nodeType === 1 &&
              (node.matches('figure.highlight') ||
                node.querySelector('figure.highlight'))
            ) {
              needsReinit = true;
            }
          });
        }
      });
      if (needsReinit) {
        setTimeout(() => this.initCodeBlockExpansion(), 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  initCodeBlockExpansion() {
    const codeBlocks = document.querySelectorAll('figure.highlight');

    codeBlocks.forEach((codeBlock) => {
      // Skip if already processed
      if (codeBlock.closest('.code-block-container')) return;

      // Remove table structure and keep only code content
      const table = codeBlock.querySelector('table');
      if (table) {
        const codeCell = table.querySelector('td.code');
        if (codeCell) {
          // Create a new pre element with code content
          const newPre = document.createElement('pre');
          newPre.className = 'code';
          newPre.innerHTML = codeCell.innerHTML;

          // Replace table with pre element
          codeBlock.innerHTML = '';
          codeBlock.appendChild(newPre);
        }
      }

      // Get the code content height
      const codeContent = codeBlock.querySelector('pre.code');
      if (!codeContent) return;

      const actualHeight = codeContent.scrollHeight;
      const maxHeight = 400; // Same as CSS max-height

      // Create button container and copy button for all code blocks
      const buttonsContainer = document.createElement('div');
      buttonsContainer.className = 'code-buttons';

      // Create copy button (for all code blocks)
      const copyButton = document.createElement('button');
      copyButton.className = 'copy-code-button';
      copyButton.textContent = '复制代码';
      copyButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.copyCodeToClipboard(codeContent, copyButton);
      });
      buttonsContainer.appendChild(copyButton);

      // Only add expansion if content is taller than max height
      if (actualHeight > maxHeight) {
        // Wrap the code block in a container
        const container = document.createElement('div');
        container.className = 'code-block-container collapsed';
        codeBlock.parentNode.insertBefore(container, codeBlock);
        container.appendChild(codeBlock);

        // Create expand button
        const expandButton = document.createElement('button');
        expandButton.className = 'expand-button';
        expandButton.textContent = '展开代码';
        buttonsContainer.appendChild(expandButton);

        // Add buttons container to the wrapper
        container.appendChild(buttonsContainer);

        // Add click handler
        expandButton.addEventListener('click', () => {
          if (container.classList.contains('collapsed')) {
            this.showFullscreenCode(codeBlock);
          }
        });
      } else {
        // For code blocks that don't need expansion, just add copy button
        const container = document.createElement('div');
        container.className = 'code-block-container';
        codeBlock.parentNode.insertBefore(container, codeBlock);
        container.appendChild(codeBlock);
        container.appendChild(buttonsContainer);
      }
    });
  }

  showFullscreenCode(codeBlock) {
    // Create fullscreen modal
    const modal = document.createElement('div');
    modal.className = 'code-fullscreen-modal active';

    const content = document.createElement('div');
    content.className = 'code-fullscreen-content';

    // Clone the closest code container (includes wrapper if present)
    const sourceContainer = codeBlock.closest('.code-block-container');
    const clonedBlock = (sourceContainer || codeBlock).cloneNode(true);

    // Remove any buttons that don't make sense inside the modal
    const extraneousControls = clonedBlock.querySelectorAll(
      '.code-buttons, .copy-code-button, .expand-button'
    );
    extraneousControls.forEach((el) => {
      el.parentNode && el.parentNode.removeChild(el);
    });

    // Ensure wrapper/container fills the modal and isn't marked as collapsed
    const wrapper = clonedBlock.classList.contains('code-block-container')
      ? clonedBlock
      : clonedBlock.querySelector('.code-block-container');
    if (wrapper) {
      wrapper.classList.remove('collapsed');
      wrapper.style.margin = '0';
    }

    // Find and update the pre.code element in cloned block
    const clonedPre = (wrapper || clonedBlock).querySelector('pre.code');
    if (clonedPre) {
      clonedPre.scrollTop = 0;
    }

    content.appendChild(clonedBlock);

    // Create close button
    const closeButton = document.createElement('button');
    closeButton.className = 'close-fullscreen';
    closeButton.textContent = '关闭';
    content.appendChild(closeButton);

    modal.appendChild(content);
    document.body.appendChild(modal);

    // Prevent body scrolling
    document.body.style.overflow = 'hidden';

    // Close handlers
    const closeModal = () => {
      document.body.removeChild(modal);
      document.body.style.overflow = '';
    };

    closeButton.addEventListener('click', closeModal);

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // Close on escape key
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleKeydown);
      }
    };
    document.addEventListener('keydown', handleKeydown);
  }

  copyCodeToClipboard(codeElement, button) {
    const code = codeElement.textContent || codeElement.innerText;

    // Use modern Clipboard API if available
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(code)
        .then(() => {
          this.showCopySuccess(button);
        })
        .catch((err) => {
          console.error('复制失败:', err);
          this.fallbackCopy(code, button);
        });
    } else {
      this.fallbackCopy(code, button);
    }
  }

  fallbackCopy(text, button) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        this.showCopySuccess(button);
      }
    } catch (err) {
      console.error('复制失败:', err);
    }

    document.body.removeChild(textArea);
  }

  showCopySuccess(button) {
    const originalText = button.textContent;
    button.classList.add('copied');
    button.textContent = '已复制 ✓';

    setTimeout(() => {
      button.classList.remove('copied');
      button.textContent = originalText;
    }, 2000);
  }
}
