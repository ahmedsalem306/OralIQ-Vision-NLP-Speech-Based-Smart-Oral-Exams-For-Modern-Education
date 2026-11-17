// Render public pages at build time. Account pages and token URLs get app.html.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const dist = path.join(root, "dist");
const ssrDir = path.join(root, "dist-ssr");
const manifestDir = path.join(dist, ".vite");
const shell = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const canonical = shell.match(/<link rel="canonical" href="([^"]+)"/);
if (!canonical || !shell.includes('<div id="root"></div>')) throw new Error("Invalid HTML build shell");
const site = new URL(canonical[1]).origin;
const { render } = await import(pathToFileURL(path.join(ssrDir, "entry-prerender.js")).href);
fs.writeFileSync(path.join(dist, "app.html"), shell);

const pages = [
    { route: "/", title: null, description: null },
    { route: "/privacy-policy", title: "خصوصية الامتحان والبيانات — OralIQ",
      description: "سياسة خصوصية OralIQ: الكاميرا دون تسجيل فيديو، ومعالجة الإجابات الصوتية لدى Groq، والبصمات والاحتفاظ بالبيانات وطلبات الحذف." },
    { route: "/refund-policy", title: "سياسة الاسترجاع والإلغاء — OralIQ",
      description: "سياسة استرجاع وإلغاء اشتراكات OralIQ وطرق التواصل لطلب مراجعة المدفوعات." },
];

const escapeAttribute = (value) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
for (const page of pages) {
    const markup = (await render(page.route)).replace(/^(?:<link\b[^>]*rel="preload"[^>]*\/>)+/, "");
    if (!markup.includes("<main") && !markup.includes('id="main"')) throw new Error(`Empty public page: ${page.route}`);
    if (page.route === "/") {
        for (const needle of ['id="about"', 'id="contact"', 'id="privacy"']) {
            if (!markup.includes(needle)) throw new Error(`Homepage missing ${needle}`);
        }
    }
    let html = shell.replace('<div id="root"></div>', () => `<div id="root" data-prerendered>${markup}</div>`);
    const url = `${site}${page.route}`;
    html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
        .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`);
    if (page.title) {
        html = html.replace(/<title>[^<]*<\/title>/, `<title>${page.title}</title>`)
            .replace(/(<meta (?:property="og:title"|name="twitter:title") content=")[^"]*(")/g, `$1${escapeAttribute(page.title)}$2`)
            .replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "")
            .replace(/\s*<link rel="alternate"[^>]*>/g, "")
            .replace(/\s*<noscript>[\s\S]*?<\/noscript>/, "");
    }
    if (page.description) {
        html = html.replace(/(<meta (?:name="description"|property="og:description"|name="twitter:description") content=")[^"]*(")/g,
            `$1${escapeAttribute(page.description)}$2`);
    }
    const directory = page.route === "/" ? dist : path.join(dist, page.route.slice(1));
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, "index.html"), html);
    console.log(`prerender: ${page.route} (${Math.round(markup.length / 1024)} KB markup)`);
}

// Verify both resolved targets before recursive cleanup on Windows.
for (const target of [ssrDir, manifestDir]) {
    const resolved = fs.realpathSync(target);
    if (resolved !== path.resolve(target) || !resolved.startsWith(`${root}${path.sep}`)) {
        throw new Error(`Refusing cleanup outside frontend: ${target}`);
    }
}
for (const target of [ssrDir, manifestDir]) fs.rmSync(target, { recursive: true, force: true });
