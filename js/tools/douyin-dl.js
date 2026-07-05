// ===== 抖音无水印下载 — 多层回退 + oEmbed + CORS代理 =====
function Tool_douyin_dl(container) {
  let videos = [];

  // Local proxy URL (started by start.sh)
  const LOCAL_PROXY = 'http://localhost:8765';
  let localProxyAvailable = false;

  // Multiple CORS proxies to try (fallback when local proxy not available)
  const PROXIES = [
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url) => `https://cors-anywhere.herokuapp.com/${url}`,
    (url) => `https://thingproxy.freeboard.io/fetch/${url}`,
  ];

  container.innerHTML = `
    <div style="max-width:700px;margin:0 auto">
      <div class="form-group">
        <label>📋 粘贴包含抖音链接的文字</label>
        <textarea id="dyInput" rows="4" placeholder="从微信/QQ复制含有抖音链接的文字粘贴到这里
例如：https://v.douyin.com/xxxxx/" style="width:100%;resize:vertical;font-size:0.9rem;padding:12px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card);color:var(--text)"></textarea>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:16px">
        <button class="btn btn-primary" id="dyParse">🔍 解析链接</button>
        <button class="btn btn-secondary" id="dyClear">清空</button>
      </div>

      <div id="dyStatus" style="text-align:center;font-size:0.85rem;color:var(--text-muted);margin-bottom:12px"></div>
      <div id="dyResults" style="display:flex;flex-direction:column;gap:12px"></div>

      <details id="dyDebug" style="margin-top:16px;font-size:0.75rem;color:var(--text-muted);display:none">
        <summary style="cursor:pointer">🔧 调试信息</summary>
        <pre id="dyDebugLog" style="white-space:pre-wrap;word-break:break-all;margin-top:8px;padding:8px;background:var(--bg);border-radius:4px;max-height:300px;overflow-y:auto"></pre>
      </details>
    </div>
  `;

  const $ = s => container.querySelector(s);
  const input = $('#dyInput');
  const resultsDiv = $('#dyResults');
  const statusDiv = $('#dyStatus');
  const debugDetails = $('#dyDebug');
  const debugLog = $('#dyDebugLog');
  let debugLines = [];

  function log(msg) {
    debugLines.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    debugLog.textContent = debugLines.join('\n');
    debugDetails.style.display = 'block';
  }

  // ── Extract Douyin links from text ──
  function extractLinks(text) {
    const links = new Set();
    const patterns = [
      /https?:\/\/v\.douyin\.com\/[a-zA-Z0-9]+\/?/gi,
      /https?:\/\/(?:www\.)?douyin\.com\/video\/(\d+)/gi,
      /https?:\/\/(?:www\.)?douyin\.com\/user\/[a-zA-Z0-9]+/gi,
      /https?:\/\/[a-zA-Z0-9.-]*iesdouyin\.com\/[^\s]+/gi,
    ];
    for (const re of patterns) {
      const matches = text.match(re);
      if (matches) matches.forEach(m => links.add(m.replace(/\/$/, '')));
    }
    return [...links];
  }

  // ── Fetch with timeout ──
  async function fetchWithTimeout(url, timeoutMs = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      return resp;
    } catch(e) {
      clearTimeout(timer);
      throw e;
    }
  }

  // ── Check if local proxy is available ──
  async function checkLocalProxy() {
    try {
      const resp = await fetch(`${LOCAL_PROXY}/health`, { signal: AbortSignal.timeout(2000) });
      localProxyAvailable = resp.ok;
      log(`本地代理: ${localProxyAvailable ? '✅ 可用' : '❌ 不可用'}`);
    } catch(e) {
      localProxyAvailable = false;
      log(`本地代理: ❌ 未启动 (${e.message})`);
    }
  }

  // ── Try local proxy first, then fallback to public proxies ──
  async function fetchViaProxy(url, expectJson = false) {
    // If local proxy is available, use it for iesdouyin API
    if (localProxyAvailable && url.includes('iesdouyin.com')) {
      const videoIdMatch = url.match(/item_ids=(\d+)/);
      const videoId = videoIdMatch ? videoIdMatch[1] : null;
      if (videoId) {
        try {
          const resp = await fetchWithTimeout(`${LOCAL_PROXY}/api/video?id=${videoId}`, 15000);
          if (resp.ok) {
            const data = await resp.json();
            if (data.success) {
              log('本地代理成功');
              // Return in same format as iesdouyin API
              return {
                item_list: [{
                  desc: data.title,
                  author: { nickname: data.author },
                  video: {
                    play_addr: { url_list: [data.video_url] },
                    cover: { url_list: [data.thumbnail] },
                  }
                }]
              };
            }
          }
        } catch(e) {
          log(`本地代理失败: ${e.message}`);
        }
      }
    }

    // Fallback to public proxies
    for (let i = 0; i < PROXIES.length; i++) {
      const proxyUrl = PROXIES[i](url);
      log(`尝试代理 #${i+1}: ${proxyUrl.substring(0, 80)}...`);
      try {
        const resp = await fetchWithTimeout(proxyUrl, 10000);
        if (resp.ok) {
          const text = await resp.text();
          if (expectJson) {
            try {
              return JSON.parse(text);
            } catch(e) {
              log(`代理 #${i+1} 返回非 JSON: ${text.substring(0, 100)}`);
              continue;
            }
          }
          log(`代理 #${i+1} 成功 (${text.length} 字节)`);
          return text;
        }
        log(`代理 #${i+1} HTTP ${resp.status}`);
      } catch(e) {
        log(`代理 #${i+1} 失败: ${e.message}`);
      }
    }
    return null;
  }

  // ── Resolve short link to full URL and extract video ID ──
  async function resolveShortLink(shortUrl) {
    log(`解析短链接: ${shortUrl}`);

    // Try local proxy first
    if (localProxyAvailable) {
      try {
        const resp = await fetchWithTimeout(
          `${LOCAL_PROXY}/api/resolve?url=${encodeURIComponent(shortUrl)}`, 10000
        );
        if (resp.ok) {
          const data = await resp.json();
          if (data.success && data.video_id) {
            log(`本地代理解析成功, video_id: ${data.video_id}`);
            return { videoId: data.video_id, title: '', author: '', thumbnail: '' };
          }
        }
      } catch(e) {
        log(`本地代理解析失败: ${e.message}`);
      }
    }

    // Method 1: Try oEmbed directly (often has CORS)
    const encodedUrl = encodeURIComponent(shortUrl);
    const oembedUrl = `https://www.douyin.com/oembed?url=${encodedUrl}&format=json`;

    try {
      log('尝试直接 oEmbed...');
      const resp = await fetchWithTimeout(oembedUrl, 8000);
      if (resp.ok) {
        const data = await resp.json();
        log(`oEmbed 成功! 标题: ${data.title}`);
        const idMatch = (data.html || data.url || '').match(/video\/(\d+)/);
        const videoId = idMatch ? idMatch[1] : null;
        return {
          videoId,
          title: data.title || '',
          author: data.author_name || '',
          thumbnail: data.thumbnail_url || '',
        };
      }
      log(`oEmbed HTTP ${resp.status}`);
    } catch(e) {
      log(`oEmbed 直连失败: ${e.message}`);
    }

    // Method 2: Try oEmbed via proxy  
    const proxyResult = await fetchViaProxy(oembedUrl, true);
    if (proxyResult) {
      log(`oEmbed 代理成功!`);
      const idMatch = (proxyResult.html || proxyResult.url || '').match(/video\/(\d+)/);
      const videoId = idMatch ? idMatch[1] : null;
      return {
        videoId,
        title: proxyResult.title || '',
        author: proxyResult.author_name || '',
        thumbnail: proxyResult.thumbnail_url || '',
      };
    }

    // Method 3: Fetch the share page via proxy to extract video ID from HTML
    log('尝试抓取分享页 HTML...');
    const html = await fetchViaProxy(shortUrl);
    if (html) {
      // Look for video ID in various patterns
      const patterns = [
        /"video_id"\s*:\s*"(\d+)"/,
        /video\/(\d+)/,
        /item_id["']?\s*:\s*["']?(\d+)/,
        /aweme_id["']?\s*:\s*["']?(\d+)/,
        /"aweme_id":"(\d+)"/,
        /data-vid="(\d+)"/,
      ];
      for (const pat of patterns) {
        const m = html.match(pat);
        if (m) {
          log(`从HTML提取到 video_id: ${m[1]}`);
          return { videoId: m[1], title: '', author: '', thumbnail: '' };
        }
      }
      log('HTML 中未找到 video_id');
    }

    // Method 4: Try to extract video ID from the short link code
    const shortCode = shortUrl.match(/v\.douyin\.com\/([a-zA-Z0-9]+)/);
    if (shortCode) {
      log(`短码: ${shortCode[1]}, 无法解析`);
    }

    return null;
  }

  // ── Get download URL from iesdouyin API ──
  async function getDownloadUrl(videoId) {
    log(`获取下载地址, video_id: ${videoId}`);
    
    // Try multiple API endpoints
    const apiUrls = [
      `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${videoId}`,
      `https://www.douyin.com/aweme/v1/web/aweme/detail/?aweme_id=${videoId}`,
    ];
    
    let data = null;
    for (const apiUrl of apiUrls) {
      log(`尝试 API: ${apiUrl.substring(0, 60)}...`);
      data = await fetchViaProxy(apiUrl, true);
      if (data && data.item_list) break;
    }
    if (!data || !data.item_list || !data.item_list[0]) {
      log('iesdouyin API 获取失败');
      return null;
    }

    const item = data.item_list[0];
    const video = item.video;
    if (!video || !video.play_addr || !video.play_addr.url_list) {
      log('视频数据不完整');
      return null;
    }

    // Get watermark-free URL
    let videoUrl = video.play_addr.url_list[0];
    videoUrl = videoUrl.replace('playwm', 'play');
    log(`下载地址: ${videoUrl.substring(0, 80)}...`);

    return {
      videoUrl,
      title: item.desc || '',
      author: item.author ? item.author.nickname : '',
      thumbnail: video.cover ? video.cover.url_list[0] : '',
    };
  }

  // ── Parse button ──
  $('#dyParse').onclick = async () => {
    const text = input.value.trim();
    if (!text) { Utils.toast('请先粘贴包含抖音链接的文字', 'error'); return; }

    debugLines = [];
    debugDetails.style.display = 'none';
    resultsDiv.innerHTML = '';

    const links = extractLinks(text);
    if (links.length === 0) {
      statusDiv.innerHTML = '❌ 未找到抖音链接<br><small style="color:var(--text-muted)">支持: v.douyin.com / douyin.com/video</small>';
      return;
    }

    log(`找到 ${links.length} 个链接: ${links.join(', ')}`);
    await checkLocalProxy();
    statusDiv.textContent = `🔍 找到 ${links.length} 个链接，正在解析...`;
    videos = [];

    for (let i = 0; i < links.length; i++) {
      const url = links[i];
      statusDiv.textContent = `🔍 解析第 ${i+1}/${links.length} 个...`;
      log(`\n=== 处理链接 ${i+1}: ${url} ===`);

      // Check if already a full douyin.com/video/xxx link
      let videoId = null;
      const fullMatch = url.match(/douyin\.com\/video\/(\d+)/);
      if (fullMatch) {
        videoId = fullMatch[1];
        log(`直接从URL提取 video_id: ${videoId}`);
      }

      let info = null;
      if (!videoId) {
        // Resolve short link
        info = await resolveShortLink(url);
        if (info) videoId = info.videoId;
      } else {
        info = { videoId, title: '', author: '', thumbnail: '' };
      }

      if (!videoId) {
        addCard(url, null, '无法解析此链接，请确认链接有效且视频未删除');
        continue;
      }

      // Get download URL
      const dlInfo = await getDownloadUrl(videoId);
      if (dlInfo) {
        const video = {
          id: videoId,
          title: dlInfo.title || info?.title || '抖音视频',
          author: dlInfo.author || info?.author || '',
          thumbnail: dlInfo.thumbnail || info?.thumbnail || '',
          url: `https://www.douyin.com/video/${videoId}`,
          videoUrl: dlInfo.videoUrl,
        };
        videos.push(video);
        renderCard(video);
        statusDiv.textContent = `✅ 成功解析 ${videos.length} 个视频`;
      } else {
        // Still show card with basic info, but without download URL
        const basic = {
          id: videoId,
          title: info?.title || '抖音视频',
          author: info?.author || '',
          thumbnail: info?.thumbnail || '',
          url: `https://www.douyin.com/video/${videoId}`,
          videoUrl: null,
        };
        addCard(basic, url, '无法获取下载地址（API 可能已变更），点击打开原视频手动下载');
      }
    }

    if (videos.length === 0 && resultsDiv.children.length === 0) {
      statusDiv.innerHTML = `❌ 所有链接解析失败<br><small style="color:var(--text-muted)">请检查链接是否有效，或展开调试信息查看详情</small>`;
    }
  };

  // ── Download video ──
  async function doDownload(video, statusEl, btnEl) {
    btnEl.disabled = true;
    btnEl.textContent = '⏳ 下载中...';
    statusEl.textContent = '';

    if (!video.videoUrl) {
      // Retry getting download URL
      statusEl.textContent = '尝试获取下载地址...';
      const dl = await getDownloadUrl(video.id);
      if (dl && dl.videoUrl) {
        video.videoUrl = dl.videoUrl;
      }
    }

    if (!video.videoUrl) {
      statusEl.textContent = '⚠️ 无法获取无水印地址';
      window.open(video.url, '_blank');
      Utils.toast('已打开原视频页面', 'info');
      btnEl.disabled = false;
      btnEl.textContent = '📥 重试下载';
      return;
    }

    try {
      // Try to download via blob
      const resp = await fetchWithTimeout(video.videoUrl, 30000);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const contentLength = resp.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength) : 0;

      if (total > 0) {
        statusEl.textContent = `下载中 0/${(total/1024/1024).toFixed(1)}MB...`;
      }

      const reader = resp.body.getReader();
      const chunks = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (total > 0) {
          statusEl.textContent = `下载中 ${(received/1024/1024).toFixed(1)}/${(total/1024/1024).toFixed(1)}MB...`;
        }
      }

      const blob = new Blob(chunks, { type: 'video/mp4' });
      const filename = (video.title || 'douyin_video').replace(/[\\/:*?"<>|]/g, '_') + '.mp4';
      Utils.download(blob, filename);
      statusEl.textContent = '✅ 下载完成！';
      Utils.toast('下载完成', 'success');
    } catch(e) {
      log(`下载失败: ${e.message}`);
      statusEl.textContent = `❌ 下载失败: ${e.message}`;
      // Fallback: open in browser
      window.open(video.url, '_blank');
    }

    btnEl.disabled = false;
    btnEl.textContent = '📥 重新下载';
  }

  // ── Render video card ──
  function renderCard(video) {
    const card = document.createElement('div');
    card.style.cssText = 'display:flex;gap:12px;padding:12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-card);align-items:center';

    const thumbHtml = video.thumbnail
      ? `<img src="${video.thumbnail}" style="width:120px;height:160px;object-fit:cover;border-radius:6px" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 120 160%22><rect fill=%22%23eee%22 width=%22120%22 height=%22160%22/><text x=%2260%22 y=%2285%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2230%22>🎬</text></svg>'">`
      : `<div style="width:120px;height:160px;background:var(--bg);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:2rem">🎬</div>`;

    card.innerHTML = `
      ${thumbHtml}
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:0.9rem;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${Utils.escapeHtml(video.title)}</div>
        ${video.author ? `<div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:8px">@${Utils.escapeHtml(video.author)}</div>` : ''}
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm dy-dl-btn">📥 下载视频</button>
          <a href="${video.url}" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration:none">🔗 打开原视频</a>
        </div>
        <div class="dy-dl-status" style="font-size:0.75rem;color:var(--text-muted);margin-top:4px"></div>
      </div>
    `;

    resultsDiv.appendChild(card);

    card.querySelector('.dy-dl-btn').onclick = function() {
      doDownload(video, card.querySelector('.dy-dl-status'), this);
    };
  }

  function addCard(info, url, reason) {
    const card = document.createElement('div');
    card.style.cssText = 'display:flex;gap:12px;padding:12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-card);align-items:center';

    const thumbHtml = info && info.thumbnail
      ? `<img src="${info.thumbnail}" style="width:80px;height:100px;object-fit:cover;border-radius:6px" onerror="this.style.display='none'">`
      : '';

    card.innerHTML = `
      ${thumbHtml}
      <div style="flex:1;min-width:0">
        <div style="font-size:0.8rem;word-break:break-all;margin-bottom:4px;color:var(--text-muted)">${Utils.escapeHtml(url || (info ? info.url : ''))}</div>
        ${info && info.title ? `<div style="font-size:0.85rem;margin-bottom:4px">${Utils.escapeHtml(info.title)}</div>` : ''}
        <div style="font-size:0.75rem;color:var(--warning);margin-bottom:4px">${reason}</div>
        ${info ? `<a href="${info.url}" target="_blank" class="btn btn-sm btn-secondary" style="text-decoration:none;display:inline-block">🔗 打开原视频</a>` : ''}
      </div>
    `;
    resultsDiv.appendChild(card);
  }

  // ── Clear ──
  $('#dyClear').onclick = () => {
    input.value = '';
    resultsDiv.innerHTML = '';
    statusDiv.textContent = '';
    debugLines = [];
    debugLog.textContent = '';
    debugDetails.style.display = 'none';
    videos = [];
  };

  // ── Auto-detect on paste ──
  input.addEventListener('paste', () => {
    setTimeout(() => {
      const links = extractLinks(input.value);
      if (links.length > 0) {
        statusDiv.textContent = `📋 检测到 ${links.length} 个链接，点击"解析链接"`;
      }
    }, 100);
  });
}

function Tool_douyin_dl_deactivate() {}
