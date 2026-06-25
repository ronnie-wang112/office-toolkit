function Tool_img_crop(container) {
  let imgObj = null;
  let rotation = 0;
  let crop = { x: 0, y: 0, w: 200, h: 200 };
  let isDragging = false;
  let dragTarget = null;
  let dragStart = { x: 0, y: 0 };

  container.innerHTML = `
    <div class="drop-zone" id="cropDrop">
      <div class="drop-zone-icon">✂️</div>
      <div class="drop-zone-text">选择要裁剪的图片</div>
    </div>
    <div id="cropArea" class="hidden">
      <div class="btn-group" style="margin-top:0;margin-bottom:12px">
        <button class="btn btn-secondary btn-sm" id="rotateLeft">↺ 左转</button>
        <button class="btn btn-secondary btn-sm" id="rotateRight">↻ 右转</button>
        <button class="btn btn-secondary btn-sm" id="resetCrop">重置裁剪框</button>
      </div>
      <div class="crop-container" id="cropContainer">
        <canvas id="cropCanvas"></canvas>
        <div class="crop-overlay" id="cropOverlay">
          <div class="crop-box" id="cropBox">
            <div class="crop-handle nw" data-handle="nw"></div>
            <div class="crop-handle ne" data-handle="ne"></div>
            <div class="crop-handle sw" data-handle="sw"></div>
            <div class="crop-handle se" data-handle="se"></div>
          </div>
        </div>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" id="cropApply">裁剪并下载</button>
      </div>
    </div>
    <input type="file" id="cropInput" accept="image/*" style="display:none">
  `;

  const dropZone = container.querySelector('#cropDrop');
  const fileInput = container.querySelector('#cropInput');
  const cropArea = container.querySelector('#cropArea');
  const cropCanvas = container.querySelector('#cropCanvas');
  const cropContainer = container.querySelector('#cropContainer');
  const cropOverlay = container.querySelector('#cropOverlay');
  const cropBox = container.querySelector('#cropBox');
  const ctx = cropCanvas.getContext('2d');

  function renderCrop() {
    const cw = cropContainer.clientWidth;
    const scale = cw / imgObj.width;
    const ch = imgObj.height * scale;
    cropCanvas.width = cw;
    cropCanvas.height = ch;
    ctx.clearRect(0, 0, cw, ch);

    ctx.save();
    ctx.translate(cw / 2, ch / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(imgObj, -cw / 2, -ch / 2, cw, ch);
    ctx.restore();

    cropOverlay.style.width = cw + 'px';
    cropOverlay.style.height = ch + 'px';

    cropBox.style.left = crop.x * scale + 'px';
    cropBox.style.top = crop.y * scale + 'px';
    cropBox.style.width = crop.w * scale + 'px';
    cropBox.style.height = crop.h * scale + 'px';
  }

  async function loadFile(file) {
    imgObj = await Utils.loadImageFromFile(file);
    crop = { x: 20, y: 20, w: Math.min(imgObj.width - 40, 300), h: Math.min(imgObj.height - 40, 300) };
    rotation = 0;
    cropArea.classList.remove('hidden');
    dropZone.classList.add('hidden');
    setTimeout(renderCrop, 100);
  }

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) loadFile(f);
  });
  fileInput.addEventListener('change', () => { if (fileInput.files[0]) loadFile(fileInput.files[0]); });

  container.querySelector('#rotateLeft').addEventListener('click', () => { rotation = (rotation - 90) % 360; renderCrop(); });
  container.querySelector('#rotateRight').addEventListener('click', () => { rotation = (rotation + 90) % 360; renderCrop(); });
  container.querySelector('#resetCrop').addEventListener('click', () => {
    crop = { x: 20, y: 20, w: Math.min(imgObj.width - 40, 300), h: Math.min(imgObj.height - 40, 300) };
    renderCrop();
  });

  // Drag & resize crop box
  cropBox.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('crop-handle')) {
      dragTarget = e.target.dataset.handle;
    } else {
      dragTarget = 'move';
    }
    isDragging = true;
    const scale = cropContainer.clientWidth / imgObj.width;
    dragStart = { x: e.clientX, y: e.clientY, cropX: crop.x, cropY: crop.y, cropW: crop.w, cropH: crop.h };
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const scale = cropContainer.clientWidth / imgObj.width;
    const dx = (e.clientX - dragStart.x) / scale;
    const dy = (e.clientY - dragStart.y) / scale;

    if (dragTarget === 'move') {
      crop.x = Math.max(0, Math.min(imgObj.width - crop.w, dragStart.cropX + dx));
      crop.y = Math.max(0, Math.min(imgObj.height - crop.h, dragStart.cropY + dy));
    } else if (dragTarget === 'se') {
      crop.w = Math.max(20, dragStart.cropW + dx);
      crop.h = Math.max(20, dragStart.cropH + dy);
    } else if (dragTarget === 'nw') {
      crop.x = Math.max(0, dragStart.cropX + dx);
      crop.y = Math.max(0, dragStart.cropY + dy);
      crop.w = Math.max(20, dragStart.cropW - dx);
      crop.h = Math.max(20, dragStart.cropH - dy);
    } else if (dragTarget === 'ne') {
      crop.y = Math.max(0, dragStart.cropY + dy);
      crop.w = Math.max(20, dragStart.cropW + dx);
      crop.h = Math.max(20, dragStart.cropH - dy);
    } else if (dragTarget === 'sw') {
      crop.x = Math.max(0, dragStart.cropX + dx);
      crop.w = Math.max(20, dragStart.cropW - dx);
      crop.h = Math.max(20, dragStart.cropH + dy);
    }
    renderCrop();
  });

  document.addEventListener('mouseup', () => { isDragging = false; dragTarget = null; });

  // Touch support
  cropBox.addEventListener('touchstart', (e) => {
    if (e.target.classList.contains('crop-handle')) {
      dragTarget = e.target.dataset.handle;
    } else {
      dragTarget = 'move';
    }
    isDragging = true;
    const scale = cropContainer.clientWidth / imgObj.width;
    dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, cropX: crop.x, cropY: crop.y, cropW: crop.w, cropH: crop.h };
    e.preventDefault();
  });
  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const scale = cropContainer.clientWidth / imgObj.width;
    const dx = (e.touches[0].clientX - dragStart.x) / scale;
    const dy = (e.touches[0].clientY - dragStart.y) / scale;
    if (dragTarget === 'move') {
      crop.x = Math.max(0, Math.min(imgObj.width - crop.w, dragStart.cropX + dx));
      crop.y = Math.max(0, Math.min(imgObj.height - crop.h, dragStart.cropY + dy));
    } else if (dragTarget === 'se') {
      crop.w = Math.max(20, dragStart.cropW + dx);
      crop.h = Math.max(20, dragStart.cropH + dy);
    }
    renderCrop();
  });
  document.addEventListener('touchend', () => { isDragging = false; dragTarget = null; });

  window.addEventListener('resize', renderCrop);

  container.querySelector('#cropApply').addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = crop.w;
    canvas.height = crop.h;
    const c = canvas.getContext('2d');

    c.save();
    if (rotation !== 0) {
      c.translate(canvas.width / 2, canvas.height / 2);
      c.rotate((rotation * Math.PI) / 180);
      c.translate(-canvas.width / 2, -canvas.height / 2);
    }
    c.drawImage(imgObj, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
    c.restore();

    canvas.toBlob(blob => {
      Utils.download(blob, '裁剪图片.png');
      Utils.toast('裁剪完成', 'success');
    }, 'image/png');
  });

  // Deactivate cleanup
  window.Tool_img_crop_deactivate = () => {
    window.removeEventListener('resize', renderCrop);
  };
}
