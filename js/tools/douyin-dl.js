// ===== 抖音无水印下载 — 链接解析 + 视频提取 =====
function Tool_douyin_dl(container) {
  let videos = [];
  let processing = false;

  container.innerHTML = `
    <div style="max-width:700px;margin:0 auto">
      <div class="form-group">
        <label>📋 粘贴包含抖音链接的文字</label>
        <textarea id="dyInput" rows="4" placeholder="从微信/QQ/微博复制含有抖音链接的文字粘贴到这里，自动识别链接...
例如：https://v.douyin.com/xxxxx/  或  https://www.douyin.com/video/123456" style="width:100%;resize:vertical;font-size:0.9rem;padding:12px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card);color:var(--text)"></textarea>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:16px">
        <button class="btn btn-primary" id="dyParse">🔍 解析链接</button>
        <button class="btn btn-secondary" id="dyClear">清空</button>
        <span style="font-size:0.78rem;color:var(--text-muted);display:flex;align-items:center">支持：v.douyin.com / douyin.com/video</span>
      </div>

      <div id="dyStatus" style="text-align:center;font-size:0.85rem;color:var(--text-muted);margin-bottom:12px"></div>

      <div id="dyResults" style="display:flex;flex-direction:column;gap:12px"></div>

      <div id="dyHelp" class="hidden" style="margin-top:16px;padding:12px;background:var(--bg);border-radius:8px;border:1px solid var(--border);font-size:0.8rem;color:var(--text-muted)">
        <strong>💡 如果下载失败：</strong><br>
        1. 确认链接是抖音分享链接（v.douyin.com 开头或 douyin.com/video）<br>
        2. 部分视频可能受隐私设置保护，无法下载<br>
        3. 可尝试在浏览器中打开视频页面后，使用右键"另存为"<br>
        4. Windows 用户可安装 <a href="https://www.douyin.com" target="_blank">抖音 PC 版</a> 客户端下载
      </div>
    </div>
  `;

  const $ = s => container.querySelector(s);
  const input = $('#dyInput');
  const resultsDiv = $('#dyResults');
  const statusDiv = $('#dyStatus');
  const helpDiv = $('#dyHelp');

  // ── Parse Douyin links from text ──
  function extractLinks(text) {
    const links = new Set();
    // v.douyin.com short links
    const shortRe = /https?:\/\/v\.douyin\.com\/[a-zA-Z0-9]+\/?/gi;
    // douyin.com/video/xxx full links  
    const fullRe = /https?:\/\/(?:www\.)?douyin\.com\/video\/(\d+)/gi;
    // douyin.com/user/xxx style
    const userRe = /https?:\/\/(?:www\.)?douyin\.com\/user\/[a-zA-Z0-9]+/gi;
    // iesdouyin.com shared links
    const iesRe = /https?:\/\/[a-zA-Z0-9.-]*iesdouyin\.com\/[^\s]+/gi;

    for (const re of [shortRe, fullRe, userRe, iesRe]) {
      const matches = text.match(re);
      if (matches) matches.forEach(m => links.add(m.replace(/\/$/, '')));
    }

    return [...links];
  }

  // ── Parse button ──
  $('#dyParse').onclick = async () => {
    const text = input.value.trim();
    if (!text) { Utils.toast('请先粘贴包含抖音链接的文字', 'error'); return; }

    const links = extractLinks(text);
    if (links.length === 0) {
      statusDiv.textContent = '❌ 未找到抖音链接，请确认链接格式正确';
      helpDiv.classList.remove('hidden');
      return;
    }

    statusDiv.textContent = `🔍 找到 ${links.length} 个链接，正在获取视频信息...`;
    helpDiv.classList.add('hidden');
    resultsDiv.innerHTML = '';

    videos = [];
    processing = true;

    for (let i = 0; i < links.length; i++) {
      statusDiv.textContent = `🔍 正在处理第 ${i+1}/${links.length} 个链接...`;
      try {
        const info = await fetchVideoInfo(links[i]);
        if (info) {
          videos.push(info);
          renderVideo(i, info);
        } else {
          addFailedCard(links[i], '无法获取视频信息');
        }
      } catch(e) {
        addFailedCard(links[i], e.message || '请求失败');
      }
    }

    processing = false;
    if (videos.length > 0) {
      statusDiv.textContent = `✅ 成功解析 ${videos.length} 个视频`;
    } else {
      statusDiv.textContent = '❌ 所有链接解析失败';
      helpDiv.classList.remove('hidden');
    }
  };

  // ── Fetch video info (try multiple methods) ──
  async function fetchVideoInfo(url) {
    // Method 1: Try direct redirect to get video ID
    let videoId = null;

    // Extract from full URL
    const fullMatch = url.match(/douyin\.com\/video\/(\d+)/);
    if (fullMatch) videoId = fullMatch[1];

    // For short links, we need to follow redirect
    if (!videoId && url.includes('v.douyin.com')) {
      try {
        const resp = await fetch(url, { method: 'HEAD', redirect: 'follow', mode: 'no-cors' });
        // no-cors mode won't give us the redirect URL...
        // Try to extract from the short link itself
        const shortMatch = url.match(/v\.douyin\.com\/([a-zA-Z0-9]+)/);
        if (shortMatch) {
          // Use a proxy to resolve the short link
          const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
          try {
            const proxyResp = await fetch(proxyUrl);
            const html = await proxyResp.text();
            const idMatch = html.match(/video\/(\d+)/);
            if (idMatch) videoId = idMatch[1];
          } catch(e) {
            // Proxy failed, try alternative
          }
        }
      } catch(e) {}
    }

    if (!videoId) {
      // Last resort: try to guess video ID from URL
      const idMatch = url.match(/(\d{15,20})/);
      if (idMatch) videoId = idMatch[1];
    }

    if (!videoId) return null;

    // Method 2: Try Douyin oEmbed API (sometimes CORS-friendly)
    try {
      const oembedUrl = `https://www.douyin.com/oembed?url=https://www.douyin.com/video/${videoId}&format=json`;
      const resp = await fetchByProxy(oembedUrl);
      if (resp) {
        const data = JSON.parse(resp);
        return {
          id: videoId,
          title: data.title || '抖音视频',
          author: data.author_name || '',
          thumbnail: data.thumbnail_url || '',
          url: `https://www.douyin.com/video/${videoId}`,
          videoUrl: null, // Will try to get actual download URL
        };
      }
    } catch(e) {}

    // Method 3: Try third-party API
    try {
      const apiUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent('https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=' + videoId)}`;
      const resp = await fetch(apiUrl);
      if (resp.ok) {
        const data = JSON.parse(await resp.text());
        if (data.item_list && data.item_list[0]) {
          const item = data.item_list[0];
          const videoInfo = item.video;
          // Get watermark-free URL: replace playwm with play
          let videoUrl = '';
          if (videoInfo && videoInfo.play_addr && videoInfo.play_addr.url_list) {
            videoUrl = videoInfo.play_addr.url_list[0];
            videoUrl = videoUrl.replace('playwm', 'play').replace('watermark=1', 'watermark=0');
          }
          return {
            id: videoId,
            title: item.desc || '抖音视频',
            author: item.author ? item.author.nickname : '',
            thumbnail: videoInfo && videoInfo.cover ? videoInfo.cover.url_list[0] : '',
            url: `https://www.douyin.com/video/${videoId}`,
            videoUrl: videoUrl,
          };
        }
      }
    } catch(e) {}

    // Fallback: return basic info
    return {
      id: videoId,
      title: '抖音视频',
      author: '',
      thumbnail: '',
      url: `https://www.douyin.com/video/${videoId}`,
      videoUrl: null,
    };
  }

  // ── Helper: fetch via CORS proxy ──
  async function fetchByProxy(url) {
    const proxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
    ];
    for (const proxyUrl of proxies) {
      try {
        const resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
        if (resp.ok) return await resp.text();
      } catch(e) {}
    }
    return null;
  }

  // ── Download video ──
  async function downloadVideo(video) {
    if (!video.videoUrl) {
      // Try to get video URL
      try {
        const apiUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent('https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=' + video.id)}`;
        const resp = await fetch(apiUrl);
        if (resp.ok) {
          const data = JSON.parse(await resp.text());
          if (data.item_list && data.item_list[0] && data.item_list[0].video) {
            const vi = data.item_list[0].video;
            if (vi.play_addr && vi.play_addr.url_list) {
              video.videoUrl = vi.play_addr.url_list[0].replace('playwm', 'play');
            }
          }
        }
      } catch(e) {}
    }

    if (!video.videoUrl) {
      // Open in new tab as fallback
      window.open(video.url, '_blank');
      Utils.toast('已在新标签页打开视频，可使用浏览器下载', 'info');
      return;
    }

    // Download via blob
    try {
      statusDiv.textContent = '📥 正在下载...';
      const resp = await fetch(video.videoUrl.replace('http://', 'https://'));
      if (!resp.ok) throw new Error('Download failed');
      const blob = await resp.blob();
      const filename = (video.title || 'douyin_video') + '.mp4';
      Utils.download(blob, filename.replace(/[\\/:*?"<>|]/g, '_'));
      Utils.toast('下载完成', 'success');
      statusDiv.textContent = '✅ 下载完成';
    } catch(e) {
      // Fallback: open in new tab
      window.open(video.url, '_blank');
      Utils.toast('直接下载失败，已在新标签页打开', 'info');
    }
  }

  // ── Render video card ──
  function renderVideo(idx, video) {
    const card = document.createElement('div');
    card.className = 'dy-video-card';
    card.id = `dy-card-${idx}`;
    card.style.cssText = 'display:flex;gap:12px;padding:12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-card);align-items:center';

    const thumbHtml = video.thumbnail
      ? `<img src="${video.thumbnail}" style="width:120px;height:160px;object-fit:cover;border-radius:6px" onerror="this.style.display='none'">`
      : `<div style="width:120px;height:160px;background:var(--bg);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:2rem">🎬</div>`;

    card.innerHTML = `
      ${thumbHtml}
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:0.9rem;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${Utils.escapeHtml(video.title) || '抖音视频'}</div>
        ${video.author ? `<div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:8px">@${Utils.escapeHtml(video.author)}</div>` : ''}
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm dy-dl-btn" data-idx="${idx}">📥 下载视频</button>
          <a href="${video.url}" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration:none">🔗 打开原视频</a>
        </div>
        <div class="dy-dl-status" style="font-size:0.75rem;color:var(--text-muted);margin-top:4px"></div>
      </div>
    `;

    resultsDiv.appendChild(card);

    // Bind download button
    card.querySelector('.dy-dl-btn').onclick = async function() {
      const btn = this;
      btn.disabled = true;
      btn.textContent = '⏳ 获取中...';
      const statusEl = card.querySelector('.dy-dl-status');
      try {
        await downloadVideo(video);
        statusEl.textContent = '✅ 下载完成';
      } catch(e) {
        statusEl.textContent = '❌ ' + e.message;
      }
      btn.disabled = false;
      btn.textContent = '📥 下载视频';
    };
  }

  function addFailedCard(url, reason) {
    const card = document.createElement('div');
    card.style.cssText = 'display:flex;gap:12px;padding:12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-card);align-items:center;opacity:0.7';
    card.innerHTML = `
      <div style="font-size:2rem">⚠️</div>
      <div style="flex:1">
        <div style="font-size:0.8rem;word-break:break-all;margin-bottom:4px">${Utils.escapeHtml(url)}</div>
        <div style="font-size:0.75rem;color:var(--warning)">${reason}</div>
      </div>
    `;
    resultsDiv.appendChild(card);
  }

  // ── Clear ──
  $('#dyClear').onclick = () => {
    input.value = '';
    resultsDiv.innerHTML = '';
    statusDiv.textContent = '';
    helpDiv.classList.add('hidden');
    videos = [];
  };

  // ── Paste event: auto-detect links ──
  input.addEventListener('paste', () => {
    setTimeout(() => {
      const text = input.value;
      const links = extractLinks(text);
      if (links.length > 0) {
        statusDiv.textContent = `📋 检测到 ${links.length} 个抖音链接，点击"解析链接"获取视频`;
      }
    }, 100);
  });
}

function Tool_douyin_dl_deactivate() {}
