/**
 * Печать картинки штрихкода через скрытый iframe (window.print() внутри него) — без открытия
 * отдельного окна/вкладки с картинкой, сразу появляется системный диалог печати.
 *
 * ВАЖНО: браузеры разрешают печать только в ответ на прямой клик пользователя — вызывайте
 * это строго из синхронного обработчика клика, не после await/промиса.
 *
 * sizeMm — физический размер страницы печати в мм (для этикеточных принтеров). Без него
 * печатается на дефолтном размере бумаги браузера, просто с отступом вокруг картинки.
 */
export function printBarcodeImage(dataUrl: string, title: string, count = 1, sizeMm?: { width: number; height: number }): boolean {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    document.body.removeChild(iframe);
    return false;
  }

  const safeCount = Math.max(1, Math.min(20, count));
  const imgStyle = sizeMm ? "width:100%;height:100%;object-fit:contain;display:block" : "width:100%;max-width:320px;display:block;margin:0 auto";
  const imgTag = `<img src="${dataUrl}" style="${imgStyle};page-break-after:always" />`;
  const pageRule = sizeMm ? `@page{size:${sizeMm.width}mm ${sizeMm.height}mm;margin:0}` : "@page{margin:6mm}";
  const bodyStyle = sizeMm ? "margin:0" : "margin:0;font-family:sans-serif;text-align:center";
  const titleTag = sizeMm ? "" : `<p>${title}</p>`;

  const cleanup = () => {
    if (iframe.parentNode) document.body.removeChild(iframe);
  };
  win.onafterprint = cleanup;
  setTimeout(cleanup, 10_000); // запасной вариант, если onafterprint не сработает в браузере

  doc.open();
  doc.write(
    `<html><head><title>${title}</title><style>${pageRule}body{${bodyStyle}}p{font-size:12px;margin:4px 0 10px}</style></head><body onload="window.focus();window.print()">${titleTag}${imgTag.repeat(safeCount)}</body></html>`,
  );
  doc.close();
  return true;
}
