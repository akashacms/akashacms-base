
const akasha   = require('akasharender');
const plugin = require('../index');
const { assert } = require('chai');

const baseConfig = {
    linkRelTags: [
        { relationship: "foo", url: "http://foo.bar" },
        { relationship: "gronk", url: "http://gronk.bar" },
        { relationship: "them", url: "http://them.bar" }
    ]
};

const config = new akasha.Configuration();
config.rootURL("https://example.akashacms.com");
config.configDir = __dirname;
config.addLayoutsDir('layouts')
      .addPartialsDir('partials')
      .addDocumentsDir('documents');
config.use(plugin, baseConfig);
config.setMahabhutaConfig({
    recognizeSelfClosing: true,
    recognizeCDATA: true,
    decodeEntities: true
});
config.prepare();


describe('build site', function() {
    it('should successfully setup cache database', async function() {
        this.timeout(75000);
        try {
            await akasha.setup(config);
        } catch (e) {
            console.error(e);
            throw e;
        }
    });

    it('should successfully setup file caches', async function() {
        this.timeout(75000);
        try {
            /* await Promise.all([
                akasha.setupDocuments(config),
                akasha.setupAssets(config),
                akasha.setupLayouts(config),
                akasha.setupPartials(config)
            ]) */
            /* await Promise.all([
                (await akasha.filecache).documents.isReady(),
                (await akasha.filecache).assets.isReady(),
                (await akasha.filecache).layouts.isReady(),
                (await akasha.filecache).partials.isReady()
            ]); */
        } catch (e) {
            console.error(e);
            throw e;
        }
    });

    it('should copy assets', async function() {
        this.timeout(75000);
        await config.copyAssets();
    });

    it('should build site', async function() {
        this.timeout(25000);
        let failed = false;
        let results = await akasha.render(config);
        for (let result of results) {
            if (result.error) {
                failed = true;
                console.error(result.error);
            }
        }
        assert.isFalse(failed);
    });
});

describe('header meta', function() {

    let checkMeta = (html, $) => {
        assert.exists(html, 'result exists');
        assert.isString(html, 'result isString');

        assert.include($('head meta[name="keywords"]').attr('content'), "Foo Bar Baz");
        assert.include($('head meta[name="description"]').attr('content'), "Way out man, so far out");
        assert.include($('head meta[name="subject"]').attr('content'), "The Moon");
        assert.include($('head meta[name="copyright"]').attr('content'), "Now");
        assert.include($('head meta[name="language"]').attr('content'), "Klingon");
        assert.include($('head meta[name="robots"]').attr('content'), "C3P0");
        assert.include($('head meta[name="revised"]').attr('content'), "Yesterday");
        assert.include($('head meta[name="abstract"]').attr('content'), "Meta is too Abstract");
        assert.include($('head meta[name="topic"]').attr('content'), "The Moon");
        assert.include($('head meta[name="summary"]').attr('content'), "This is the dawning of the new age of Aquarius");
        assert.include($('head meta[name="Classification"]').attr('content'), "Top Secret");
        assert.include($('head meta[name="author"]').attr('content'), "eltonjohn");
        assert.include($('head meta[name="designer"]').attr('content'), "Levis");
        assert.include($('head meta[name="reply-to"]').attr('content'), "Him");
        assert.include($('head meta[name="owner"]').attr('content'), "Me");
        assert.include($('head meta[name="url"]').attr('content'), "http://meta.url");
        assert.include($('head meta[name="identifier-URL"]').attr('content'), "http://meta.url/identifier");
        assert.include($('head meta[name="directory"]').attr('content'), "Yahoo");
        assert.include($('head meta[name="pagename"]').attr('content'), "Metatags test");
        assert.include($('head meta[name="category"]').attr('content'), "The Moon");
        assert.include($('head meta[name="coverage"]').attr('content'), "Primer Coat");
        assert.include($('head meta[name="distribution"]').attr('content'), "NYC");
        assert.include($('head meta[name="rating"]').attr('content'), "5 stars");
        assert.include($('head meta[name="revisit-after"]').attr('content'), "Tomorrow");
        assert.include($('head meta[name="subtitle"]').attr('content'), "U505");
        assert.include($('head meta[name="target"]').attr('content'), "Bulls Eye");
        assert.include($('head meta[name="HandheldFriendly"]').attr('content'), "Nope");
        assert.include($('head meta[name="MobileOptimized"]').attr('content'), "Nope");
        assert.include($('head meta[name="DC.title"]').attr('content'), "Metatags test");
        assert.include($('head meta[name="og:title"]').attr('content'), "Metatags test");
        assert.include($('head meta[name="og:description"]').attr('content'), "Way out man, so far out");
    };

    it('should find header meta values', async function() {
        let { html, $ } = await akasha.readRenderedFile(config, 'metatags.html');
        checkMeta(html, $);
        assert.include($('head link[rel="canonical"]').attr('href'), "https://example.akashacms.com/metatags.html");
    });

    it('should find header meta values w/ NJK macros', async function() {
        let { html, $ } = await akasha.readRenderedFile(config, 'metatags-macros.html');
        checkMeta(html, $);
        assert.include($('head link[rel="canonical"]').attr('href'), "https://example.akashacms.com/metatags-macros.html");
    });
});

describe('header meta', function() {

    let checkLinkRel = (html, $) => {
        assert.exists(html, 'result exists');
        assert.isString(html, 'result isString');

        assert.include($('head link[rel="foo"]').attr('href'), "http://foo.bar");
        assert.include($('head link[rel="gronk"]').attr('href'), "http://gronk.bar");
        assert.include($('head link[rel="them"]').attr('href'), "http://them.bar");
    };

    it('should find header meta values', async function() {
        let { html, $ } = await akasha.readRenderedFile(config, 'linkreltags.html');
        checkLinkRel(html, $);
    });

    it('should find header meta values w/ NJK macros', async function() {
        let { html, $ } = await akasha.readRenderedFile(config, 'linkreltags-macros.html');
        checkLinkRel(html, $);
    });
});


describe('@akashacms/plugins-base doHeaderMetaSync doGoogleSitemap', function() {
    it('should call those functions w/o failure', async function() {
        let { html, $ } = await akasha.readRenderedFile(config, 'do-plugin-base-direct-calls.html');

        assert.exists(html, 'result exists');
        assert.isString(html, 'result isString');
        assert.equal($('article meta[name="pagename"]').length, 1);
        assert.include($('article meta[name="pagename"]').attr('content'), "Directly call @akashacms/plugins-base functions");
        assert.equal($('article meta[name="date"]').length, 1);
        assert.equal($('article meta[name="DC.title"]').length, 1);
        assert.include($('article meta[name="DC.title"]').attr('content'), "Directly call @akashacms/plugins-base functions");
        assert.equal($('article meta[name="og:title"]').length, 1);
        assert.include($('article meta[name="og:title"]').attr('content'), "Directly call @akashacms/plugins-base functions");
        assert.equal($('article meta[name="og:url"]').length, 1);
        assert.equal($('article link[rel="canonical"]').length, 1);
        assert.equal($('article link[rel="sitemap"]').length, 1);
        assert.include($('article link[rel="sitemap"]').attr('title'), "Directly call @akashacms/plugins-base functions");
    });
});

describe('canonical url', function() {
    it('should find canonical url', async function() {
        let { html, $ } = await akasha.readRenderedFile(config, 'canonical.html');

        assert.exists(html, 'result exists');
        assert.isString(html, 'result isString');

        assert.include($('head link[rel="canonical"]').attr('href'), "https://example.akashacms.com/canonical.html");
    });

    it('should find canonical url w/ NJK macros', async function() {
        let { html, $ } = await akasha.readRenderedFile(config, 'canonical-macros.html');

        assert.exists(html, 'result exists');
        assert.isString(html, 'result isString');

        assert.include($('head link[rel="canonical"]').attr('href'), "https://example.akashacms.com/canonical-macros.html");
    });
});

describe('publication date', function() {
    it('should find publication date', async function() {
        let { html, $ } = await akasha.readRenderedFile(config, 'publdate.html');

        assert.exists(html, 'result exists');
        assert.isString(html, 'result isString');

        assert.include($('article').html(), "Aug 16 2019");
    });

    it('should find publication date w/ NJK Macros', async function() {
        let { html, $ } = await akasha.readRenderedFile(config, 'publdate-macros.html');

        assert.exists(html, 'result exists');
        assert.isString(html, 'result isString');

        assert.include($('article').html(), "Aug 16 2019");
    });
});

describe('toc-group toc-item', function() {
    it('should find TOC Links', async function() {
        let { html, $ } = await akasha.readRenderedFile(config, 'tocgroup.html');

        assert.exists(html, 'result exists');
        assert.isString(html, 'result isString');

        assert.equal($('article div#the-group').length, 1);
        
        assert.include($('article ol li a[href="#install"]').attr('href'), 'install');
        assert.include($('article ol li a[href="#install"]').html(), 'Installation');

        assert.include($('article ol li a[href="#config"]').attr('href'), 'config');
        assert.include($('article ol li a[href="#config"]').html(), 'Configuration');
        
        assert.include($('article ol li a[href="#custom-tags"]').attr('href'), 'custom-tags');
        assert.include($('article ol li a[href="#custom-tags"]').html(), 'Custom tags');
        
        assert.include($('article ol li ol li a[href="#metadata"]').attr('href'), 'metadata');
        assert.include($('article ol li ol li a[href="#metadata"]').html(), 'Metadata in page header');
        
        assert.include($('article ol li ol li a[href="#link-rel"]').attr('href'), 'link-rel');
        assert.include($('article ol li ol li a[href="#link-rel"]').html(), 'Generating link rel= tags in header');
        
        assert.include($('article ol li ol li a[href="#canonical-url"]').attr('href'), 'canonical-url');
        assert.include($('article ol li ol li a[href="#canonical-url"]').html(), 'Generate a canonical URL in header');
        
        assert.include($('article ol li ol li a[href="#mktoc"]').attr('href'), 'mktoc');
        assert.include($('article ol li ol li a[href="#mktoc"]').html(), 'Generate a Table of Contents for a page');
        
        assert.include($('article ol li ol li a[href="#publdate"]').attr('href'), 'publdate');
        assert.include($('article ol li ol li a[href="#publdate"]').html(), 'Show the Publication Date on the page');
        
        assert.include($('article ol li ol li a[href="#opengraph"]').attr('href'), 'opengraph');
        assert.include($('article ol li ol li a[href="#opengraph"]').html(), 'Promote images with OpenGraph tags');
        
        assert.include($('article ol li ol li a[href="#opengraph-single"]').attr('href'), 'opengraph-single');
        assert.include($('article ol li ol li a[href="#opengraph-single"]').html(), 'Promoting a single image for OpenGraph');
        
        assert.include($('article ol li a[href="#sitemaps"]').attr('href'), 'sitemaps');
        assert.include($('article ol li a[href="#sitemaps"]').html(), 'XML Sitemaps');
        
    });
});

describe('image to figure/image', function() {
    it('should find figure/image pair for img', async function() {
        let { html, $ } = await akasha.readRenderedFile(config, 'img2figimg.html');

        assert.exists(html, 'result exists');
        assert.isString(html, 'result isString');

        // The primary testing for img2figimg is in akasharender
        // However this piece of testing must happen here.

        assert.equal($('head meta[name="og:image"]').length, 1);
        // console.log($('head meta[name="og:image"]').attr('content'))
        assert.include($('head meta[name="og:image"]').attr('content'), 
            "https://example.akashacms.com/img/Human-Skeleton.jpg");
    });
});

describe('opengraph images', function() {
    it('should find opengroup images promoted to head', async function() {
        let { html, $ } = await akasha.readRenderedFile(config, 'opengraph-image.html');

        assert.exists(html, 'result exists');
        assert.isString(html, 'result isString');

        assert.equal($('head meta[name="og:image"]').length, 4);
        assert.equal($('head meta[content="http://some.where"]').length, 1);
        assert.equal($('head meta[content="http://else.where"]').length, 1);
        assert.equal($('head meta[content="https://example.akashacms.com/img/foo-bar.jpg"]').length, 1);
        assert.equal($('head meta[content="https://example.akashacms.com/full/path/img/foo-bar.jpg"]').length, 1);
        assert.equal($('body opengraph-image').length, 0);
    });
});

describe('opengraph promote images', function() {
    it('should find opengroup images promoted to head', async function() {
        let { html, $ } = await akasha.readRenderedFile(config, 'opengraph-promote-image.html');

        assert.exists(html, 'result exists');
        assert.isString(html, 'result isString');

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

describe('Finish', function() {
    it('should close the configuration', async function() {
        try {
            await akasha.closeCaches();
        } catch (e) {
            console.error(e);
            throw e;
        }
    });
});
