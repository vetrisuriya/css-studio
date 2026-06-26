const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const hexToRgb = (hex) => {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) clean = [...clean].map((part) => part + part).join('');
  const value = parseInt(clean || '000000', 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
};

const rgbToHex = ({ r, g, b }) => `#${[r, g, b]
  .map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0'))
  .join('')}`;

const rgbToHsl = ({ r, g, b }) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (delta) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === r) h = (g - b) / delta + (g < b ? 6 : 0);
    if (max === g) h = (b - r) / delta + 2;
    if (max === b) h = (r - g) / delta + 4;
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
};

const hslToRgb = ({ h, s, l }) => {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0; let g = 0; let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
};

const setCode = (value) => { $('#code').textContent = value; };
const setTextColor = (element, color) => { element.style.color = rgbToHsl(hexToRgb(color)).l > 56 ? '#16091d' : '#fff8df'; };
const updateValues = () => $$('[data-output]').forEach((node) => { node.textContent = $(`#${node.dataset.output}`)?.value ?? ''; });

function init() {
  if (!document.body.dataset.tool) return;
  $$('.copy').forEach((button) => button.addEventListener('click', () => navigator.clipboard?.writeText($('#code').textContent)));
  $$('input, select, textarea').forEach((input) => input.addEventListener('input', render));
  render();
}

function render() {
  updateValues();
  const tool = document.body.dataset.tool;
  const target = $('#target');
  if (!target) return;

  if (tool === 'border-image') {
    const source = $('#biSource').value === 'gradient'
      ? `linear-gradient(${$('#angle').value}deg, ${$('#c1').value}, ${$('#c2').value}, ${$('#c3').value})`
      : `url("${$('#imageUrl').value}")`;
    const css = [
      `${$('#borderWidth').value}px solid transparent`,
      source,
      $('#slice').value,
      $('#biWidth').value,
      $('#outset').value,
      $('#repeat').value,
    ];
    target.style.cssText = `border: ${css[0]}; border-image: ${css[1]} ${css[2]} / ${css[3]} / ${css[4]} ${css[5]}; background: #f2d16a;`;
    setCode(`.element {\n  border: ${css[0]};\n  border-image: ${css[1]} ${css[2]} / ${css[3]} / ${css[4]} ${css[5]};\n}`);
  }

  if (tool === 'radius') {
    const horizontal = $$('.radius').map((input) => `${input.value}px`).join(' ');
    const vertical = $$('.oval').map((input) => `${input.value}px`).join(' ');
    const radius = `${horizontal} / ${vertical}`;
    target.style.borderRadius = radius;
    target.style.background = $('#fill').value;
    setTextColor(target, $('#fill').value);
    setCode(`.element {\n  border-radius: ${radius};\n  background: ${$('#fill').value};\n}`);
  }

  if (tool === 'shadow') {
    const layers = [];
    for (let layer = 1; layer <= 3; layer += 1) {
      if ($(`#on${layer}`).checked) {
        const alpha = Math.round(Number($(`#alpha${layer}`).value) * 255).toString(16).padStart(2, '0');
        layers.push(`${$(`#inset${layer}`).checked ? 'inset ' : ''}${$(`#x${layer}`).value}px ${$(`#y${layer}`).value}px ${$(`#blur${layer}`).value}px ${$(`#spread${layer}`).value}px ${$(`#sc${layer}`).value}${alpha}`);
      }
    }
    const shadow = layers.length ? layers.join(', ') : 'none';
    target.style.boxShadow = shadow;
    setCode(`.element {\n  box-shadow: ${shadow};\n}`);
  }

  if (tool === 'converter') {
    const color = $('#color').value;
    const rgb = hexToRgb(color);
    const hsl = rgbToHsl(rgb);
    const oklch = `oklch(${(hsl.l / 100 * 0.9).toFixed(2)} ${(hsl.s / 100 * 0.25).toFixed(2)} ${hsl.h})`;
    target.style.background = color;
    setTextColor(target, color);
    setCode(`HEX  ${color}\nRGB  rgb(${rgb.r}, ${rgb.g}, ${rgb.b})\nHSL  hsl(${hsl.h} ${hsl.s}% ${hsl.l}%)\nOKLCH  ${oklch}\nText  ${hsl.l > 56 ? '#16091d' : '#fff8df'}`);
  }

  if (tool === 'mixer') {
    const a = hexToRgb($('#a').value);
    const b = hexToRgb($('#b').value);
    const mix = Number($('#mix').value) / 100;
    let output;
    if ($('#mode').value === 'hsl') {
      const ah = rgbToHsl(a);
      const bh = rgbToHsl(b);
      output = hslToRgb({ h: ah.h + (bh.h - ah.h) * mix, s: ah.s + (bh.s - ah.s) * mix, l: ah.l + (bh.l - ah.l) * mix });
    } else {
      output = { r: a.r + (b.r - a.r) * mix, g: a.g + (b.g - a.g) * mix, b: a.b + (b.b - a.b) * mix };
    }
    const mixed = rgbToHex(output);
    target.style.background = mixed;
    setTextColor(target, mixed);
    $$('.swatch').forEach((swatch, index) => {
      const step = index / 4;
      swatch.style.background = rgbToHex({ r: a.r + (b.r - a.r) * step, g: a.g + (b.g - a.g) * step, b: a.b + (b.b - a.b) * step });
    });
    setCode(`.element {\n  background: ${mixed};\n}`);
  }

  if (tool === 'shape') {
    const shapes = {
      blob: 'polygon(50% 0%, 86% 12%, 100% 54%, 76% 100%, 25% 91%, 0% 48%, 14% 10%)',
      diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
      triangle: 'polygon(50% 0%, 0% 100%, 100% 100%)',
      badge: 'polygon(25% 0%, 75% 0%, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0% 75%, 0% 25%)',
      circle: `circle(${$('#size').value}% at ${$('#posx').value}% ${$('#posy').value}%)`,
    };
    const clipPath = shapes[$('#shape').value];
    target.style.clipPath = clipPath;
    target.style.background = $('#shapeColor').value;
    setTextColor(target, $('#shapeColor').value);
    setCode(`.element {\n  clip-path: ${clipPath};\n  background: ${$('#shapeColor').value};\n}`);
  }
}

document.addEventListener('DOMContentLoaded', init);
