
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fsp } from 'node:fs';
import path from 'node:path';

import akasha from 'akasharender';
import * as plugin from '../index.mjs';

const __dirname = import.meta.dirname;

const baseConfig = {
    linkRelTags: [
        { relationship: "foo", url: "http://foo.bar" },
        { relationship: "gronk", url: "http://gronk.bar" },
        { relationship: "them", url: "http://them.bar" }
    ],
    generateSitemapFlag: true,
    oembed: {
        enabled: true,
        xml: true,
        providerName: "AkashaCMS Test",
        cacheAge: 3600
    }
};

const config = new akasha.Configuration();
// Make sure to configure this correctly
// in order to trigger https://github.com/akashacms/akashacms-base/issues/6
config.configDir = __dirname;
config.setRenderDestination('out');
config.rootURL("https://example.akashacms.com");
config.configDir = __dirname;
config.addLayoutsDir('layouts')
      .addPartialsDir('partials')
      .addDocumentsDir('documents');
config.use(plugin.BasePlugin, baseConfig);
config.setMahabhutaConfig({
    recognizeSelfClosing: true,
    recognizeCDATA: true,
    decodeEntities: true
});
config.prepare();


describe('build site', () => {
    it('should successfully setup cache database', async () => {
        try {
            await akasha.setup(config);
        } catch (e) {
            console.error(e);
            throw e;
        }
    }, { timeout: 75000 });

    it('should copy assets', async () => {
        await config.copyAssets();
    }, { timeout: 75000 });

    it('should build site', async () => {
        let failed = false;
        let results = await akasha.render(config);
        for (let result of results) {
            if (result.error) {
                failed = true;
                console.error(result.error);
            }
        }
        assert.equal(failed, false);
    }, { timeout: 25000 });
});

describe('header meta', () => {

    let checkMeta = (html, $) => {
        assert.ok(html, 'result exists');
        assert.equal(typeof html, 'string', 'result isString');

        assert.ok($('head meta[name="keywords"]').attr('content').includes("Foo Bar Baz"));
        assert.ok($('head meta[name="description"]').attr('content').includes("Way out man, so far out"));
        assert.ok($('head meta[name="subject"]').attr('content').includes("The Moon"));
        assert.ok($('head meta[name="copyright"]').attr('content').includes("Now"));
        assert.ok($('head meta[name="language"]').attr('content').includes("Klingon"));
        assert.ok($('head meta[name="robots"]').attr('content').includes("C3P0"));
        assert.ok($('head meta[name="revised"]').attr('content').includes("Yesterday"));
        assert.ok($('head meta[name="abstract"]').attr('content').includes("Meta is too Abstract"));
        assert.ok($('head meta[name="topic"]').attr('content').includes("The Moon"));
        assert.ok($('head meta[name="summary"]').attr('content').includes("This is the dawning of the new age of Aquarius"));
        assert.ok($('head meta[name="Classification"]').attr('content').includes("Top Secret"));
        assert.ok($('head meta[name="author"]').attr('content').includes("eltonjohn"));
        assert.ok($('head meta[name="designer"]').attr('content').includes("Levis"));
        assert.ok($('head meta[name="reply-to"]').attr('content').includes("Him"));
        assert.ok($('head meta[name="owner"]').attr('content').includes("Me"));
        assert.ok($('head meta[name="url"]').attr('content').includes("http://meta.url"));
        assert.ok($('head meta[name="identifier-URL"]').attr('content').includes("http://meta.url/identifier"));
        assert.ok($('head meta[name="directory"]').attr('content').includes("Yahoo"));
        assert.ok($('head meta[name="pagename"]').attr('content').includes("Metatags test"));
        assert.ok($('head meta[name="category"]').attr('content').includes("The Moon"));
        assert.ok($('head meta[name="coverage"]').attr('content').includes("Primer Coat"));
        assert.ok($('head meta[name="distribution"]').attr('content').includes("NYC"));
        assert.ok($('head meta[name="rating"]').attr('content').includes("5 stars"));
        assert.ok($('head meta[name="revisit-after"]').attr('content').includes("Tomorrow"));
        assert.ok($('head meta[name="subtitle"]').attr('content').includes("U505"));
        assert.ok($('head meta[name="target"]').attr('content').includes("Bulls Eye"));
        assert.ok($('head meta[name="HandheldFriendly"]').attr('content').includes("Nope"));
        assert.ok($('head meta[name="MobileOptimized"]').attr('content').includes("Nope"));
        assert.ok($('head meta[name="DC.title"]').attr('content').includes("Metatags test"));
        assert.ok($('head meta[name="og:title"]').attr('content').includes("Metatags test"));
        assert.ok($('head meta[name="og:description"]').attr('content').includes("Way out man, so far out"));
    };

    it('should find header meta values', async () => {
        let { html, $ } = await akasha.readRenderedFile(config, 'metatags.html');
        checkMeta(html, $);
        assert.ok($('head link[rel="canonical"]').attr('href').includes("https://example.akashacms.com/metatags.html"));
    });

    it('should find header meta values w/ NJK macros', async () => {
        let { html, $ } = await akasha.readRenderedFile(config, 'metatags-macros.html');
        checkMeta(html, $);
        assert.ok($('head link[rel="canonical"]').attr('href').includes("https://example.akashacms.com/metatags-macros.html"));
    });
});

describe('header link rel', () => {

    let checkLinkRel = (html, $) => {
        assert.ok(html, 'result exists');
        assert.equal(typeof html, 'string', 'result isString');

        assert.ok($('head link[rel="foo"]').attr('href').includes("http://foo.bar"));
        assert.ok($('head link[rel="gronk"]').attr('href').includes("http://gronk.bar"));
        assert.ok($('head link[rel="them"]').attr('href').includes("http://them.bar"));
    };

    it('should find header meta values', async () => {
        let { html, $ } = await akasha.readRenderedFile(config, 'linkreltags.html');
        checkLinkRel(html, $);
    });

    it('should find header meta values w/ NJK macros', async () => {
        let { html, $ } = await akasha.readRenderedFile(config, 'linkreltags-macros.html');
        checkLinkRel(html, $);
    });
});


describe('@akashacms/plugins-base doHeaderMetaSync doGoogleSitemap', () => {
    it('should call those functions w/o failure', async () => {
        let { html, $ } = await akasha.readRenderedFile(config, 'do-plugin-base-direct-calls.html');

        // console.log(html);

        assert.ok(html, 'result exists');
        assert.equal(typeof html, 'string', 'result isString');
        assert.equal($('article meta[name="pagename"]').length, 1);
        assert.ok($('article meta[name="pagename"]').attr('content').includes("Directly call @akashacms/plugins-base functions"));
        assert.equal($('article meta[name="date"]').length, 1);
        assert.equal($('article meta[name="DC.title"]').length, 1);
        assert.ok($('article meta[name="DC.title"]').attr('content').includes("Directly call @akashacms/plugins-base functions"));
        assert.equal($('article meta[name="og:title"]').length, 1);
        assert.ok($('article meta[name="og:title"]').attr('content').includes("Directly call @akashacms/plugins-base functions"));
        assert.equal($('article meta[name="og:url"]').length, 1);
        assert.equal($('article link[rel="canonical"]').length, 1);
        assert.equal($('article link[rel="sitemap"]').length, 1);
        assert.ok($('article link[rel="sitemap"]').attr('title').includes("Directly call @akashacms/plugins-base functions"));
    });
});

describe('canonical url', () => {
    it('should find canonical url', async () => {
        let { html, $ } = await akasha.readRenderedFile(config, 'canonical.html');

        assert.ok(html, 'result exists');
        assert.equal(typeof html, 'string', 'result isString');

        assert.ok($('head link[rel="canonical"]').attr('href').includes("https://example.akashacms.com/canonical.html"));
    });

    it('should find canonical url w/ NJK macros', async () => {
        let { html, $ } = await akasha.readRenderedFile(config, 'canonical-macros.html');

        assert.ok(html, 'result exists');
        assert.equal(typeof html, 'string', 'result isString');

        assert.ok($('head link[rel="canonical"]').attr('href').includes("https://example.akashacms.com/canonical-macros.html"));
    });
});

describe('publication date', () => {
    it('should find publication date', async () => {
        let { html, $ } = await akasha.readRenderedFile(config, 'publdate.html');

        assert.ok(html, 'result exists');
        assert.equal(typeof html, 'string', 'result isString');

        assert.ok($('article').html().includes("Aug 16 2019"));
    });

    it('should find publication date w/ NJK Macros', async () => {
        let { html, $ } = await akasha.readRenderedFile(config, 'publdate-macros.html');

        assert.ok(html, 'result exists');
        assert.equal(typeof html, 'string', 'result isString');

        assert.ok($('article').html().includes("Aug 16 2019"));
    });
});

describe('toc-group toc-item', () => {
    it('should find TOC Links', async () => {
        let { html, $ } = await akasha.readRenderedFile(config, 'tocgroup.html');

        assert.ok(html, 'result exists');
        assert.equal(typeof html, 'string', 'result isString');

        assert.equal($('article div#the-group').length, 1);

        assert.ok($('article ol li a[href="#install"]').attr('href').includes('install'));
        assert.ok($('article ol li a[href="#install"]').html().includes('Installation'));

        assert.ok($('article ol li a[href="#config"]').attr('href').includes('config'));
        assert.ok($('article ol li a[href="#config"]').html().includes('Configuration'));

        assert.ok($('article ol li a[href="#custom-tags"]').attr('href').includes('custom-tags'));
        assert.ok($('article ol li a[href="#custom-tags"]').html().includes('Custom tags'));

        assert.ok($('article ol li ol li a[href="#metadata"]').attr('href').includes('metadata'));
        assert.ok($('article ol li ol li a[href="#metadata"]').html().includes('Metadata in page header'));

        assert.ok($('article ol li ol li a[href="#link-rel"]').attr('href').includes('link-rel'));
        assert.ok($('article ol li ol li a[href="#link-rel"]').html().includes('Generating link rel= tags in header'));

        assert.ok($('article ol li ol li a[href="#canonical-url"]').attr('href').includes('canonical-url'));
        assert.ok($('article ol li ol li a[href="#canonical-url"]').html().includes('Generate a canonical URL in header'));

        assert.ok($('article ol li ol li a[href="#mktoc"]').attr('href').includes('mktoc'));
        assert.ok($('article ol li ol li a[href="#mktoc"]').html().includes('Generate a Table of Contents for a page'));

        assert.ok($('article ol li ol li a[href="#publdate"]').attr('href').includes('publdate'));
        assert.ok($('article ol li ol li a[href="#publdate"]').html().includes('Show the Publication Date on the page'));

        assert.ok($('article ol li ol li a[href="#opengraph"]').attr('href').includes('opengraph'));
        assert.ok($('article ol li ol li a[href="#opengraph"]').html().includes('Promote images with OpenGraph tags'));

        assert.ok($('article ol li ol li a[href="#opengraph-single"]').attr('href').includes('opengraph-single'));
        assert.ok($('article ol li ol li a[href="#opengraph-single"]').html().includes('Promoting a single image for OpenGraph'));

        assert.ok($('article ol li a[href="#sitemaps"]').attr('href').includes('sitemaps'));
        assert.ok($('article ol li a[href="#sitemaps"]').html().includes('XML Sitemaps'));

    });
});

describe('image to figure/image', () => {
    it('should find figure/image pair for img', async () => {
        let { html, $ } = await akasha.readRenderedFile(config, 'img2figimg.html');

        assert.ok(html, 'result exists');
        assert.equal(typeof html, 'string', 'result isString');

        // The primary testing for img2figimg is in akasharender
        // However this piece of testing must happen here.

        assert.equal($('head meta[name="og:image"]').length, 1);
        // console.log($('head meta[name="og:image"]').attr('content'))
        assert.ok($('head meta[name="og:image"]').attr('content').includes(
            "https://example.akashacms.com/img/Human-Skeleton.jpg"));
    });
});

describe('opengraph images', () => {
    it('should find opengroup images promoted to head', async () => {
        let { html, $ } = await akasha.readRenderedFile(config, 'opengraph-image.html');

        assert.ok(html, 'result exists');
        assert.equal(typeof html, 'string', 'result isString');

        assert.equal($('head meta[name="og:image"]').length, 4);
        assert.equal($('head meta[content="http://some.where"]').length, 1);
        assert.equal($('head meta[content="http://else.where"]').length, 1);
        assert.equal($('head meta[content="https://example.akashacms.com/img/foo-bar.jpg"]').length, 1);
        assert.equal($('head meta[content="https://example.akashacms.com/full/path/img/foo-bar.jpg"]').length, 1);
        assert.equal($('body opengraph-image').length, 0);
    });
});

describe('opengraph promote images', () => {
    it('should find opengroup images promoted to head', async () => {
        let { html, $ } = await akasha.readRenderedFile(config, 'opengraph-promote-image.html');

        assert.ok(html, 'result exists');
        assert.equal(typeof html, 'string', 'result isString');

        assert.equal($('head meta[name="og:image"]').length, 4);
        assert.equal($('head meta[content="http://foo.bar/this-should-be-promoted-default-action.jpg"]').length, 1);
        assert.equal($('head meta[content="http://foo.bar/should-be-promoted-class.jpg"]').length, 1);
        assert.equal($('head meta[content="http://foo.bar/should-not-be-promoted-class.jpg"]').length, 0);
        assert.equal($('head meta[content="http://foo.bar/img/extlink.png"]').length, 0);
        assert.equal($('head meta[content="http://foo.bar/img/rss_button.png"]').length, 0);
        assert.equal($('head meta[content="http://foo.bar/img/rss_button.gif"]').length, 0);
        assert.equal($('head meta[content="https://example.akashacms.com/img-from-partial.jpg"]').length, 1);
        assert.equal($('body partial').length, 0);
        assert.equal($('body partial[file-name="img.html"]').length, 0);
        assert.equal($('body img#img-from-partial').length, 1);
        assert.equal($('head meta[content="https://example.akashacms.com/img-from-partial-ejs.jpg"]').length, 1);
        assert.equal($('body img#img-from-partial-ejs').length, 1);
    });
});

describe('oembed provider', () => {

    it('should inject oEmbed discovery link tags', async () => {
        let { html, $ } = await akasha.readRenderedFile(config, 'oembed.html');

        assert.ok(html, 'result exists');
        assert.equal(typeof html, 'string', 'result isString');

        const jsonLink = $('head link[type="application/json+oembed"]');
        assert.equal(jsonLink.length, 1);
        assert.ok(jsonLink.attr('href').includes(
            "https://example.akashacms.com/oembed.oembed.json"));
        assert.equal(jsonLink.attr('rel'), "alternate");

        const xmlLink = $('head link[type="text/xml+oembed"]');
        assert.equal(xmlLink.length, 1);
        assert.ok(xmlLink.attr('href').includes(
            "https://example.akashacms.com/oembed.oembed.xml"));
    });

    it('should generate an oEmbed JSON file', async () => {
        const fpath = path.join(
            config.renderDestination, 'oembed.oembed.json');
        const text = await fsp.readFile(fpath, 'utf8');
        const data = JSON.parse(text);

        assert.equal(data.version, "1.0");
        assert.equal(data.type, "link");
        assert.equal(data.title, "oEmbed test & demo");
        assert.equal(data.provider_name, "AkashaCMS Test");
        assert.equal(data.provider_url, "https://example.akashacms.com");
        assert.equal(data.cache_age, 3600);
        assert.equal(data.author_name, "Jane <Author> Doe");
        assert.equal(data.author_url,
            "https://example.akashacms.com/about/jane.html");
    });

    it('should generate a well-formed oEmbed XML file', async () => {
        const fpath = path.join(
            config.renderDestination, 'oembed.oembed.xml');
        const text = await fsp.readFile(fpath, 'utf8');

        assert.ok(text.includes('<?xml version="1.0"'));
        assert.ok(text.includes('<oembed>'));
        assert.ok(text.includes('</oembed>'));
        assert.ok(text.includes('<version>1.0</version>'));
        assert.ok(text.includes('<type>link</type>'));
        // Title and author contain XML-significant characters which must
        // be escaped as PCDATA.
        assert.ok(text.includes('<title>oEmbed test &amp; demo</title>'));
        assert.ok(text.includes('<author_name>Jane &lt;Author&gt; Doe</author_name>'));
        assert.ok(!text.includes('<Author>'));
    });
});

describe('ak-header-sitemap', () => {

    it('should render <ak-header-sitemap> as <link rel="sitemap"> with the generated sitemap href', async () => {
        let { html, $ } = await akasha.readRenderedFile(config, 'sitemap.html');

        assert.ok(html, 'result exists');
        assert.equal(typeof html, 'string', 'result isString');

        const link = $('article link[rel="sitemap"]');
        assert.equal(link.length, 1);
        assert.equal(link.attr('type'), 'application/xml');
        assert.equal(link.attr('href'), '/sitemap-index.xml.gz');
        assert.equal(link.attr('title'), 'ak-header-sitemap element test');
    });

    it('should render the {% aksitemap %} Nunjucks tag as <link rel="sitemap">', async () => {
        let { html, $ } = await akasha.readRenderedFile(config, 'sitemap-macros.html');

        assert.ok(html, 'result exists');
        assert.equal(typeof html, 'string', 'result isString');

        const link = $('article link[rel="sitemap"]');
        assert.equal(link.length, 1);
        assert.equal(link.attr('type'), 'application/xml');
        assert.equal(link.attr('href'), '/sitemap-index.xml.gz');
        assert.equal(link.attr('title'), 'aksitemap Nunjucks tag test');
    });

    it('doGoogleSitemap should point at the generated sitemap index', async () => {
        // The direct-calls page invokes doGoogleSitemap(locals); verify
        // the emitted href matches the file the plugin actually writes.
        let { html, $ } = await akasha.readRenderedFile(config, 'do-plugin-base-direct-calls.html');
        const link = $('article link[rel="sitemap"]');
        assert.equal(link.length, 1);
        assert.equal(link.attr('href'), '/sitemap-index.xml.gz');
    });

    it('doAKSitemap should escape a title containing HTML-significant characters', () => {
        const basePlugin = config.plugin('@akashacms/plugins-base');
        const html = basePlugin.doAKSitemap({
            title: 'Bad <title> "quoted" & unescaped'
        });
        // The href is a constant, but the title must be attribute-escaped.
        assert.ok(html.includes('href="/sitemap-index.xml.gz"'));
        assert.ok(html.includes(
            'title="Bad &lt;title&gt; &quot;quoted&quot; &amp; unescaped"'));
        // And there must be no unescaped < or " left in the title span.
        assert.ok(!html.includes('title="Bad <title>'));
    });

    it('doAKSitemap should tolerate metadata without a title', () => {
        const basePlugin = config.plugin('@akashacms/plugins-base');
        const html = basePlugin.doAKSitemap({});
        assert.ok(html.includes('href="/sitemap-index.xml.gz"'));
        assert.ok(html.includes('title=""'));
    });
});

describe('isLegitLocalHref (sitemap paths)', () => {

    it('should recognize sitemap-index.xml and its .gz variant', () => {
        const basePlugin = config.plugin('@akashacms/plugins-base');
        assert.equal(basePlugin.isLegitLocalHref(config, '/sitemap-index.xml'), true);
        assert.equal(basePlugin.isLegitLocalHref(config, '/sitemap-index.xml.gz'), true);
    });

    it('should recognize numbered sitemap chunks (with and without .gz)', () => {
        const basePlugin = config.plugin('@akashacms/plugins-base');
        assert.equal(basePlugin.isLegitLocalHref(config, '/sitemap-0.xml'), true);
        assert.equal(basePlugin.isLegitLocalHref(config, '/sitemap-0.xml.gz'), true);
        assert.equal(basePlugin.isLegitLocalHref(config, '/sitemap-1.xml'), true);
        assert.equal(basePlugin.isLegitLocalHref(config, '/sitemap-42.xml.gz'), true);
    });

    it('should reject hrefs that do not match the generated sitemap pattern', () => {
        const basePlugin = config.plugin('@akashacms/plugins-base');
        // The legacy /sitemap.xml is NOT written by this plugin.
        assert.equal(basePlugin.isLegitLocalHref(config, '/sitemap.xml'), false);
        assert.equal(basePlugin.isLegitLocalHref(config, '/sitemap-index.xml.bak'), false);
        assert.equal(basePlugin.isLegitLocalHref(config, '/sitemap-abc.xml'), false);
        assert.equal(basePlugin.isLegitLocalHref(config, 'sitemap-0.xml'), false);
        assert.equal(basePlugin.isLegitLocalHref(config, '/foo.xml'), false);
        assert.equal(basePlugin.isLegitLocalHref(config, '/'), false);
        assert.equal(basePlugin.isLegitLocalHref(config, ''), false);
    });

    it('should tolerate non-string input by returning false', () => {
        const basePlugin = config.plugin('@akashacms/plugins-base');
        assert.equal(basePlugin.isLegitLocalHref(config, null), false);
        assert.equal(basePlugin.isLegitLocalHref(config, undefined), false);
        assert.equal(basePlugin.isLegitLocalHref(config, 42), false);
        assert.equal(basePlugin.isLegitLocalHref(config, {}), false);
    });

    it('askPluginsLegitLocalHref on the Configuration should delegate to the plugin', () => {
        // Round-trip through the AkashaRender-level API that the link
        // checker actually calls.
        assert.equal(config.askPluginsLegitLocalHref('/sitemap-index.xml.gz'), true);
        assert.equal(config.askPluginsLegitLocalHref('/sitemap-0.xml.gz'), true);
        assert.equal(config.askPluginsLegitLocalHref('/sitemap.xml'), false);
    });
});

describe('close', () => {
    it('should close the configuration', async () => {
        try {
            await akasha.closeCaches();
        } catch (e) {
            console.error(e);
            throw e;
        }
    }, { timeout: 75000 });
});
