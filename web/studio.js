const api = '/api/photobooth';
const dom = Object.fromEntries([
  'studio', 'frame-settings', 'upload-settings', 'output-settings', 'counts', 'frames', 'frame-status',
  'preview', 'preview-heading', 'preview-size', 'preview-name', 'result', 'stage-empty', 'back-to-layout', 'photo-count',
  'slots', 'input-limits', 'file-status', 'format', 'compose', 'job-status', 'save-actions', 'save', 'share', 'retry',
].map((id) => [id, document.getElementById(id)]));
const stage = document.querySelector('.stage');

const state = {
  config: null, frames: [], frame: null, selectedId: null, count: 1,
  photos: Array(4).fill(null), edits: [], pendingFiles: new Map(),
  frameRequest: null, busy: false, output: null, showingResult: false,
};

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function status(node, message = '', error = false) {
  node.textContent = message;
  node.classList.toggle('error', error);
}

async function jsonResponse(response) {
  const json = await response.json().catch(() => null);
  if (!response.ok || !json) {
    throw new Error(json?.error?.message ?? 'Không kết nối được với Photobooth. Hãy thử lại.');
  }
  return json;
}

function clearOutput() {
  if (state.output) URL.revokeObjectURL(state.output.url);
  state.output = null;
  state.showingResult = false;
  dom.result.removeAttribute('src');
  dom['save-actions'].hidden = true;
  dom.save.removeAttribute('href');
  status(dom['job-status']);
  showView();
}

function showView() {
  dom.preview.hidden = state.showingResult;
  dom.result.hidden = !state.showingResult;
  dom['back-to-layout'].hidden = !state.showingResult;
  dom['preview-heading'].textContent = state.showingResult ? 'Ảnh đã ghép' : 'Xem trước';
}

function refreshControls() {
  const ready = Boolean(state.frame);
  dom['frame-settings'].disabled = !state.config || state.busy;
  dom['upload-settings'].disabled = !ready || state.busy;
  dom['output-settings'].disabled = !ready || state.busy;
  const filled = state.photos.slice(0, state.count).filter(Boolean).length;
  dom['photo-count'].textContent = ready ? `${filled} / ${state.count} ảnh` : '';
  dom.compose.disabled = !ready || filled !== state.count || Boolean(state.pendingFiles.size) || state.busy;
}

function renderCounts() {
  dom.counts.replaceChildren(...state.config.photoCounts.map((count) => {
    const button = element('button', null, `${count} ảnh`);
    button.type = 'button';
    button.setAttribute('aria-pressed', String(state.count === count));
    button.addEventListener('click', () => {
      if (state.count === count) return;
      state.count = count;
      for (const option of dom.counts.children) option.setAttribute('aria-pressed', String(option === button));
      renderFrames();
      selectFrame(state.frames.find((frame) => frame.photoCount === count)?.id);
    });
    return button;
  }));
}

function renderFrames() {
  dom.frames.replaceChildren(...state.frames.filter((frame) => frame.photoCount === state.count).map((frame) => {
    const button = element('button', 'frame');
    button.type = 'button';
    button.dataset.id = frame.id;
    button.setAttribute('aria-pressed', String(state.selectedId === frame.id));
    const art = element('span', 'frame-art');
    const image = element('img');
    image.src = new URL(frame.previewUrl, location.href).pathname;
    image.alt = '';
    art.append(image);
    button.append(art, element('span', 'frame-name', frame.name), element('span', 'frame-description', frame.description));
    button.addEventListener('click', () => selectFrame(frame.id));
    return button;
  }));
}

async function selectFrame(id) {
  if (state.frame?.id === id) return;
  state.frameRequest?.abort();
  clearOutput();
  state.frame = null;
  state.selectedId = id;
  dom.slots.replaceChildren();
  for (const button of dom.frames.children) button.setAttribute('aria-pressed', String(button.dataset.id === id));
  refreshControls();
  updatePreview();

  if (!id) {
    status(dom['frame-status'], 'Chưa có khung cho số ảnh này.');
    return;
  }

  const controller = new AbortController();
  state.frameRequest = controller;
  status(dom['frame-status'], 'Đang tải bố cục…');
  try {
    const response = await fetch(`${api}/frames/${encodeURIComponent(id)}`, { signal: controller.signal });
    const frame = await jsonResponse(response);
    if (controller.signal.aborted) return;
    state.frame = frame;
    state.edits = frame.slots.map(({ fit, x, y }) => ({ fit, x, y }));
    status(dom['frame-status']);
    status(dom['file-status']);
    drawSlots();
    updatePreview();
  } catch (error) {
    if (!controller.signal.aborted) status(dom['frame-status'], error.message, true);
  } finally {
    if (state.frameRequest === controller) refreshControls();
  }
}

function updatePreview() {
  const frame = state.frame;
  dom.preview.replaceChildren();
  dom['stage-empty'].hidden = Boolean(frame);
  dom['preview-size'].textContent = frame ? `${frame.canvas.width} × ${frame.canvas.height} px` : '';
  dom['preview-name'].textContent = frame?.name ?? '';
  if (!frame) return;

  const { width, height } = frame.canvas;
  dom.preview.style.setProperty('--ratio', width / height);
  dom.preview.style.background = frame.background;
  for (const [index, slot] of frame.slots.entries()) {
    const cell = element('div', 'preview-slot');
    cell.style.left = `${100 * slot.left / width}%`;
    cell.style.top = `${100 * slot.top / height}%`;
    cell.style.width = `${100 * slot.width / width}%`;
    cell.style.height = `${100 * slot.height / height}%`;
    cell.style.borderRadius = `${100 * slot.radius / slot.width}% / ${100 * slot.radius / slot.height}%`;
    cell.style.background = frame.slotColor;
    const photo = state.photos[index];
    if (photo) {
      const img = element('img');
      img.src = photo.url;
      img.alt = `Ảnh ${index + 1}`;
      applyCrop(img, state.edits[index]);
      cell.append(img);
      cell.style.background = 'transparent';
    } else {
      const number = element('span', null, String(index + 1));
      number.setAttribute('aria-hidden', 'true');
      cell.append(number);
    }
    dom.preview.append(cell);
  }
  if (frame.overlayUrl) {
    const overlay = element('img', 'preview-overlay');
    overlay.src = new URL(frame.overlayUrl, location.href).pathname;
    overlay.alt = '';
    dom.preview.append(overlay);
  }
}

function applyCrop(image, { fit, x, y }) {
  image.style.objectFit = fit;
  image.style.objectPosition = fit === 'cover' ? `${x * 100}% ${y * 100}%` : 'center';
}

function button(label, className = 'secondary') {
  const node = element('button', className, label);
  node.type = 'button';
  return node;
}

function drawSlots() {
  const open = [...dom.slots.querySelectorAll('details')].map((node) => node.open);
  dom.slots.replaceChildren(...state.frame.slots.map((slot, index) => {
    const row = element('div', 'slot-row');
    const head = element('div', 'slot-header');
    const label = element('span', 'slot-label', `Ảnh ${index + 1}`);
    const photo = state.photos[index];
    const input = element('input');
    input.type = 'file';
    input.accept = state.config.inputFormats.join(',');
    input.hidden = true;
    input.addEventListener('change', () => {
      if (input.files[0]) setPhoto(index, input.files[0]);
      input.value = '';
    });
    const choose = button(photo ? 'Đổi ảnh' : 'Chọn ảnh');
    choose.setAttribute('aria-label', `${choose.textContent} ${index + 1}`);
    choose.addEventListener('click', () => input.click());
    head.append(input, label, choose);
    row.append(head);
    if (photo) {
      row.classList.add('has-photo');
      label.append(element('span', 'slot-filename', photo.file.name));
      const remove = button('Xóa');
      remove.setAttribute('aria-label', `Xóa ảnh ${index + 1}`);
      remove.addEventListener('click', () => {
        state.pendingFiles.delete(index);
        URL.revokeObjectURL(photo.url);
        state.photos[index] = null;
        state.edits[index] = { fit: slot.fit, x: slot.x, y: slot.y };
        clearOutput();
        drawSlots();
        updatePreview();
        refreshControls();
      });
      head.append(remove);
      row.append(cropControls(state.edits[index], index, Boolean(open[index])));
    }
    return row;
  }));
}

function cropControls(edit, index, open) {
  const details = element('details', 'crop');
  details.open = open;
  const controls = element('div', 'crop-controls');
  const slot = state.frame.slots[index];
  const sample = element('div', 'crop-sample');
  const sampleImage = element('img');
  sample.style.aspectRatio = `${slot.width} / ${slot.height}`;
  sample.style.background = state.frame.background;
  sampleImage.src = state.photos[index].url;
  sampleImage.alt = `Khung cắt ảnh ${index + 1}`;
  applyCrop(sampleImage, edit);
  sample.append(sampleImage);
  controls.append(sample);

  const refreshPreview = () => {
    applyCrop(sampleImage, edit);
    clearOutput();
    updatePreview();
  };
  const label = element('label', null, 'Cách đặt ảnh');
  const select = element('select');
  for (const [value, text] of [['cover', 'Lấp đầy ô'], ['contain', 'Giữ toàn bộ ảnh']]) {
    const option = element('option', null, text);
    option.value = value;
    select.append(option);
  }
  select.value = edit.fit;
  label.append(select);
  controls.append(label);

  const position = [['x', 'Căn trái / phải'], ['y', 'Căn trên / dưới']].map(([key, name]) => {
    const label = element('label', null, name);
    const input = element('input');
    input.type = 'range';
    input.min = '0';
    input.max = '100';
    input.value = String(edit[key] * 100);
    input.addEventListener('input', () => {
      edit[key] = Number(input.value) / 100;
      refreshPreview();
    });
    label.append(input);
    controls.append(label);
    return label;
  });

  const updatePositionControls = () => {
    for (const label of position) label.hidden = edit.fit === 'contain';
  };
  select.addEventListener('change', () => {
    edit.fit = select.value;
    updatePositionControls();
    refreshPreview();
  });
  updatePositionControls();
  details.append(element('summary', null, 'Chỉnh khung cắt'), controls);
  return details;
}

async function setPhoto(index, file) {
  const validType = state.config.inputFormats.includes(file.type) || (!file.type && /\.(jpe?g|png|webp)$/i.test(file.name));
  if (!validType || file.size > state.config.maxImageBytes) {
    status(dom['file-status'], validType ? 'Tệp ảnh quá lớn.' : 'Hãy chọn ảnh PNG, JPEG hoặc WebP.', true);
    return;
  }

  const pending = Symbol();
  state.pendingFiles.set(index, pending);
  const url = URL.createObjectURL(file);
  refreshControls();
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (image.naturalWidth * image.naturalHeight > state.config.maxInputPixels) {
      throw new Error('Kích thước ảnh vượt giới hạn pixel.');
    }
    if (state.pendingFiles.get(index) !== pending) {
      URL.revokeObjectURL(url);
      return;
    }
    if (state.photos[index]) URL.revokeObjectURL(state.photos[index].url);
    state.photos[index] = { file, url };
    status(dom['file-status']);
    clearOutput();
    if (state.frame) {
      drawSlots();
      updatePreview();
    }
  } catch (error) {
    URL.revokeObjectURL(url);
    if (state.pendingFiles.get(index) === pending) {
      status(dom['file-status'], error instanceof DOMException ? 'Không đọc được ảnh này.' : error.message, true);
    }
  } finally {
    if (state.pendingFiles.get(index) === pending) state.pendingFiles.delete(index);
    refreshControls();
  }
}

function requestComposition(form, onUpload) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', api + '/compose');
    request.responseType = 'blob';
    request.timeout = state.config.requestTimeoutMs + 15_000;
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onUpload(Math.round(100 * event.loaded / event.total));
    });
    request.upload.addEventListener('load', () => onUpload(100));
    request.addEventListener('load', async () => {
      if (request.status === 200 && state.config.inputFormats.includes(request.response?.type)) {
        resolve(request.response);
        return;
      }
      const error = await request.response?.text().then(JSON.parse).catch(() => null);
      reject(new Error(error?.error?.message ?? 'Máy chủ chưa trả về ảnh. Hãy thử lại.'));
    });
    request.addEventListener('error', () => reject(new Error('Mất kết nối. Hãy thử lại.')), { once: true });
    request.addEventListener('timeout', () => reject(new Error('Yêu cầu quá thời gian. Hãy thử lại.')), { once: true });
    request.send(form);
  });
}

dom.studio.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (dom.compose.disabled) return;
  clearOutput();
  state.busy = true;
  refreshControls();
  status(dom['job-status'], 'Đang tải ảnh lên…');
  const form = new FormData();
  const format = dom.format.value;
  form.set('frameId', state.frame.id);
  form.set('format', format);
  form.set('edits', JSON.stringify(state.edits));
  for (const photo of state.photos.slice(0, state.count)) form.append('photos', photo.file);

  try {
    const blob = await requestComposition(form, (percent) => {
      status(dom['job-status'], percent === 100 ? 'Đang ghép ảnh…' : `Đang tải ảnh lên · ${percent}%`);
    });
    const filename = `khon168-${state.frame.id}.${format === 'jpeg' ? 'jpg' : format}`;
    const file = new File([blob], filename, { type: blob.type });
    const url = URL.createObjectURL(blob);
    state.output = { file, url };
    state.showingResult = true;
    dom.result.src = url;
    dom.save.href = url;
    dom.save.download = filename;
    dom['save-actions'].hidden = false;
    dom.share.hidden = !navigator.canShare?.({ files: [file] });
    showView();
    status(dom['job-status'], 'Ảnh đã sẵn sàng để lưu.');
    if (window.matchMedia('(max-width: 790px)').matches) {
      document.querySelector('.workspace').scrollIntoView({ block: 'start' });
    }
  } catch (error) {
    status(dom['job-status'], error.message, true);
  } finally {
    state.busy = false;
    refreshControls();
  }
});

dom.format.addEventListener('change', clearOutput);
dom['back-to-layout'].addEventListener('click', () => {
  state.showingResult = false;
  showView();
});
dom.share.addEventListener('click', async () => {
  if (!state.output) return;
  try {
    await navigator.share({ files: [state.output.file] });
  } catch (error) {
    if (error.name !== 'AbortError') status(dom['job-status'], 'Chia sẻ không thành công. Bạn vẫn có thể tải ảnh.', true);
  }
});

new ResizeObserver(([entry]) => {
  stage.style.setProperty('--stage-height', `${entry.contentRect.height}px`);
}).observe(stage);
document.querySelector('.help-link').addEventListener('click', () => {
  document.getElementById('huong-dan').open = true;
});

async function initialize() {
  dom.retry.hidden = true;
  status(dom['frame-status'], 'Đang tải khung ảnh…');
  try {
    const [config, catalog] = await Promise.all([
      fetch(api + '/config').then(jsonResponse),
      fetch(api + '/frames').then(jsonResponse),
    ]);
    state.config = config;
    state.frames = catalog.frames;
    for (const format of config.outputFormats) {
      const option = element('option', null, format.toUpperCase());
      option.value = format;
      dom.format.append(option);
    }
    const mib = (config.maxImageBytes / 1024 ** 2).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
    dom['input-limits'].textContent = `PNG, JPEG hoặc WebP · Tối đa ${mib} MiB mỗi ảnh`;
    renderCounts();
    renderFrames();
    await selectFrame(state.frames.find((frame) => frame.photoCount === state.count)?.id);
  } catch (error) {
    status(dom['frame-status'], error.message, true);
    dom.retry.hidden = false;
  } finally {
    refreshControls();
  }
}
dom.retry.addEventListener('click', initialize);
initialize();
