// Sistema de Zoom de Imagens - APENAS FEED
(function() {
  'use strict';
  
  let currentZoom = 1;
  let isDragging = false;
  let startX, startY, scrollLeft, scrollTop;
  let zoomModal, zoomContainer, zoomImage;

  // Criar modal de zoom
  function createZoomModal() {
    if (document.getElementById('imageZoomModal')) return;

    const modalHTML = `
      <div id="imageZoomModal" class="image-zoom-modal hidden">
        <button class="zoom-close" id="zoomClose">&times;</button>
        <div class="zoom-hint" id="zoomHint">Arraste para mover • Role para zoom</div>
        <div class="image-zoom-container" id="zoomContainer">
          <img id="zoomImage" src="" alt="Zoom">
        </div>
        <div class="zoom-controls">
          <button class="zoom-btn" id="zoomOut">−</button>
          <div class="zoom-level" id="zoomLevel">100%</div>
          <button class="zoom-btn" id="zoomIn">+</button>
          <button class="zoom-btn" id="zoomReset">⟲</button>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    zoomModal = document.getElementById('imageZoomModal');
    zoomContainer = document.getElementById('zoomContainer');
    zoomImage = document.getElementById('zoomImage');
    
    const zoomClose = document.getElementById('zoomClose');
    const zoomIn = document.getElementById('zoomIn');
    const zoomOut = document.getElementById('zoomOut');
    const zoomReset = document.getElementById('zoomReset');
    const zoomHint = document.getElementById('zoomHint');

    // Fechar ao clicar no fundo
    zoomModal.addEventListener('click', (e) => {
      if (e.target === zoomModal) {
        closeZoom();
      }
    });

    // Fechar com botão X
    zoomClose.addEventListener('click', closeZoom);

    // Fechar com ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !zoomModal.classList.contains('hidden')) {
        closeZoom();
      }
    });

    // Botões de zoom
    zoomIn.addEventListener('click', (e) => {
      e.stopPropagation();
      setZoom(currentZoom + 0.25);
    });

    zoomOut.addEventListener('click', (e) => {
      e.stopPropagation();
      setZoom(currentZoom - 0.25);
    });

    zoomReset.addEventListener('click', (e) => {
      e.stopPropagation();
      setZoom(1);
      zoomContainer.scrollLeft = 0;
      zoomContainer.scrollTop = 0;
    });

    // Zoom com scroll do mouse
    zoomContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(currentZoom + delta);
    }, { passive: false });

    // Arrastar imagem
    zoomContainer.addEventListener('mousedown', (e) => {
      isDragging = true;
      zoomContainer.style.cursor = 'grabbing';
      startX = e.pageX - zoomContainer.offsetLeft;
      startY = e.pageY - zoomContainer.offsetTop;
      scrollLeft = zoomContainer.scrollLeft;
      scrollTop = zoomContainer.scrollTop;
    });

    zoomContainer.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.pageX - zoomContainer.offsetLeft;
      const y = e.pageY - zoomContainer.offsetTop;
      const walkX = (x - startX) * 2;
      const walkY = (y - startY) * 2;
      zoomContainer.scrollLeft = scrollLeft - walkX;
      zoomContainer.scrollTop = scrollTop - walkY;
    });

    zoomContainer.addEventListener('mouseup', () => {
      isDragging = false;
      zoomContainer.style.cursor = 'grab';
    });

    zoomContainer.addEventListener('mouseleave', () => {
      isDragging = false;
      zoomContainer.style.cursor = 'grab';
    });

    // Touch para mobile
    let touchStartX, touchStartY;
    
    zoomContainer.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      touchStartX = touch.pageX;
      touchStartY = touch.pageY;
      scrollLeft = zoomContainer.scrollLeft;
      scrollTop = zoomContainer.scrollTop;
    });

    zoomContainer.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const walkX = (touchStartX - touch.pageX) * 2;
      const walkY = (touchStartY - touch.pageY) * 2;
      zoomContainer.scrollLeft = scrollLeft + walkX;
      zoomContainer.scrollTop = scrollTop + walkY;
    }, { passive: false });

    // Ocultar hint após 3 segundos
    setTimeout(() => {
      if (zoomHint) {
        zoomHint.style.opacity = '0';
        zoomHint.style.transition = 'opacity 0.5s ease';
      }
    }, 3000);

    function setZoom(newZoom) {
      currentZoom = Math.max(0.5, Math.min(5, newZoom));
      zoomImage.style.transform = `scale(${currentZoom})`;
      document.getElementById('zoomLevel').textContent = `${Math.round(currentZoom * 100)}%`;
    }
  }

  function openZoom(imageSrc) {
    createZoomModal();
    
    zoomImage.src = imageSrc;
    zoomModal.classList.remove('hidden');
    currentZoom = 1;
    zoomImage.style.transform = 'scale(1)';
    document.getElementById('zoomLevel').textContent = '100%';
    zoomContainer.scrollLeft = 0;
    zoomContainer.scrollTop = 0;
    
    document.body.style.overflow = 'hidden';
  }

  function closeZoom() {
    if (zoomModal) {
      zoomModal.classList.add('hidden');
      currentZoom = 1;
      document.body.style.overflow = '';
    }
  }

  // DETECTAR CLIQUE APENAS EM IMAGENS DO FEED
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('post-image')) {
      e.preventDefault();
      e.stopPropagation();
      openZoom(e.target.src);
    }
  }, true);

  window.openImageZoom = openZoom;
  window.closeImageZoom = closeZoom;
})();