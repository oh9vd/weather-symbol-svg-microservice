var h = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports); var y = h((K, w) => { function B(e) { let t = /<svg[^>]*>(.*?)<\/svg>/s, s = /<defs>(.*?)<\/defs>/s, r = /<style[^>]*>(.*?)<\/style>/s, o = e.match(t); if (!o || o.length < 2) return null; let n = o[1], a = "", c = n.match(r); c && (a = c[1], n = n.replace(r, "")); let i = "", l = n.match(s); return l && (i = l[1], n = n.replace(s, "")), { style: a, defs: i, mainContent: n.trim() } } w.exports = { extractSvgContentAndDefs: B } }); var x = h((O, S) => { function R(e) { return typeof e == "string" && /^[nd][0-6][0-4][0-2]$/.test(e) } function T(e) { return !isNaN(e) && e >= 0 && e < 360 } S.exports = { isValidWeatherCode: R, isValidAngle: T } }); var A = h((Q, b) => {
    var $ = require("fs").promises, C = require("path"), { optimize: V } = require("svgo"), { extractSvgContentAndDefs: E } = y(), { isValidWeatherCode: N, isValidAngle: j } = x(); function z(e, t, s) { if (![4, 6].includes(s)) { let r = t === "d" ? "sun" : "moon", o = 0, n = 0, a = 1; (s === 1 || s === 2) && (o = -15, n = -15, a = .7), e.push({ name: r, x: o, y: n, scale: a }) } } function P(e, t) { let s = { 1: { name: "cloud-1", x: 20, y: 0, scale: .7 }, 2: { name: "cloud-2", x: 5, y: 5, scale: 1 }, 3: { name: "cloud-3", x: 0, y: 0, scale: 1 }, 4: { name: "cloud-4", x: 0, y: 0, scale: 1.2 }, 5: { name: "cloud-5", x: 0, y: 0, scale: 1 }, 6: { name: "cloud-6", x: 0, y: 0, scale: 1 } }; s[t] ? e.push(s[t]) : t === 0 && e.some(r => r.name.startsWith("precip")) && e.push({ name: "cloud-4", x: 0, y: 0, scale: 1 }) } function F(e, t, s) { if (t > 0) { let r; t === 4 ? (e.push({ name: "thunderbolt", x: 0, y: 15, scale: 1.2 }), r = `precip-storm-${s}`) : r = `precip-${t}${s}`, e.push({ name: r, x: 0, y: 20, scale: 1 }) } } function M(e) { if (!N(e)) { let l = new Error("Invalid Vaisala weather code format."); throw l.statusCode = 400, l } let [t, s, r, o] = e, n = parseInt(s, 10), a = parseInt(r, 10), c = parseInt(o, 10), i = []; return z(i, t, n), P(i, n), F(i, a, c), i } async function H(e, t) {
        if (!j(e)) { let o = new Error("Invalid angle parameter for wind direction SVG."); throw o.statusCode = 400, o } let s = "wind-arrow", r = C.join(t, `${s}.svg`); try {
            let o = await $.readFile(r, "utf8"), n = E(o); if (!n) { let m = new Error(`Error parsing ${s}.svg: Invalid SVG structure.`); throw m.statusCode = 500, m } let i = `
            <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <style type="text/css">${n.style}</style>
                    ${n.defs}
                </defs>
                <g transform="translate(20 20)">
                    <g transform="rotate(${e} 12 12)">
                        ${n.mainContent}
                    </g>
                </g>
            </svg>
        `; return V(i, { multipass: !0 }).data
        } catch (o) { console.error("Error loading or processing wind arrow symbol:", o); let n = new Error("Failed to generate wind direction SVG."); throw n.statusCode = 500, n }
    } async function X(e, t, s) {
        let { viewBox: r = "0 0 64 64", width: o = "64", height: n = "64" } = t, a = M(e); if (a.length === 0) { let c = new Error("Invalid or unprocessable Vaisala weather code resulted in no components."); throw c.statusCode = 400, c } try {
            let c = a.map(async u => { let f = C.join(s, `${u.name}.svg`); try { return await $.readFile(f, "utf8") } catch { return console.warn(`Warning: SVG element '${u.name}.svg' not found at ${f}. It will be skipped.`), null } }), i = await Promise.all(c), l = "", m = "", v = new Set; i.forEach((u, f) => {
                if (!u) return; let d = a[f], p = E(u); if (p) {
                    m += `${p.style}
`, p.defs && v.add(p.defs); let _ = `translate(${d.x || 0} ${d.y || 0}) scale(${d.scale || 1})` + (d.rotation ? ` rotate(${d.rotation.angle} ${d.rotation.cx} ${d.rotation.cy})` : ""); l += `<g transform="${_}">${p.mainContent}</g>`
                }
            }); let W = `
            <svg width="${o}" height="${n}" viewBox="${r}" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <style type="text/css">
                        ${m}
                    </style>
                    ${Array.from(v).join("")}
                </defs>
                ${l}
            </svg>
        `; return V(W, { multipass: !0 }).data
        } catch (c) { console.error("Error in getVaisalaSymbolSvg:", c); let i = new Error("Failed to generate Vaisala symbol SVG."); throw i.statusCode = 500, i }
    } b.exports = { getWindArrowSvg: H, getVaisalaSymbolSvg: X }
}); var Y = require("express"), q = require("path"), D = A(), { extractSvgContentAndDefs: U } = y(), g = Y(), I = 4e3, G = q.join(__dirname, "..", "assets"), k = q.join(G, "elements"); g.set("svgAssetsDir", G); g.set("svgElementsDir", k); g.get("/wind_direction/:angle", async (e, t) => { try { let { angle: s } = e.params, r = await D.getWindArrowSvg(parseInt(s, 10), g.get("svgAssetsDir")); t.setHeader("Content-Type", "image/svg+xml"), t.send(r) } catch (s) { console.error("Error in wind direction SVG endpoint:", s), t.status(s.statusCode || 500).send(s.message || "Server error") } }); g.get("/weather_symbol/:weather_code", async (e, t) => { try { let { weather_code: s } = e.params, { viewBox: r, width: o, height: n } = e.query, a = await D.getVaisalaSymbolSvg(s, { viewBox: r, width: o, height: n }, g.get("svgElementsDir")); t.setHeader("Content-Type", "image/svg+xml"), t.send(a) } catch (s) { console.error("Error in Vaisala symbol endpoint:", s), t.status(s.statusCode || 500).send(s.message || "Server error") } }); g.get("/", (e, t) => { t.send("SVG Server is running!") }); g.listen(I, () => { console.log(`SVG server running at http://localhost:${I}`) });
