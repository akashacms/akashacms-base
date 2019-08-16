
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
      .addDocumentsDir('documents');
config.use(plugin, baseConfig);
config.setMahabhutaConfig({
    recognizeSelfClosing: true,
    recognizeCDATA: true,
    decodeEntities: true
});
config.prepare();


describe('header meta', function() {
    it('should find header meta values', async function() {
        let result = await akasha.renderPath(config, '/metatags.html');

        assert.exists(result, 'result exists');
        assert.isString(result, 'result isString');
        assert.include(result, '.html.md');
        assert.include(result, 'documents/metatags.html.md');
        assert.include(result, 'out/metatags.html');

        let { html, $ } = await akasha.readRenderedFile(config, 'metatags.html');

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
        assert.include($('head link[rel="canonical"]').attr('href'), "https://example.akashacms.com/metatags.html");
    });
});

describe('header meta', function() {
    it('should find header meta values', async function() {
        let result = await akasha.renderPath(config, '/linkreltags.html');

        assert.exists(result, 'result exists');
        assert.isString(result, 'result isString');
        assert.include(result, '.html.md');
        assert.include(result, 'documents/linkreltags.html.md');
        assert.include(result, 'out/linkreltags.html');

        let { html, $ } = await akasha.readRenderedFile(config, 'linkreltags.html');

        assert.exists(html, 'result exists');
        assert.isString(html, 'result isString');

        assert.include($('head link[rel="foo"]').attr('href'), "http://foo.bar");
        assert.include($('head link[rel="gronk"]').attr('href'), "http://gronk.bar");
        assert.include($('head link[rel="them"]').attr('href'), "http://them.bar");
    });
});

describe('canonical url', function() {
    it('should find canonical url', async function() {
        let result = await akasha.renderPath(config, '/canonical.html');

        assert.exists(result, 'result exists');
        assert.isString(result, 'result isString');
        assert.include(result, '.html.md');
        assert.include(result, 'documents/canonical.html.md');
        assert.include(result, 'out/canonical.html');

        let { html, $ } = await akasha.readRenderedFile(config, 'canonical.html');

        assert.exists(html, 'result exists');
        assert.isString(html, 'result isString');

        assert.include($('head link[rel="canonical"]').attr('href'), "https://example.akashacms.com/canonical.html");
    });
});

describe('publication date', function() {
    it('should find publication date', async function() {
        let result = await akasha.renderPath(config, '/publdate.html');

        assert.exists(result, 'result exists');
        assert.isString(result, 'result isString');
        assert.include(result, '.html.md');
        assert.include(result, 'documents/publdate.html.md');
        assert.include(result, 'out/publdate.html');

        let { html, $ } = await akasha.readRenderedFile(config, 'publdate.html');

        assert.exists(html, 'result exists');
        assert.isString(html, 'result isString');

        assert.include($('article').html(), "Date: August 16, 2019 12:54 PM PDT");
    });
});

describe('toc-group toc-item', function() {
    it('should find TOC Links', async function() {
        let result = await akasha.renderPath(config, '/tocgroup.html');

        assert.exists(result, 'result exists');
        assert.isString(result, 'result isString');
        assert.include(result, '.html.md');
        assert.include(result, 'documents/tocgroup.html.md');
        assert.include(result, 'out/tocgroup.html');

        let { html, $ } = await akasha.readRenderedFile(config, 'tocgroup.html');

        assert.exists(html, 'result exists');
        assert.isString(html, 'result isString');
        
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

describe('opengraph images', function() {
    it('should find opengroup images promoted to head', async function() {
        let result = await akasha.renderPath(config, '/opengraph-image.html');

        assert.exists(result, 'result exists');
        assert.isString(result, 'result isString');
        assert.include(result, '.html.md');
        assert.include(result, 'documents/opengraph-image.html.md');
        assert.include(result, 'out/opengraph-image.html');

        let { html, $ } = await akasha.readRenderedFile(config, 'opengraph-image.html');

        assert.exists(html, 'result exists');
        assert.isString(html, 'result isString');

        assert.equal($('head meta[name="og:image"]').length, 2);
        assert.equal($('head meta[content="http://some.where"]').length, 1);
        assert.equal($('head meta[content="http://else.where"]').length, 1);
        assert.equal($('body opengraph-image').length, 0);
    });
});

describe('opengraph promote images', function() {
    it('should find opengroup images promoted to head', async function() {
        let result = await akasha.renderPath(config, '/opengraph-promote-image.html');

        assert.exists(result, 'result exists');
        assert.isString(result, 'result isString');
        assert.include(result, '.html.md');
        assert.include(result, 'documents/opengraph-promote-image.html.md');
        assert.include(result, 'out/opengraph-promote-image.html');

        let { html, $ } = await akasha.readRenderedFile(config, 'opengraph-promote-image.html');

        assert.exists(html, 'result exists');
        assert.isString(html, 'result isString');

        assert.equal($('head meta[name="og:image"]').length, 2);
        assert.equal($('head meta[content="http://foo.bar/this-should-be-promoted-default-action.jpg"]').length, 1);
        assert.equal($('head meta[content="http://foo.bar/should-be-promoted-class.jpg"]').length, 1);
        assert.equal($('head meta[content="http://foo.bar/should-not-be-promoted-class.jpg"]').length, 0);
        assert.equal($('head meta[content="http://foo.bar/img/extlink.png"]').length, 0);
        assert.equal($('head meta[content="http://foo.bar/img/rss_button.png"]').length, 0);
        assert.equal($('head meta[content="http://foo.bar/img/rss_button.gif"]').length, 0);
    });
});
