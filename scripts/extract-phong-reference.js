import { readFile, writeFile } from 'node:fs/promises';

const [scriptPath, profilePath, outputPath] = process.argv.slice(2);
if (!scriptPath || !profilePath) {
  console.error('Usage: npm run inspect:phong -- <locketmphong_v95.js> <locketmphong.conf> [output.json]');
  process.exitCode = 1;
} else {
  const [script, profile] = await Promise.all([
    readFile(scriptPath, 'utf8'), readFile(profilePath, 'utf8'),
  ]);
  const report = JSON.stringify(inventory(script, profile), null, 2) + '\n';
  if (outputPath) await writeFile(outputPath, report);
  else process.stdout.write(report);
}

function staticJson(script, key) {
  const prefix = `const ${key} = `;
  const literal = script.split(/\r?\n/).find((line) => line.trimStart().startsWith(prefix));
  if (!literal) throw new Error(`Missing static declaration ${key}`);
  return JSON.parse(literal.trim().slice(prefix.length).replace(/;$/, ''));
}

function assetName(value) {
  if (typeof value !== 'string' || !value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return url.pathname.split('/').pop() || undefined;
  } catch {
    // A non-URL value is not an asset reference.
  }
  return undefined;
}

function summarizeCaption({ overlay_id, source, sort_order, caption }) {
  const { type, text, localized_text, max_lines, text_color, background, icon } = caption;
  return {
    overlay_id, source, sort_order,
    caption: {
      type, text, localized_text, max_lines, text_color,
      background: background?.colors ? { colors: background.colors } : undefined,
      icon: icon && { type: icon.type, data: icon.type === 'emoji' ? icon.data : undefined },
    },
  };
}

function summarizeFilter(filter) {
  return {
    id: filter.id,
    name: filter.name,
    category: filter.category,
    type: filter.type,
    filterType: filter.filterType,
    usesOverlay: Boolean(filter.overlay),
    previewAsset: assetName(filter.imageUrl),
    iconAsset: assetName(filter.iconUrl),
    overlayAsset: assetName(filter.overlayImageUrl ?? filter.overlayImageURL),
    captureButtonColors: filter.captureButtonColors,
    textColor: filter.textColor,
    hasPrompt: Boolean(filter.prompt),
    hasOutputUrl: Boolean(filter.outputUrl),
    hasReferenceImages: Boolean(filter.referenceImages?.length),
    hasPhotoCount: Object.hasOwn(filter, 'photoCount'),
    hasLayout: Object.hasOwn(filter, 'layout') || Object.hasOwn(filter, 'slots'),
  };
}

function inventory(script, profile) {
  const groups = staticJson(script, 'CUSTOM_OVERLAY_ITEMS');
  const camera = staticJson(script, 'CUSTOM_CAMERA_FILTER_CONFIG');
  const filters = camera.filters.map(summarizeFilter);
  const photobooth = filters.filter((filter) => /^(?:pb_|photobooth_)/.test(filter.id));
  const widgetJson = /const custom_frame_obj = JSON\.stringify\(\s*(\{[\s\S]*?\})\s*\);/.exec(script)?.[1];
  const widget = widgetJson ? JSON.parse(widgetJson) : null;
  const activeLines = profile.split(/\r?\n/).map((line) => line.trim()).filter((line) => !line.startsWith('#'));
  const cloudRules = activeLines.filter((line) => line.includes('cloudfunctions') && line.includes('type=http-'));
  const scriptLines = script.split(/\r?\n/);

  return {
    sources: ['locketmphong_v95.js', 'locketmphong.conf'],
    captionGroups: groups.map(({ section, items }) => ({ section, items: items.map(summarizeCaption) })),
    filters,
    photoboothIds: photobooth.map((filter) => filter.id),
    widgetOverlay: widget && {
      id: widget.uid,
      placement: widget.placement,
      asset: assetName(widget.url),
    },
    profileObservation: {
      cloudFunctionHookCount: cloudRules.length,
      cloudFunctionHookTypes: cloudRules.map((line) => /type=(http-(?:request|response))/.exec(line)[1]),
      cloudFunctionHookReadsBody: cloudRules.some((line) => /requires-body=(?:1|true)\b/.test(line)),
      hasCloudFunctionUrlRewrite: activeLines.some((line) => line.startsWith('^') && line.includes('cloudfunctions')),
    },
    endpointMentions: Object.fromEntries(
      ['generateFilteredImage', 'createOverlay', 'generateFilter', 'applyFilter', 'getFilters', 'createFilter'].map((name) =>
        [name, scriptLines.flatMap((line, index) => line.includes(name) ? [index + 1] : [])]),
    ),
  };
}
