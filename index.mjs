/**
 *
 * Copyright 2014-2025 David Herron
 *
 * This file is part of AkashaCMS (http://akashacms.com/).
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import util from 'node:util';
import url from 'node:url';
import akasha, {
    Configuration, CustomElement, Munger, PageProcessor
} from 'akasharender';
const mahabhuta = akasha.mahabhuta;
import {
    SitemapStream, streamToPromise, simpleSitemapAndIndex
} from 'sitemap';
import { Readable } from 'node:stream';

const __dirname = import.meta.dirname;

const pluginName = "@akashacms/plugins-base";

/**
 * The site-relative href of the sitemap index written by
 * {@link BasePlugin#onSiteRendered} via `simpleSitemapAndIndex` from the
 * `sitemap` package.  With the current hard-coded options
 * (`gzip: true`, `limit: 50000`) the actual on-disk file is
 * `sitemap-index.xml.gz`.  This is the href advertised by the
 * `<ak-header-sitemap>` custom element and the `doGoogleSitemap`
 * helper.
 */
const SITEMAP_INDEX_HREF = "/sitemap-index.xml.gz";

/**
 * The set of site-relative hrefs that {@link BasePlugin#onSiteRendered}
 * may write.  Used by {@link BasePlugin#isLegitLocalHref} so the
 * AkashaRender link checker does not report these paths as broken:
 * they are generated after render and are therefore absent from both
 * the documents cache and the assets cache.
 *
 * Matches `/sitemap-index.xml`, `/sitemap-N.xml` for any non-negative
 * integer `N`, and the corresponding `.gz` variants.
 */
const SITEMAP_LEGIT_HREF_PATTERN =
    /^\/sitemap-(index|\d+)\.xml(\.gz)?$/;

/**
 * Escape a string for safe inclusion in a double-quoted HTML attribute
 * value.  Mirrors the encoding parse5/Cheerio applies when serializing
 * an attribute, so building markup as a string is equivalent to
 * constructing it via the parser.  Escapes the ampersand first to avoid
 * double-encoding, then the characters that are significant inside a
 * double-quoted attribute.
 *
 * @param {string} value
 * @returns {string}
 */
function escapeHtmlAttr(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}


export class BasePlugin extends akasha.Plugin {

    #config;

    constructor() {
        super(pluginName);
    }

    configure(config, options) {
        this.#config = config;
        this.akasha = config.akasha;
        this.options = options ? options : {};
        this.options.config = config;
        config.addPartialsDir(path.join(__dirname, 'partials'));
        config.addLayoutsDir(path.join(__dirname, 'layouts'));
        config.addAssetsDir(path.join(__dirname, 'assets'));
        config.addMahabhuta(mahabhutaArray(options, config, akasha, this));
        if (!options.linkRelTags) this.options.linkRelTags = [];
        if (!this.options.oembed) this.options.oembed = { enabled: false };

        const njk = this.config.findRendererName('.html.njk');
        const env = njk.njkenv();
        njk.njkenv().addExtension('akheadermetatags',
            new headerMetatagsExtension(this.config, this, njk)
        );
        njk.njkenv().addExtension('aklinkreltags',
            new linkRelTagsExtension(this.config, this, njk)
        );
        njk.njkenv().addExtension('akcanonicalurl',
            new canonicalURLExtension(this.config, this, njk)
        );
        njk.njkenv().addExtension('akpublicationdate',
            new publicationDateExtension(this.config, this, njk)
        );
        njk.njkenv().addExtension('aksitemap',
            new akSitemapExtension(this.config, this, njk)
        );
    }

    get config() { return this.#config; }

    doHeaderMetaSync(config, metadata) {
        return this.akasha.partialSync(this.config,
            "ak_headermeta.html.njk",
            fixHeaderMeta(metadata));
    }

    async doHeaderMeta(config, metadata) {
        return this.akasha.partial(this.config,
            "ak_headermeta.html.njk",
            fixHeaderMeta(metadata));
    }

    addLinkRelTag(config, lrTag) {
        this.options.linkRelTags.push(lrTag);
        return this;
    }

    doLinkRelTags() {

        var ret = "";
        // console.log(`ak-header-linkreltags `, this.array.options);
        if (this.options.linkRelTags.length > 0) {
            for (var lrtag of this.options.linkRelTags) {
                ret += doLinkRelTag(this.config, lrtag);
            }
        }
        // console.log(`ak-header-linkreltags `, ret);
        return ret;
    }

    doCanonicalURL(rendered_url) {
        doLinkRelTag(this.config, {
            relationship: "canonical",
            url: rendered_url
        });
    }

    doGoogleSitemap(metadata) {
        // TBD This is extracted from the Mahabhuta tag, need to extract these parameters
        //     from somewhere.
        // http://microformats.org/wiki/rel-sitemap
        var href = undefined; // $element.attr("href");
        if (!href) href = SITEMAP_INDEX_HREF;
        let $ = mahabhuta.parse('<link rel="sitemap" type="application/xml" title="" href="" />');
        $('link').attr('title', metadata.title);
        $('link').attr('href', href);
        return $.html();
    }

    /**
     * Produce the `<link rel="sitemap">` for the `<ak-header-sitemap>`
     * custom element and the `{% aksitemap %}` Nunjucks tag.  The href
     * points at {@link SITEMAP_INDEX_HREF}, which is the file actually
     * written by {@link BasePlugin#generateSitemap} (see
     * {@link SITEMAP_LEGIT_HREF_PATTERN}).
     *
     * @param {object} metadata  Page metadata; `metadata.title`, if set,
     *   is used as the link's `title=` attribute.
     * @returns {string} An HTML `<link>` element as a string.
     */
    doAKSitemap(metadata) {
        const title = (metadata && metadata.title) ? metadata.title : "";
        return `<link rel="sitemap" type="application/xml"`
            + ` title="${escapeHtmlAttr(title)}"`
            + ` href="${escapeHtmlAttr(SITEMAP_INDEX_HREF)}"/>`;
    }

    /**
     * Report to the AkashaRender link checker that the sitemap files
     * this plugin generates in {@link BasePlugin#onSiteRendered} are
     * valid local hrefs, even though they are not tracked in the
     * documents or assets caches.  Matches:
     *
     * - `/sitemap-index.xml` and `/sitemap-index.xml.gz`
     * - `/sitemap-N.xml` and `/sitemap-N.xml.gz` for any integer `N`
     *
     * This is called by {@link Configuration#askPluginsLegitLocalHref}.
     *
     * @param {Configuration} config
     * @param {string} href
     * @returns {boolean}
     */
    isLegitLocalHref(config, href) {
        if (typeof href !== 'string') return false;
        return SITEMAP_LEGIT_HREF_PATTERN.test(href);
    }

    doPublicationDate(publicationDate) {
        if (publicationDate) {
            // console.log(`doPublicationDate ${util.inspect(publicationDate)}`);
            let d = new Date(publicationDate);
            try {
                return this.akasha.partialSync(this.config, "ak_publdate.html.njk", {
                    publicationDate: d.toDateString()
                });
            } catch (err) {
                throw new Error(`doPublicationDate failed ${this.akasha.partialSync} because ${err}`);
            }
        } else return "";
    }

    generateSitemap(config, doit) {
        this.options.generateSitemapFlag = doit;
        return this;
    }

    /**
     * Configure generation of oEmbed provider files.  When enabled, the
     * plugin emits a precomputed oEmbed JSON document (and optionally an
     * XML document) alongside each rendered HTML page, and injects the
     * corresponding `<link rel="alternate" type="application/json+oembed">`
     * discovery tags via the `ak-oembed-links` custom element.
     *
     * @param {Configuration} config
     * @param {boolean|object} opts  `true`/`false` to toggle, or an options
     *   object.  Recognized fields: `enabled`, `xml`, `providerName`,
     *   `cacheAge`, `type` (`"link"` or `"rich"`), and `layout`
     *   (`"sibling"` or `"subtree"`).
     * @returns {BasePlugin}
     */
    generateOEmbed(config, opts) {
        if (typeof opts === 'boolean') {
            this.options.oembed = { enabled: opts };
        } else {
            this.options.oembed = Object.assign(
                { enabled: true }, opts ? opts : {});
        }
        return this;
    }

    async onSiteRendered(config) {
        let didWork = false;
        if (this.options.generateSitemapFlag) {
            await this.#generateSitemap(config);
            didWork = true;
        }
        if (this.options.oembed && this.options.oembed.enabled) {
            await this.#generateOEmbed(config);
            didWork = true;
        }
        return didWork ? "okay" : "skipped";
    }

    async #generateSitemap(config) {
        var rendered_files = [];
        const documents = await this.akasha.filecache.documentsCache.search({
            renderpathmatch: '\.html$'
            // renderglob: '**/*.html'
            // renderers: [ akasha.HTMLRenderer ]
        });
        
        for (let doc of documents) {
            if (!doc.stat) {
                try {
                    doc.stat = await fsp.stat(doc.fspath);
                } catch (err) {
                    // console.error(`BASE PLUGIN onSiteRendered could not stat ${doc.fspath} because`, err.stack);
                    doc.stat = undefined;
                }
            }
            var fDate = new Date(doc.stat.mtime);
            var mm = fDate.getMonth() + 1;
            if (mm < 10) {
                mm = "0" + mm.toString();
            } else {
                mm = mm.toString();
            }
            var dd = fDate.getDate();
            if (dd < 10) {
                dd = "0" + dd.toString();
            } else {
                dd = dd.toString();
            }

            const baseURL = new URL(config.root_url);
            baseURL.pathname = doc.renderPath;

            rendered_files.push({
                url: baseURL.toLocaleString(), // doc.renderPath
                changefreq: 'weekly',
                priority: 0.5,
                lastmod:  fDate.getUTCFullYear() +"-"+ mm +"-"+ dd
            })
        }

        // Fix: https://github.com/akashacms/akashacms-base/issues/6
        // The sitemap package now prohibits an absolute pathname or
        // a pathname with path traversal characters.  It must instead
        // be a simple relative pathname.
        //
        // This computes the render destination relative to
        // the config file path.  That should turn out to be relative.
        
        let destDir = config.renderDestination;
        if (path.isAbsolute(destDir)) {
            destDir = path.relative(config.configDir, config.renderDestination); 
        }

        // console.log({
        //     foo: "bar",
        //     destinationDir: destDir,
        //     configDestDir: config.renderDestination,
        //     dirname: import.meta.dirname
        // });

        await simpleSitemapAndIndex({
            hostname: config.root_url,
            destinationDir: destDir,
            sourceData: rendered_files,
        });
    }

    async #generateOEmbed(config) {
        const opts = this.options.oembed;
        const documents = await this.akasha.filecache.documentsCache.search({
            renderpathmatch: '\.html$'
        });

        for (let doc of documents) {
            const targets = oembedTargets(config, doc.renderPath, opts);
            const payload = buildOEmbedPayload(config, doc, opts);

            const jsonOut = path.join(
                config.renderDestination, targets.jsonRenderPath);
            await fsp.mkdir(path.dirname(jsonOut), { recursive: true });
            await fsp.writeFile(jsonOut,
                JSON.stringify(payload, null, 2), 'utf8');

            if (opts.xml) {
                const xmlOut = path.join(
                    config.renderDestination, targets.xmlRenderPath);
                await fsp.mkdir(path.dirname(xmlOut), { recursive: true });
                await fsp.writeFile(xmlOut,
                    oembedToXML(payload), 'utf8');
            }
        }
    }
}

/**
 * Compute the render paths and absolute URLs for the oEmbed files
 * associated with an HTML page.  Both the `<head>` `<link>` injection and
 * the file writer call this so the advertised URL and the written file can
 * never drift apart.
 *
 * @param {Configuration} config
 * @param {string} htmlRenderPath  The render path of the HTML page.
 * @param {object} opts            The resolved oembed options.
 * @returns {{ jsonRenderPath: string, xmlRenderPath: string, jsonURL: string, xmlURL: string }}
 */
function oembedTargets(config, htmlRenderPath, opts) {
    let base;
    if (opts && opts.layout === 'subtree') {
        base = 'oembed/' + htmlRenderPath.replace(/\.html$/, '');
    } else {
        base = htmlRenderPath.replace(/\.html$/, '.oembed');
    }
    const jsonRenderPath = base + '.json';
    const xmlRenderPath = base + '.xml';
    const toURL = (p) => {
        const u = new URL(config.root_url);
        u.pathname = path.posix.join(u.pathname, p);
        return u.toString();
    };
    return {
        jsonRenderPath, xmlRenderPath,
        jsonURL: toURL(jsonRenderPath),
        xmlURL: toURL(xmlRenderPath)
    };
}

/**
 * Build the oEmbed response object for a document, using metadata already
 * computed in the document cache.  Computed values (title) come from
 * `doc.metadata`, while raw frontmatter values (author) come from
 * `doc.docMetadata`.  Undefined keys are stripped so the JSON stays clean.
 *
 * @param {Configuration} config
 * @param {object} doc   A document-cache row.
 * @param {object} opts  The resolved oembed options.
 * @returns {object}
 */
function buildOEmbedPayload(config, doc, opts) {
    const md = doc.metadata ? doc.metadata : {};
    const dm = doc.docMetadata ? doc.docMetadata : {};
    const payload = {
        version: "1.0",
        type: (opts && opts.type) ? opts.type : "link",
        title: md.title ? md.title : (md.pagetitle ? md.pagetitle : ""),
        author_name: dm.author ? dm.author : undefined,
        author_url: dm.authorURL ? dm.authorURL : undefined,
        provider_name: (opts && opts.providerName)
            ? opts.providerName
            : ((config.metadata && config.metadata.siteName)
                ? config.metadata.siteName
                : undefined),
        provider_url: config.root_url,
        cache_age: (opts && typeof opts.cacheAge === 'number')
            ? opts.cacheAge
            : 86400
    };
    for (const key of Object.keys(payload)) {
        if (typeof payload[key] === 'undefined') delete payload[key];
    }
    return payload;
}

/**
 * Escape a string for safe inclusion as XML PCDATA.
 *
 * @param {*} value
 * @returns {string}
 */
function xmlEscape(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Serialize an oEmbed payload object as an XML oEmbed document, per the
 * oEmbed spec (root `<oembed>` element with one child per key).
 *
 * @param {object} payload
 * @returns {string}
 */
function oembedToXML(payload) {
    let body = "";
    for (const [key, value] of Object.entries(payload)) {
        body += `  <${key}>${xmlEscape(value)}</${key}>\n`;
    }
    return `<?xml version="1.0" encoding="utf-8" standalone="yes"?>\n`
        + `<oembed>\n${body}</oembed>\n`;
}

export const mahabhutaArray = function(
            options,
            config, // ?: Configuration,
            akasha, // ?: any,
            plugin  // ?: Plugin
) {
    let ret = new mahabhuta.MahafuncArray(pluginName, options);
    ret.addMahafunc(new HeaderMetatagsElement(config, akasha, plugin));
    ret.addMahafunc(new LinkRelTagsElement(config, akasha, plugin));
    ret.addMahafunc(new CanonicalURLElement(config, akasha, plugin));
    ret.addMahafunc(new AKSitemapElement(config, akasha, plugin));
    ret.addMahafunc(new PublicationDateElement(config, akasha, plugin));
    ret.addMahafunc(new TOCGroupElement(config, akasha, plugin));
    ret.addMahafunc(new TOCItemElement(config, akasha, plugin));
    ret.addMahafunc(new OpenGraphPromoteImages(config, akasha, plugin));
    ret.addMahafunc(new OEmbedLinksElement(config, akasha, plugin));
    return ret;
};

var fixHeaderMeta = function(metadata) {
    var data = {};
    for (var prop in metadata) {
        if (!(prop in data)) data[prop] = metadata[prop];
    }
    if (typeof data.metaOGtitle === "undefined") {
        if (typeof data.pagetitle !== "undefined") {
                data.metaOGtitle = data.pagetitle;
        } else if (typeof data.title !== "undefined") {
                data.metaOGtitle = data.title;
        }
    }
    if (typeof data.metaOGdescription === "undefined") {
        if (typeof data.metadescription !== "undefined") {
                data.metaOGdescription = data.metadescription;
        }
    }
    if (typeof data.metaDCtitle === "undefined") {
        if (typeof data.pagetitle !== "undefined") {
                data.metaDCtitle = arg.pagetitle;
        } else if (typeof data.title !== "undefined") {
                data.metaDCtitle = data.title;
        }
    }
    if (typeof data.metapagename === "undefined") {
        if (typeof data.pagetitle !== "undefined") {
                data.metapagename = arg.pagetitle;
        } else if (typeof data.title !== "undefined") {
                data.metapagename = data.title;
        }
    }
    if (typeof data.metadate === "undefined") {
        data.metadate = data.rendered_date;
    }
    return data;
};

class HeaderMetatagsElement extends CustomElement {
    get elementName() { return "ak-header-metatags"; }
    process($element, metadata, dirty) {
        return this.akasha.partial(this.config,
                "ak_headermeta.html.handlebars",
                fixHeaderMeta(metadata));
    }
}

class headerMetatagsExtension {
    constructor(config, plugin, njkRenderer) {
        this.tags = [ 'akheadermetatags' ];
        this.config = config;
        this.plugin = plugin;
        this.njkRenderer = njkRenderer;
    }

    parse(parser, nodes, lexer) {
        // console.log(`in headerMetatagsExtension - parse`);
        try {
            var tok = parser.nextToken();
            var args = parser.parseSignature(null, true);
            parser.advanceAfterBlockEnd(tok.value);
            var body = parser.parseUntilBlocks('endakheadermetatags');
            parser.advanceAfterBlockEnd();
            return new nodes.CallExtension(this, 'run', args, [body]);
        } catch (err) {
            console.error(`headerMetatagsExtension `, err.stack);
        }
    }

    run(context, args, body) {
        // console.log(`in headerMetatagsExtension - run`);
        return this.plugin.doHeaderMetaSync(this.config, context.ctx);
    };
}

function doLinkRelTag(config, lrtag) {
    return `<link rel="${lrtag.relationship}" href="${lrtag.url}" />`;
}

class LinkRelTagsElement extends CustomElement {
    get elementName() { return "ak-header-linkreltags"; }
    process($element, metadata, dirty) {
        return this.config.plugin(pluginName)
                    .doLinkRelTags();
    }
}

class linkRelTagsExtension {
    constructor(config, plugin, njkRenderer) {
        this.tags = [ 'aklinkreltags' ];
        this.config = config;
        this.plugin = plugin;
        this.njkRenderer = njkRenderer;
    }

    parse(parser, nodes, lexer) {
        // console.log(`in linkRelTagsExtension - parse`);
        try {
            var tok = parser.nextToken();
            var args = parser.parseSignature(null, true);
            parser.advanceAfterBlockEnd(tok.value);
            var body = parser.parseUntilBlocks('endaklinkreltags');
            parser.advanceAfterBlockEnd();
            return new nodes.CallExtension(this, 'run', args, [body]);
        } catch (err) {
            console.error(`linkRelTagsExtension `, err.stack);
        }
    }

    run(context, args, body) {
        // console.log(`in linkRelTagsExtension - run`);
        return this.plugin.doLinkRelTags(context.ctx);
    };
}

class CanonicalURLElement extends CustomElement {
    get elementName() { return "ak-header-canonical-url"; }
    process($element, metadata, dirty) {
        return this.config.plugin(pluginName)
                    .doCanonicalURL(metadata.rendered_url);
    }
}

class canonicalURLExtension {
    constructor(config, plugin, njkRenderer) {
        this.tags = [ 'akcanonicalurl' ];
        this.config = config;
        this.plugin = plugin;
        this.njkRenderer = njkRenderer;
    }

    parse(parser, nodes, lexer) {
        // console.log(`in canonicalURLExtension - parse`);
        try {
            var tok = parser.nextToken();
            var args = parser.parseSignature(null, true);
            parser.advanceAfterBlockEnd(tok.value);
            var body = parser.parseUntilBlocks('endakcanonicalurl');
            parser.advanceAfterBlockEnd();
            return new nodes.CallExtension(this, 'run', args, [body]);
        } catch (err) {
            console.error(`canonicalURLExtension `, err.stack);
        }
    }

    run(context, args, body) {
        // console.log(`in canonicalURLExtension - run ${util.inspect(context.ctx)} ${util.inspect(this.plugin)}`);
        return this.plugin
                    .doCanonicalURL(context.ctx.rendered_url);
    };
}

/**
 * `<ak-header-sitemap>` custom element.  Emits a
 * `<link rel="sitemap" type="application/xml">` pointing at the sitemap
 * index that {@link BasePlugin#onSiteRendered} actually writes
 * ({@link SITEMAP_INDEX_HREF}).  The link's `title=` attribute defaults
 * to the page's `metadata.title`.
 *
 * This is the sitemap-link replacement for the Mahabhuta core
 * `<xml-sitemap>` element, which defaults to a `/sitemap.xml` href that
 * this plugin does not produce.
 */
class AKSitemapElement extends CustomElement {
    get elementName() { return "ak-header-sitemap"; }
    process($element, metadata, dirty) {
        return this.config.plugin(pluginName)
                    .doAKSitemap(metadata);
    }
}

/**
 * Nunjucks companion of {@link AKSitemapElement}.  Usage in a `.njk`
 * template:
 *
 * ```njk
 * {% aksitemap %}{% endaksitemap %}
 * ```
 *
 * Emits the same `<link rel="sitemap">` markup as
 * `<ak-header-sitemap>`.
 */
class akSitemapExtension {
    constructor(config, plugin, njkRenderer) {
        this.tags = [ 'aksitemap' ];
        this.config = config;
        this.plugin = plugin;
        this.njkRenderer = njkRenderer;
    }

    parse(parser, nodes, lexer) {
        try {
            var tok = parser.nextToken();
            var args = parser.parseSignature(null, true);
            parser.advanceAfterBlockEnd(tok.value);
            var body = parser.parseUntilBlocks('endaksitemap');
            parser.advanceAfterBlockEnd();
            return new nodes.CallExtension(this, 'run', args, [body]);
        } catch (err) {
            console.error(`akSitemapExtension `, err.stack);
        }
    }

    run(context, args, body) {
        return this.plugin.doAKSitemap(context.ctx);
    };
}

class OEmbedLinksElement extends CustomElement {
    get elementName() { return "ak-oembed-links"; }
    async process($element, metadata, dirty) {
        const plugin = this.config.plugin(pluginName);
        const opts = plugin.options.oembed;
        if (!opts || !opts.enabled) return "";
        const renderTo = (metadata.document && metadata.document.renderTo)
                ? metadata.document.renderTo
                : metadata.renderPath;
        if (!renderTo) return "";
        const targets = oembedTargets(this.config, renderTo, opts);
        return this.akasha.partial(this.config,
            "ak_oembed_links.html.njk", {
                jsonURL: targets.jsonURL,
                xmlURL: opts.xml ? targets.xmlURL : null,
                title: metadata.title
                        ? metadata.title
                        : (metadata.pagetitle ? metadata.pagetitle : "")
            });
    }
}

class GitHubDetailsElement extends CustomElement {
    get elementName() { return "details"; }
    async process($element, metadata, dirty) {
        // Look for open attribute
        // Look in options for openAllDetails
        // Use Cheerio to find a child <summary> tag - use that for the title text
        // Otherwise title text is `Details`

        // To render
        // - An icon for right-arrow and down-arrow -- Perhaps need to add @akashacms/plugin-openicons?
        // - JavaScript (no Bootstrap) for opening/closing the block
        // - Remove the <summary> tag after fetching its text
        // - Throw a block around the text
        // - Two templates - open - closed - render both and the JavaScript selects which is active

        // Ask Claude -
        // I need to implement support in plain HTML/JavaScript for a component similar to
        // the GitHub collapsible section tag.  This means having a <div> that is either
        // in collapsed or open state.  In collapsed state, there is an arrow pointing to
        // the right, as well as the title text.  In the open state, the arrow points down,
        // It has the title text, and shows whatever is within the <div>
        //
        // In other words, the <div> toggles between two rendered choices.  One choice
        // is the closed state that shows the arrow and title text.  The other choice is
        // the open state tha shows the down-arrow, title text, and body text. 

    }
}

class PublicationDateElement extends CustomElement {
    get elementName() { return "publication-date"; }
    async process($element, metadata, dirty) {
        // console.log(`PublicationDateElement ${util.inspect(metadata.publicationDate)}`);
        return this.config.plugin(pluginName)
                    .doPublicationDate(metadata.publicationDate);
    }
}

class publicationDateExtension {
    constructor(config, plugin, njkRenderer) {
        this.tags = [ 'akpublicationdate' ];
        this.config = config;
        this.plugin = plugin;
        this.njkRenderer = njkRenderer;
    }

    parse(parser, nodes, lexer) {
        // console.log(`in publicationDateExtension - parse`);
        try {
            var tok = parser.nextToken();
            var args = parser.parseSignature(null, true);
            parser.advanceAfterBlockEnd(tok.value);
            var body = parser.parseUntilBlocks('endakpublicationdate');
            parser.advanceAfterBlockEnd();
            return new nodes.CallExtension(this, 'run', args, [body]);
        } catch (err) {
            console.error(`publicationDateExtension `, err.stack);
        }
    }

    run(context, args, body) {
        // console.log(`in publicationDateExtension - run`);
        return this.plugin
                    .doPublicationDate(context.ctx.publicationDate);
    };
}

class TOCGroupElement extends CustomElement {
    get elementName() { return "toc-group"; }
    async process($element, metadata, dirty) {
        const template = $element.attr('template') 
                ? $element.attr('template')
                :  "ak_toc_group_element.html.njk";
        const id = $element.attr('id');
        const additionalClasses = $element.attr('additional-classes')
                ? $element.attr('additional-classes')
                : "";
        const suppressContents = $element.attr('suppress-contents');
        const content = $element.html()
                ? $element.html()
                : "";

        dirty();
        return this.akasha.partial(this.config, template, {
            id, additionalClasses, suppressContents,
            content
        });
    }
}

class TOCItemElement extends CustomElement {
    get elementName() { return "toc-item"; }
    async process($element, metadata, dirty) {
        const template = $element.attr('template') 
                ? $element.attr('template')
                :  "ak_toc_item_element.html.njk";
        const id = $element.attr('id');
        const additionalClasses = $element.attr('additional-classes')
                ? $element.attr('additional-classes')
                : "";
        const textClasses = $element.attr('text-classes')
                ? $element.attr('text-classes')
                : "";
        const title = $element.attr('title');
        if (!title || title === '') {
            throw new Error(`toc-item requires an title value`);
        }
        const anchor = $element.attr('anchor');
        if (!anchor || anchor === '') {
            throw new Error(`toc-item requires an anchor value`);
        }
        const content = $element.html()
                ? $element.html()
                : "";

        dirty();
        return this.akasha.partial(this.config, template, {
            id, additionalClasses, textClasses, title, anchor,
            content
        });
    }
}

class OpenGraphPromoteImages extends Munger {
    get selector() { return "html head open-graph-promote-images"; }
    get elementName() { return 'html head open-graph-promote-images'; }

    async process($, $link, metadata, dirty) {

        // console.log(`OpenGraphPromoteImages ${$.html()}`);

        var imgcount = 0;
        // Look for <img> tags
        var selector = $link.attr('root')
                ? ($link.attr('root') +' img')
                : 'img';
        var imgz = [];
        $(selector).each(function(i, elem) {
            const $elem = $(elem);
            if ($elem.hasClass('opengraph-promote')
            || !($elem.hasClass('opengraph-no-promote')))
                imgz.push($elem.attr('src'));
        });
        // Look for <meta-og-image> tags
        var selector = $link.attr('root')
                ? ($link.attr('root') +' meta-og-image')
                : 'meta-og-image';
        $(selector).each(function(i, elem) { imgz.push($(elem).attr('src')); });
        var selector = $link.attr('root')
                ? ($link.attr('root') +' opengraph-image')
                : 'opengraph-image';
        $(selector).each(function(i, elem) { 
            const $elem = $(elem);
            imgz.push($elem.attr('href')); 
            $elem.remove();
        });
        // console.log(`${metadata.rendered_url} image selector ${selector} - gave ${imgz.length} images`);

        // Track the content values of meta tags already present so we can
        // de-duplicate in O(1) per image rather than running a fresh DOM
        // attribute query (meta[content="..."]) for every image.  Seed it
        // from every existing meta[content] in the document -- matching
        // the original whole-document dedup scope -- then add each href as
        // it is appended.
        const seenContent = new Set();
        $('meta[content]').each(function(i, elem) {
            const content = $(elem).attr('content');
            if (typeof content === 'string') seenContent.add(content);
        });

        for (let href of imgz) {
            // let href = $(img).attr('src');
            // console.log(`${metadata.rendered_url} image ${href}`);
            if (href && (href.match(/\/img\/extlink.png$/)
                || href.match(/\/img\/rss_button.png$/)
                || href.match(/\/img\/rss_button.gif$/))) {
                    // Ignore these images
            } else {
                if (href && href.length > 0) {
                    // console.log(`OpenGraphPromoteImages ${href}`);

                    // Because we'll often receive a local URL relative
                    // to the local directory, new URL(href) would throw
                    // an error.  Adding a bogus baseURL ensures that
                    // new URL will not crash.  The behavior in such
                    // a case is like this:
                    //
                    // > new URL('img/Human-Skeleton.jpg', 'http://noturl')
                    // URL {
                    //   href: 'http://noturl/img/Human-Skeleton.jpg',
                    //   origin: 'http://noturl',
                    //   protocol: 'http:',
                    //   username: '',
                    //   password: '',
                    //   host: 'noturl',
                    //   hostname: 'noturl',
                    //   port: '',
                    //   pathname: '/img/Human-Skeleton.jpg',
                    //   search: '',
                    //   searchParams: URLSearchParams {},
                    //   hash: ''
                    // }
                    //
                    // In other words, the `origin` field contains the
                    // supplied bogus URL.
                    //
                    // For this, I decided to make the bogus URL be
                    // a subdomain of example.com because I know example.com
                    // will never show up as a legit URL.

                    let uHref = new URL(href, 'http://noturl.example.com');
                    
                    // In case this is a site-relative URL, fix it up
                    // to have the full URL.  As said above, a site-relative
                    // URL has the bogus URL chosen immediately above.
                    if (uHref.origin === 'http://noturl.example.com') {

                        // The next detail is that in this case uHref.pathname
                        // won't accurately reflect the value of href, as can
                        // be seen above.  The relative url beginning with `img/`
                        // becomes an absolute pathname beginning with `/ihg/`.
                        // Therefore to determine if it's a relative URL we
                        // must check the original string to see if it started
                        // with a slash.
                        if (Array.isArray(href.match(/^\//))) {
                            // console.log(`OpenGraphPromoteImages ${this.config.root_url} ${href} ${util.inspect(uHref)} ${util.inspect(href.match(/^\//))}`);

                            // In case root_url does not end with a '/' we instead
                            // parse root_url, make href the pathname, then
                            // format that as a URL.
                            const pRoot = new URL(this.config.root_url);
                            pRoot.pathname = href;
                            href = pRoot.toString();
                        } else {
                            let dirRender = path.dirname(metadata.document.renderTo);
                            let uRootUrl = new URL(this.config.root_url);

                            // This is an image relative to
                            // the document.  If the document is
                            // in the root directory, then we must not
                            // prepend the document's directory to
                            // the image href.
                            uRootUrl.pathname =
                              (dirRender !== "/" && dirRender !== '.')
                                    ? dirRender +'/'+ href
                                    : href;
                            // console.log(pRootUrl);
                            // console.log(`in ${metadata.document.renderTo} dirRender ${dirRender} href ${href} `, uRootUrl);
                            href = uRootUrl.toString();
                        }
                    }
                }
                if (!seenContent.has(href)) {

                    // Build the meta tag as a string rather than parsing a
                    // fresh document per image.  escapeHtmlAttr ensures the
                    // href is encoded exactly as parse5/Cheerio would encode
                    // a double-quoted attribute, so this is equivalent to
                    // the previous mahabhuta.parse approach.
                    const txt = `<meta name="og:image" content="${escapeHtmlAttr(href)}"/>`;

                    // console.log(`${metadata.rendered_url} appending image meta ${txt}`);
                    imgcount++;
                    $('head').append(txt);
                    seenContent.add(href);
                }
            }
        }

        // It's been observed that this Mahafunc can be called 
        // before all partial's have been processed.  An image that's
        // pulled in by a partial would be missed, therefore.  
        // 
        // In the test suite we attempted to replicate the behavior that
        // was seen, but was unable to replicate. 
        //
        // The issue showed up for pages on greentransportation.info. 
        //
        // No images were being promoted.  The image of interest was handled
        // by the heropicture.html.ejs partial.  At the time this Mahafunc was
        // called that partial had not been processed yet, for some reason. 
        //
        // To see this add console.log($.html()) to the top to see the HTML
        // being processed by this Mahafunc.

        if (imgcount > 0) $link.remove();
    }
}
