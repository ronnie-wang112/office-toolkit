// ===== 图片擦除 — 手动涂抹 + FMM 修复算法 + 水印检测 =====
function Tool_image_inpaint(container) {
  let originalImage = null;
  let displayCanvas = null;
  let maskCanvas = null;
  let resultCanvas = null;
  let undoStack = [];
  let isDrawing = false;
  let brushSize = 20;
  let toolMode = 'brush'; // 'brush' | 'eraser'
  let showingResult = false;
  let zoomLevel = 1;
  let panOffset = { x: 0, y: 0 };

  container.innerHTML = `
    <div style="display:flex;gap:16px;flex-wrap:wrap">
      <!-- Left: Editor -->
      <div style="flex:1;min-width:320px">
        <div style="margin-bottom:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <button class="btn btn-secondary btn-sm" id="ipUpload">📤 选择图片</button>
          <span style="font-size:0.8rem;color:var(--text-muted)" id="ipFileLabel">未选择图片</span>
        </div>

        <div style="border:1px solid var(--border);border-radius:8px;background:repeating-conic-gradient(#e0e0e0 0% 25%,#fff 0% 50%) 50%/16px 16px;min-height:200px;display:flex;align-items:center;justify-content:center;cursor:crosshair;padding:8px" id="ipCanvasWrap">
          <canvas id="ipCanvas" style="max-width:100%;height:auto;display:block"></canvas>
        </div>

        <div style="margin-top:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:0.8rem">画笔</span>
            <input type="range" id="ipBrushSize" min="3" max="80" value="20" style="width:100px">
            <span style="font-size:0.8rem;min-width:30px" id="ipBrushLabel">20px</span>
          </div>

          <button class="btn btn-sm ${toolMode==='brush'?'btn-primary':'btn-secondary'}" id="ipBrushBtn">🖌️ 涂抹</button>
          <button class="btn btn-sm btn-secondary" id="ipEraserBtn">🧹 橡皮</button>

          <button class="btn btn-sm btn-secondary" id="ipUndo">↩ 撤销</button>
          <button class="btn btn-sm btn-secondary" id="ipClearMask">🗑 清除涂抹</button>
        </div>

        <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary" id="ipProcess">✨ 执行擦除</button>
          <button class="btn btn-secondary" id="ipAutoDetect">🔍 自动找水印</button>
          <button class="btn btn-secondary hidden" id="ipToggle">👁 对比原图</button>
        </div>

        <div style="margin-top:4px;font-size:0.78rem;color:var(--text-muted)" id="ipStatus"></div>
      </div>

      <!-- Right: Result -->
      <div style="flex:1;min-width:280px">
        <h4 style="margin-bottom:6px;font-size:0.75rem;color:var(--text-muted);text-align:center">✨ 擦除结果</h4>
        <div style="border:1px solid var(--border);border-radius:8px;background:repeating-conic-gradient(#e0e0e0 0% 25%,#fff 0% 50%) 50%/16px 16px;min-height:200px;display:flex;align-items:center;justify-content:center" id="ipResultWrap">
          <canvas id="ipResultCanvas" style="max-width:100%"></canvas>
          <div id="ipResultEmpty" style="color:var(--text-muted);font-size:0.85rem">涂抹区域后点击"执行擦除"</div>
        </div>
        <div style="margin-top:8px;text-align:center">
          <button class="btn btn-primary hidden" id="ipDownload">📥 下载结果</button>
        </div>
      </div>
    </div>
    <input type="file" id="ipFileInput" accept="image/*" style="display:none">
  `;

  const $ = s => container.querySelector(s);
  const canvas = $('#ipCanvas');
  const ctx = canvas.getContext('2d');
  resultCanvas = $('#ipResultCanvas'); resultCanvas.width = 0; resultCanvas.height = 0;
  const resultCtx = resultCanvas.getContext('2d');
  const canvasWrap = $('#ipCanvasWrap');
  const brushSizeInput = $('#ipBrushSize');
  const brushLabel = $('#ipBrushLabel');
  const statusDiv = $('#ipStatus');

  // ── Load image ──
  $('#ipUpload').onclick = () => $('#ipFileInput').click();
  $('#ipFileInput').onchange = () => {
    const f = $('#ipFileInput').files[0];
    if (!f) return;
    $('#ipFileLabel').textContent = f.name;

    const img = new Image();
    img.onload = () => {
      originalImage = img;
      initCanvases(img);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(f);
  };

  function initCanvases(img) {
    // Responsive sizing: fit within wrapper, cap at image natural size
    const wrapWidth = canvasWrap.clientWidth || 360;
    const maxW = Math.min(wrapWidth, img.width, 1200);
    let w = img.width, h = img.height;
    if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }

    canvas.width = w;
    canvas.height = h;
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    // Mask canvas (same size as image canvas)
    maskCanvas = document.createElement('canvas');
    maskCanvas.width = w;
    maskCanvas.height = h;

    // Display canvas reference
    displayCanvas = document.createElement('canvas');
    displayCanvas.width = w;
    displayCanvas.height = h;

    // Result canvas
    resultCanvas.width = w;
    resultCanvas.height = h;
    resultCtx.clearRect(0, 0, w, h);

    // Remove fixed size on wrapper
    canvasWrap.style.width = '';
    canvasWrap.style.height = '';

    undoStack = [];
    showingResult = false;
    $('#ipResultEmpty').style.display = 'block';
    $('#ipDownload').classList.add('hidden');
    $('#ipToggle').classList.add('hidden');
    statusDiv.textContent = '';
  }

  // ── Drawing ──
  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY)
    };
  }

  function drawMask(x, y) {
    if (!maskCanvas) return;
    const mctx = maskCanvas.getContext('2d');
    if (toolMode === 'brush') {
      mctx.fillStyle = 'rgba(255,0,0,0.6)';
      mctx.beginPath();
      mctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      mctx.fill();
    } else {
      // Eraser: use clearRect to remove mask
      mctx.clearRect(x - brushSize/2, y - brushSize/2, brushSize, brushSize);
    }
    updateDisplay();
  }

  function updateDisplay() {
    if (!displayCanvas || !maskCanvas || !canvas) return;
    const dctx = displayCanvas.getContext('2d');
    dctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    // Draw original image
    dctx.drawImage(canvas, 0, 0);
    // Overlay mask as semi-transparent red (efficient compositing)
    dctx.globalAlpha = 0.35;
    dctx.drawImage(maskCanvas, 0, 0);
    dctx.globalAlpha = 1.0;
    // Copy to visible canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(displayCanvas, 0, 0);
  }

  canvas.addEventListener('mousedown', (e) => {
    if (!originalImage) return;
    saveUndo();
    isDrawing = true;
    const pos = getPos(e);
    drawMask(pos.x, pos.y);
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    drawMask(pos.x, pos.y);
  });

  document.addEventListener('mouseup', () => { isDrawing = false; });

  // Touch support
  canvas.addEventListener('touchstart', (e) => {
    if (!originalImage) return;
    e.preventDefault();
    saveUndo();
    isDrawing = true;
    const pos = getPos(e.touches[0]);
    drawMask(pos.x, pos.y);
  });

  canvas.addEventListener('touchmove', (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPos(e.touches[0]);
    drawMask(pos.x, pos.y);
  });

  document.addEventListener('touchend', () => { isDrawing = false; });

  // ── Undo stack ──
  function saveUndo() {
    if (!maskCanvas) return;
    const copy = document.createElement('canvas');
    copy.width = maskCanvas.width;
    copy.height = maskCanvas.height;
    copy.getContext('2d').drawImage(maskCanvas, 0, 0);
    undoStack.push(copy);
    if (undoStack.length > 20) undoStack.shift();
  }

  $('#ipUndo').onclick = () => {
    if (undoStack.length === 0 || !maskCanvas) return;
    const prev = undoStack.pop();
    maskCanvas.getContext('2d').clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    maskCanvas.getContext('2d').drawImage(prev, 0, 0);
    updateDisplay();
  };

  $('#ipClearMask').onclick = () => {
    if (!maskCanvas) return;
    saveUndo();
    maskCanvas.getContext('2d').clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    updateDisplay();
    statusDiv.textContent = '已清除涂抹';
  };

  // ── Tool mode ──
  $('#ipBrushBtn').onclick = () => {
    toolMode = 'brush';
    $('#ipBrushBtn').className = 'btn btn-sm btn-primary';
    $('#ipEraserBtn').className = 'btn btn-sm btn-secondary';
    canvas.style.cursor = 'crosshair';
  };
  $('#ipEraserBtn').onclick = () => {
    toolMode = 'eraser';
    $('#ipEraserBtn').className = 'btn btn-sm btn-primary';
    $('#ipBrushBtn').className = 'btn btn-sm btn-secondary';
    canvas.style.cursor = 'cell';
  };

  // ── Brush size ──
  brushSizeInput.oninput = () => {
    brushSize = parseInt(brushSizeInput.value);
    brushLabel.textContent = brushSize + 'px';
  };

  // ── Toggle before/after ──
  let showingOriginal = false;
  $('#ipToggle').onclick = () => {
    if (!resultCanvas || resultCanvas.width === 0) return;
    showingOriginal = !showingOriginal;
    if (showingOriginal) {
      // Show original image on main canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
      $('#ipToggle').textContent = '👁 查看结果';
    } else {
      updateDisplay();
      $('#ipToggle').textContent = '👁 对比原图';
    }
  };

  // ── FMM Inpainting Algorithm ──
  function inpaint(imageData, maskData) {
    const w = imageData.width;
    const h = imageData.height;
    const pixels = imageData.data;
    const mask = maskData.data;

    // Create working arrays
    const known = new Uint8Array(w * h); // 1=known, 0=unknown
    const distance = new Float32Array(w * h);
    const band = []; // narrow band pixels to process
    const T = new Float32Array(w * h); // distance to boundary

    const INF = 1e10;
    T.fill(INF);

    // Initialize: mark known/unknown
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const mIdx = idx * 4;
        if (mask[mIdx + 3] < 10) {
          known[idx] = 1;
        } else {
          known[idx] = 0;
        }
      }
    }

    // Find boundary pixels (unknown pixels adjacent to known pixels)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (known[idx] === 1) continue;

        let isBoundary = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h && known[ny * w + nx] === 1) {
              isBoundary = true;
              break;
            }
          }
          if (isBoundary) break;
        }

        if (isBoundary) {
          T[idx] = 0;
          band.push({ x, y, t: 0 });
        }
      }
    }

    // Fast Marching: propagate from boundary inward
    while (band.length > 0) {
      // Find pixel with minimum T
      let minIdx = 0;
      for (let i = 1; i < band.length; i++) {
        if (band[i].t < band[minIdx].t) minIdx = i;
      }

      const p = band[minIdx];
      band.splice(minIdx, 1);

      const idx = p.y * w + p.x;
      if (known[idx] === 1) continue;
      known[idx] = 1;

      // Compute pixel color from known neighbors (weighted by distance)
      let sumR = 0, sumG = 0, sumB = 0, sumW = 0;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = p.x + dx, ny = p.y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const nidx = ny * w + nx;
          if (known[nidx] !== 1 || T[nidx] >= INF) continue;

          const dist = Math.sqrt(dx * dx + dy * dy);
          const weight = 1 / (dist * dist + 0.001);
          const pi = nidx * 4;
          sumR += pixels[pi] * weight;
          sumG += pixels[pi + 1] * weight;
          sumB += pixels[pi + 2] * weight;
          sumW += weight;
        }
      }

      if (sumW > 0) {
        const pi = idx * 4;
        pixels[pi] = Math.round(sumR / sumW);
        pixels[pi + 1] = Math.round(sumG / sumW);
        pixels[pi + 2] = Math.round(sumB / sumW);
        pixels[pi + 3] = 255;
      }

      // Add neighbors to narrow band
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = p.x + dx, ny = p.y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const nidx = ny * w + nx;
          if (known[nidx] === 1) continue;

          // Compute new T value
          let minT = INF;
          for (let d2y = -1; d2y <= 1; d2y++) {
            for (let d2x = -1; d2x <= 1; d2x++) {
              if (d2x === 0 && d2y === 0) continue;
              const nnx = nx + d2x, nny = ny + d2y;
              if (nnx < 0 || nnx >= w || nny < 0 || nny >= h) continue;
              const nnidx = nny * w + nnx;
              if (known[nnidx] === 1 && T[nnidx] < minT) {
                minT = T[nnidx] + Math.sqrt(d2x * d2x + d2y * d2y);
              }
            }
          }

          if (minT < T[nidx]) {
            T[nidx] = minT;
            // Remove existing entry if any
            const existingIdx = band.findIndex(b => b.x === nx && b.y === ny);
            if (existingIdx >= 0) band.splice(existingIdx, 1);
            band.push({ x: nx, y: ny, t: minT });
          }
        }
      }
    }

    // Copy result back to imageData
    return new ImageData(new Uint8ClampedArray(pixels), w, h);
  }

  // ── Process (Execute Inpainting) ──
  $('#ipProcess').onclick = () => {
    if (!originalImage || !maskCanvas) {
      Utils.toast('请先选择图片并涂抹要擦除的区域', 'error');
      return;
    }

    const maskCtx = maskCanvas.getContext('2d');
    const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

    // Check if mask is empty
    let hasMask = false;
    for (let i = 0; i < maskData.data.length; i += 4) {
      if (maskData.data[i + 3] > 10) { hasMask = true; break; }
    }
    if (!hasMask) {
      Utils.toast('请先在图片上涂抹要擦除的区域', 'error');
      return;
    }

    statusDiv.textContent = '🔄 正在修复...';

    // Dilate mask slightly for better blending (feathering)
    const dilatedMask = dilateMask(maskData, 3);

    // Get image data and run inpainting
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Run inpainting (async to avoid blocking UI)
    setTimeout(() => {
      const result = inpaint(imageData, dilatedMask);

      // Apply feather blending at edges
      const finalResult = blendEdges(ctx.getImageData(0, 0, canvas.width, canvas.height), result, dilatedMask);

      resultCtx.putImageData(finalResult, 0, 0);
      $('#ipResultEmpty').style.display = 'none';
      $('#ipDownload').classList.remove('hidden');
      $('#ipToggle').classList.remove('hidden');
      showingResult = true;
      statusDiv.textContent = '✅ 擦除完成';
      Utils.toast('擦除完成', 'success');
    }, 50);
  };

  // ── Dilate mask (expand edges for feathering) ──
  function dilateMask(maskData, radius) {
    const w = maskData.width;
    const h = maskData.height;
    const result = new ImageData(w, h);
    const src = maskData.data;
    const dst = result.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        let maxAlpha = src[idx + 3];

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
            const nidx = (ny * w + nx) * 4;
            if (src[nidx + 3] > maxAlpha) maxAlpha = src[nidx + 3];
          }
        }

        dst[idx] = 255;
        dst[idx + 1] = 255;
        dst[idx + 2] = 255;
        dst[idx + 3] = maxAlpha;
      }
    }
    return result;
  }

  // ── Blend edges (feather transition between original and inpainted) ──
  function blendEdges(originalData, inpaintedData, maskData) {
    const w = originalData.width;
    const h = originalData.height;
    const result = new ImageData(w, h);

    // Gaussian blur the mask for smooth transition
    const blurredMask = gaussianBlurMask(maskData, 4);

    for (let i = 0; i < result.data.length; i += 4) {
      const alpha = blurredMask.data[i + 3] / 255;
      result.data[i] = Math.round(originalData.data[i] * (1 - alpha) + inpaintedData.data[i] * alpha);
      result.data[i + 1] = Math.round(originalData.data[i + 1] * (1 - alpha) + inpaintedData.data[i + 1] * alpha);
      result.data[i + 2] = Math.round(originalData.data[i + 2] * (1 - alpha) + inpaintedData.data[i + 2] * alpha);
      result.data[i + 3] = 255;
    }

    return result;
  }

  function gaussianBlurMask(maskData, radius) {
    const w = maskData.width;
    const h = maskData.height;
    const result = new ImageData(w, h);

    // Build kernel
    const kernel = [];
    const sigma = radius / 2;
    let sum = 0;
    for (let y = -radius; y <= radius; y++) {
      kernel[y + radius] = [];
      for (let x = -radius; x <= radius; x++) {
        const val = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
        kernel[y + radius][x + radius] = val;
        sum += val;
      }
    }
    // Normalize
    for (let y = 0; y <= radius * 2; y++)
      for (let x = 0; x <= radius * 2; x++)
        kernel[y][x] /= sum;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let val = 0;
        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            const nx = x + kx, ny = y + ky;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
            val += maskData.data[(ny * w + nx) * 4 + 3] * kernel[ky + radius][kx + radius];
          }
        }
        const idx = (y * w + x) * 4;
        result.data[idx] = 255;
        result.data[idx + 1] = 255;
        result.data[idx + 2] = 255;
        result.data[idx + 3] = Math.min(255, Math.round(val));
      }
    }
    return result;
  }

  // ── Auto-detect watermarks (heuristic) ──
  $('#ipAutoDetect').onclick = () => {
    if (!originalImage || !maskCanvas) {
      Utils.toast('请先选择图片', 'error');
      return;
    }

    statusDiv.textContent = '🔍 正在分析图片...';
    saveUndo();

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const maskCtx = maskCanvas.getContext('2d');
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

    // Simple heuristic: find areas with high local variance + semi-transparency patterns
    // Look for text-like features: high contrast edges in small clusters
    const w = imageData.width, h = imageData.height;
    const pixels = imageData.data;

    // Edge detection (Sobel) then find dense edge clusters
    const edges = new Uint8Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        // Sobel on grayscale
        const tl = toGray(pixels, (y-1)*w+(x-1));
        const tc = toGray(pixels, (y-1)*w+x);
        const tr = toGray(pixels, (y-1)*w+(x+1));
        const ml = toGray(pixels, y*w+(x-1));
        const mr = toGray(pixels, y*w+(x+1));
        const bl = toGray(pixels, (y+1)*w+(x-1));
        const bc = toGray(pixels, (y+1)*w+x);
        const br = toGray(pixels, (y+1)*w+(x+1));

        const gx = -tl + tr - 2*ml + 2*mr - bl + br;
        const gy = -tl - 2*tc - tr + bl + 2*bc + br;
        const mag = Math.sqrt(gx * gx + gy * gy);
        edges[y * w + x] = mag > 50 ? 255 : 0;
      }
    }

    // Find clusters of edges (potential watermark text)
    const blockSize = 24;
    for (let by = 0; by < h; by += blockSize) {
      for (let bx = 0; bx < w; bx += blockSize) {
        let edgeCount = 0;
        const maxBY = Math.min(by + blockSize, h);
        const maxBX = Math.min(bx + blockSize, w);

        for (let y = by; y < maxBY; y++) {
          for (let x = bx; x < maxBX; x++) {
            if (edges[y * w + x] > 0) edgeCount++;
          }
        }

        // If block has significant edge density, mark it
        const totalPixels = (maxBY - by) * (maxBX - bx);
        if (edgeCount > totalPixels * 0.05) {
          maskCtx.fillStyle = 'rgba(255, 0, 0, 0.5)';
          maskCtx.fillRect(bx, by, maxBX - bx, maxBY - by);
        }
      }
    }

    updateDisplay();
    statusDiv.textContent = '✅ 已标记可能的水印区域，可手动调整后执行擦除';
  };

  function toGray(pixels, pixelIdx) {
    const i = pixelIdx * 4;
    return pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
  }

  // ── Download ──
  $('#ipDownload').onclick = () => {
    if (!resultCanvas || resultCanvas.width === 0) return;
    resultCanvas.toBlob(blob => {
      Utils.download(blob, '擦除结果.png');
      Utils.toast('已下载', 'success');
    }, 'image/png');
  };
}

function Tool_image_inpaint_deactivate() {}
