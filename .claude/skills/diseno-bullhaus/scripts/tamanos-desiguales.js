// Detector de "hermanos desiguales": tarjetas, botones o chips que van juntos (misma clase, mismo padre) y
// no miden lo mismo. Ejemplo real: las tarjetas de Instagram y Facebook, una más ancha que la otra porque
// cada una toma el ancho de su texto. Se pega en la consola del navegador (o en javascript_tool) con la
// página abierta, a 375 y a 1280 px. Devuelve un arreglo; vacío = sin hallazgos.
//
// Solo mira cajas visibles (con fondo, borde o sombra), porque un texto suelto más corto que otro es normal.
// Tolerancia de 4 px. En una fila compara ancho y alto; en una columna, el ancho.
(() => {
  const TOL = 4;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") return false;
    const bg = cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent";
    const border = parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0;
    const shadow = cs.boxShadow !== "none";
    return bg || border || shadow;
  };
  const describe = (el) => {
    const text = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 30);
    return `${el.tagName.toLowerCase()} "${text}"`;
  };
  const out = [];
  for (const parent of document.querySelectorAll("body *")) {
    const kids = [...parent.children].filter(visible);
    if (kids.length < 2) continue;
    const byClass = new Map();
    for (const k of kids) {
      const key = `${k.tagName}|${k.className}`;
      byClass.set(key, [...(byClass.get(key) ?? []), k]);
    }
    for (const group of byClass.values()) {
      if (group.length < 2) continue;
      const rects = group.map((k) => k.getBoundingClientRect());
      const sameRow = rects.every((r) => Math.abs(r.top - rects[0].top) < TOL);
      const sameCol = rects.every((r) => Math.abs(r.left - rects[0].left) < TOL);
      if (!sameRow && !sameCol) continue;
      const ws = rects.map((r) => Math.round(r.width));
      const hs = rects.map((r) => Math.round(r.height));
      const dw = Math.max(...ws) - Math.min(...ws);
      const dh = Math.max(...hs) - Math.min(...hs);
      // Las fotos de una galería (una grande y miniaturas) son desiguales a propósito: se ignoran las <img>.
      if (group[0].tagName === "IMG") continue;
      if ((sameRow && (dw > TOL || dh > TOL)) || (sameCol && !sameRow && dw > TOL)) {
        out.push({
          dentro: describe(parent).slice(0, 50),
          disposicion: sameRow ? "fila" : "columna",
          elementos: group.map(describe),
          anchos: ws,
          altos: hs,
        });
      }
    }
  }
  return out;
})();
