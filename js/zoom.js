// Sistema de Zoom de Imagens - APENAS FEED
(function () {
  'use strict';

  let currentZoom = 1;         // zoom relativo ao "fit"
  let baseScale = 1;           // escala para caber no container
  let isDragging = false;
  let startClientX, startClientY, startScrollLeft, startScrollTop;
  let zoomModal, zoomContainer, zoomImage;
  let naturalWidth = 0, naturalHeight = 0;

  function createZoomModal() {
    if (document.getElementById('imageZoomModal')) {
      zoomModal = document.getElementById('imageZoomModal');
      zoomContainer = document.getElementById('zoomContainer');
      zoomImage = document.getElementById('zoomImage');
      return;
    }

    const modalHTML = `
      <div id="imageZoomModal" class="image-zoom-modal hidden">
        <button class="zoom-close" id="zoomClose">&times;</button>
        <div class="zoom-hint" id="zoomHint">Arraste para mover - Role para zoom</div>
        <div class="image-zoom-container" id="zoomContainer">
          <img id="zoomImage" src="" alt="Zoom">
        </div>
        <div class="zoom-controls">
          <button class="zoom-btn" id="zoomOut">-</button>
          <div class="zoom-level" id="zoomLevel">100%</div>
          <button class="zoom-btn" id="zoomIn">+</button>
          <button class="zoom-btn" id="zoomReset">Reset</button>
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

    // Estilos mínimos (inline) para garantir pan completo
    zoomContainer.style.overflow = 'auto';
    zoomContainer.style.cursor = 'grab';
    zoomContainer.style.userSelect = 'none';
    zoomContainer.style.display = 'block'; // evita centralização do flex
    zoomContainer.style.alignItems = 'initial';
    zoomContainer.style.justifyContent = 'initial';

    // A imagem precisa ignorar max-width/height para zoom real
    zoomImage.style.maxWidth = 'none';
    zoomImage.style.maxHeight = 'none';
    zoomImage.style.display = 'block';

    // Fechar ao clicar no fundo
    zoomModal.addEventListener('click', (e) => {
      if (e.target === zoomModal) closeZoom();
    });

    zoomClose.addEventListener('click', closeZoom);

    // ESC fecha
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !zoomModal.classList.contains('hidden')) closeZoom();
    });

    // Botões
    zoomIn.addEventListener('click', (e) => {
      e.stopPropagation();
      setZoom(currentZoom * 1.25);
    });

    zoomOut.addEventListener('click', (e) => {
      e.stopPropagation();
      setZoom(currentZoom / 1.25);
    });

    zoomReset.addEventListener('click', (e) => {
      e.stopPropagation();
      resetZoomAndPosition();
    });

    // Zoom no scroll com foco no cursor
    zoomContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = zoomContainer.getBoundingClientRect();
      const focalX = e.clientX;
      const focalY = e.clientY;
      const delta = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      setZoom(currentZoom * delta, focalX, focalY, rect);
    }, { passive: false });

    // Arrastar para mover
    zoomContainer.addEventListener('mousedown', (e) => {
      isDragging = true;
      zoomContainer.style.cursor = 'grabbing';
      startClientX = e.clientX;
      startClientY = e.clientY;
      startScrollLeft = zoomContainer.scrollLeft;
      startScrollTop = zoomContainer.scrollTop;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const dx = e.clientX - startClientX;
      const dy = e.clientY - startClientY;
      zoomContainer.scrollLeft = startScrollLeft - dx;
      zoomContainer.scrollTop = startScrollTop - dy;
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
      zoomContainer.style.cursor = 'grab';
    });

    zoomContainer.addEventListener('mouseleave', () => {
      isDragging = false;
      zoomContainer.style.cursor = 'grab';
    });

    // Touch pan (um dedo)
    let touchStartX, touchStartY;
    zoomContainer.addEventListener('touchstart', (e) => {
      if (!e.touches || !e.touches.length) return;
      const t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      startScrollLeft = zoomContainer.scrollLeft;
      startScrollTop = zoomContainer.scrollTop;
    }, { passive: true });

    zoomContainer.addEventListener('touchmove', (e) => {
      if (!e.touches || !e.touches.length) return;
      e.preventDefault();
      const t = e.touches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      zoomContainer.scrollLeft = startScrollLeft - dx;
      zoomContainer.scrollTop = startScrollTop - dy;
    }, { passive: false });

    // Some a dica após 3s
    setTimeout(() => {
      if (zoomHint) {
        zoomHint.style.opacity = '0';
        zoomHint.style.transition = 'opacity 0.5s ease';
      }
    }, 3000);
  }

  function applySizeFromZoom() {
    const targetWidth = naturalWidth * baseScale * currentZoom;
    const targetHeight = naturalHeight * baseScale * currentZoom;
    zoomImage.style.width = `${targetWidth}px`;
    zoomImage.style.height = `${targetHeight}px`;
    const levelEl = document.getElementById('zoomLevel');
    if (levelEl) levelEl.textContent = `${Math.round(currentZoom * 100)}%`;
  }

  // Mantém o ponto sob o cursor e limita o scroll aos extremos
  function setZoom(newZoom, focalClientX, focalClientY, containerRect) {
    if (!zoomImage || !naturalWidth || !naturalHeight) return;

    const prevZoom = currentZoom;
    currentZoom = Math.max(0.25, Math.min(8, newZoom));

    const rect = containerRect || zoomContainer.getBoundingClientRect();

    // Ponto de foco dentro do container
    const containerX = (typeof focalClientX === 'number') ? (focalClientX - rect.left) : (rect.width / 2);
    const containerY = (typeof focalClientY === 'number') ? (focalClientY - rect.top) : (rect.height / 2);

    // Tamanho antes do zoom
    const prevW = naturalWidth * baseScale * prevZoom;
    const prevH = naturalHeight * baseScale * prevZoom;

    // Fração do ponto dentro da imagem
    const imageFracX = (zoomContainer.scrollLeft + containerX) / (prevW || 1);
    const imageFracY = (zoomContainer.scrollTop + containerY) / (prevH || 1);

    // Aplica novo tamanho
    applySizeFromZoom();

    const newW = naturalWidth * baseScale * currentZoom;
    const newH = naturalHeight * baseScale * currentZoom;

    // Calcula scroll alvo e limita aos extremos
    const targetScrollLeft = imageFracX * newW - containerX;
    const targetScrollTop = imageFracY * newH - containerY;

    const maxScrollLeft = Math.max(0, newW - zoomContainer.clientWidth);
    const maxScrollTop = Math.max(0, newH - zoomContainer.clientHeight);

    zoomContainer.scrollLeft = Math.min(Math.max(0, targetScrollLeft), maxScrollLeft);
    zoomContainer.scrollTop = Math.min(Math.max(0, targetScrollTop), maxScrollTop);
  }

  function computeBaseScale() {
    const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0) * 0.95;
    const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) * 0.95;
    // Ajusta para caber na janela (minimizando área preta)
    baseScale = Math.min(vw / naturalWidth, vh / naturalHeight);
    if (!isFinite(baseScale) || baseScale <= 0) baseScale = 1;
  }

  function resetZoomAndPosition() {
    currentZoom = 1;
    applySizeFromZoom();
    zoomContainer.scrollLeft = 0;
    zoomContainer.scrollTop = 0;
    const levelEl = document.getElementById('zoomLevel');
    if (levelEl) levelEl.textContent = '100%';
  }

  function openZoom(imageSrc) {
    createZoomModal();

    zoomImage.onload = null;
    zoomImage.onerror = null;

    zoomModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    zoomImage.onload = () => {
      naturalWidth = zoomImage.naturalWidth || zoomImage.width;
      naturalHeight = zoomImage.naturalHeight || zoomImage.height;

      computeBaseScale();
      currentZoom = 1;
      applySizeFromZoom();

      // Definir o container do tamanho exato da imagem ajustada (minimiza área preta)
      const fitW = naturalWidth * baseScale;
      const fitH = naturalHeight * baseScale;
      zoomContainer.style.width = `${fitW}px`;
      zoomContainer.style.height = `${fitH}px`;

      zoomContainer.scrollLeft = 0;
      zoomContainer.scrollTop = 0;

      const levelEl = document.getElementById('zoomLevel');
      if (levelEl) levelEl.textContent = '100%';
    };

    zoomImage.onerror = () => {
      naturalWidth = naturalHeight = 0;
    };

    zoomImage.src = imageSrc;
  }

  function closeZoom() {
    if (zoomModal) {
      zoomModal.classList.add('hidden');
      document.body.style.overflow = '';
      currentZoom = 1;
      baseScale = 1;
    }
  }

  // Só imagens do feed
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (target && target.classList && target.classList.contains('post-image')) {
      e.preventDefault();
      e.stopPropagation();
      openZoom(target.src);
    }
  }, true);

  // Suporte explícito para a imagem ampliada do perfil
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.classList && t.classList.contains('view-post-image')) {
      e.preventDefault();
      e.stopPropagation();
      openZoom(t.src);
    }
  }, true);

  window.openImageZoom = openZoom;
  window.closeImageZoom = closeZoom;
})();
