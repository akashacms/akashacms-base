/**
 *
 * Copyright 2014-2019 David Herron
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

const fs    = require('fs');
const fsp   = fs.promises;
const path  = require('path');
const util  = require('util');
const url   = require('url');
const akasha = require('akasharender');
const mahabhuta = akasha.mahabhuta;
const smap  = require('sightmap');

const pluginName = "@akashacms/plugins-base";

const _plugin_config = Symbol('config');
const _plugin_options = Symbol('options');

module.exports = class BasePlugin extends akasha.Plugin {
    constructor() {
        super(pluginName);
    }

    configure(config, options) {
        this[_plugin_config] = config;
        this[_plugin_options] = options;
        options.config = config;
        config.addPartialsDir(path.join(__dirname, 'partials'));
        config.addLayoutsDir(path.join(__dirname, 'layouts'));
        config.addAssetsDir(path.join(__dirname, 'assets'));
        config.addMahabhuta(module.exports.mahabhutaArray(options));
        if (!options.linkRelTags) this[_plugin_options].linkRelTags = [];
    }

    get config() { return this[_plugin_config]; }
    get options() { return this[_plugin_options]; }

    doHeaderMetaSync(config, metadata) {
        return akasha.partialSync(this.config,
            "ak_headermeta.html.handlebars",
            fixHeaderMeta(metadata));
    }

    async doHeaderMeta(config, metadata) {
        return akasha.partial(this.config,
            "ak_headermeta.html.handlebars",
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
        if (!href) href = "/sitemap.xml";
        let $ = mahabhuta.parse('<link rel="sitemap" type="application/xml" title="" href="" />');
        $('link').attr('title', metadata.title);
        $('link').attr('href', href);
        return $.html();
    }

    doPublicationDate(publicationDate) {
        if (publicationDate) {
            // console.log(`doPublicationDate ${util.inspect(publicationDate)}`);
            let d = new Date(publicationDate);
            return akasha.partialSync(this.config, "ak_publdate.html.njk", {
                publicationDate: d.toDateString()
            });
        } else return "";
    }

    generateSitemap(config, doit) {
        this.options.generateSitemapFlag = doit;
        return this;
    }

    async onSiteRendered(config) {
        if (!this.options.generateSitemapFlag) {
            return Promise.resolve("skipped");
        }
        var rendered_files = [];
        const documents = (await akasha.filecache).documents.search(config, {
            renderglob: '**/*.html'
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

            var baseURL = url.parse(config.root_url);
            baseURL.pathname = doc.renderpath;

            rendered_files.push({
                loc: baseURL.format(),
                priority: 0.5,
                lastmod:  fDate.getUTCFullYear() +"-"+ mm +"-"+ dd
            })
        }

        smap(rendered_files);
        await new Promise((resolve, reject) => {
            smap(function(xml) {
                fs.writeFile(path.join(config.renderDestination, "sitemap.xml"), xml, 'utf8', function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        });

        return "okay";
    }
}

module.exports.mahabhutaArray = function(options) {
    let ret = new mahabhuta.MahafuncArray(pluginName, options);
    ret.addMahafunc(new HeaderMetatagsElement());
    ret.addMahafunc(new LinkRelTagsElement());
    ret.addMahafunc(new CanonicalURLElement());
    ret.addMahafunc(
        function($, metadata, dirty, done) {
            var elements = [];
            $('ak-siteverification').each((i, elem) => { elements.push(elem); });
            if (elements.length <= 0) return done();
            return done(new Error("ak-siteverification deprecated, use site-verification instead"));
        });
    ret.addMahafunc(new PublicationDateElement());
    ret.addMahafunc(new TOCGroupElement());
    ret.addMahafunc(new TOCItemElement());
    ret.addMahafunc(new OpenGraphPromoteImages());
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

class HeaderMetatagsElement extends mahabhuta.CustomElement {
    get elementName() { return "ak-header-metatags"; }
    process($element, metadata, dirty) {
        return akasha.partial(this.array.options.config,
                "ak_headermeta.html.handlebars",
                fixHeaderMeta(metadata));
    }
}

function doLinkRelTag(config, lrtag) {
    return `<link rel="${lrtag.relationship}" href="${lrtag.url}" />`;
}

class LinkRelTagsElement extends mahabhuta.CustomElement {
    get elementName() { return "ak-header-linkreltags"; }
    process($element, metadata, dirty) {
        return this.array.options.config.plugin(pluginName)
                    .doLinkRelTags();
    }
}

class CanonicalURLElement extends mahabhuta.CustomElement {
    get elementName() { return "ak-header-canonical-url"; }
    process($element, metadata, dirty) {
        return this.array.options.config.plugin(pluginName)
                    .doCanonicalURL(metadata.rendered_url);
    }
}

class PublicationDateElement extends mahabhuta.CustomElement {
    get elementName() { return "publication-date"; }
    async process($element, metadata, dirty) {
        // console.log(`PublicationDateElement ${util.inspect(metadata.publicationDate)}`);
        return this.array.options.config.plugin(pluginName)
                    .doPublicationDate(metadata.publicationDate);
    }
}

class TOCGroupElement extends mahabhuta.CustomElement {
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
        return akasha.partial(this.array.options.config, template, {
            id, additionalClasses, suppressContents,
            content
        });
    }
}

class TOCItemElement extends mahabhuta.CustomElement {
    get elementName() { return "toc-item"; }
    async process($element, metadata, dirty) {
        const template = $element.attr('template') 
                ? $element.attr('template')
                :  "ak_toc_item_element.html.njk";
        const id = $element.attr('id');
        const additionalClasses = $element.attr('additional-classes')
                ? $element.attr('additional-classes')
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
        return akasha.partial(this.array.options.config, template, {
            id, additionalClasses, title, anchor,
            content
        });
    }
}

class OpenGraphPromoteImages extends mahabhuta.Munger {
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
            if ($(elem).hasClass('opengraph-promote')
            || !($(elem).hasClass('opengraph-no-promote')))
                imgz.push($(elem).attr('src'));
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
            imgz.push($(elem).attr('href')); 
            $(elem).remove();
        });
        // console.log(`${metadata.rendered_url} image selector ${selector} - gave ${imgz.length} images`);
        for (let href of imgz) {
            // let href = $(img).attr('src');
            // console.log(`${metadata.rendered_url} image ${href}`);
            if (href && (href.match(/\/img\/extlink.png$/)
                || href.match(/\/img\/rss_button.png$/)
                || href.match(/\/img\/rss_button.gif$/))) {
                    // Ignore these images
            } else {
                if (href && href.length > 0) {
                    let pHref = url.parse(href);
                    // In case this is a site-relative URL, fix it up
                    // to have the full URL.
                    if (! pHref.host) {
                        if (pHref.path.match(/^\//)) {
                            href = this.array.options.config.root_url + href;
                        } else {
                            let dirRender = path.dirname(metadata.document.renderTo);
                            let pRootUrl = url.parse(this.array.options.config.root_url);
                            // This is an image relative to
                            // the document.  If the document is
                            // in the root directory, then we must not
                            // prepend the document's directory to
                            // the image href.
                            pRootUrl.pathname =
                              (dirRender !== "/" && dirRender !== '.')
                                    ? dirRender +'/'+ href
                                    : href;
                            // console.log(pRootUrl);
                            // console.log(`in ${metadata.document.renderTo} dirRender ${dirRender} href ${href} `, pRootUrl);
                            href = url.format(pRootUrl);
                        }
                    }
                }
                if ($(`meta[content="${href}"]`).get(0) === undefined) {

                    let $new = mahabhuta.parse('<meta name="" content=""/>');
                    $new('meta').attr('name', 'og:image');
                    $new('meta').attr('content', href);
                    let txt = $new.html();

                    if (txt) {
                        // console.log(`${metadata.rendered_url} appending image meta ${txt}`);
                        imgcount++;
                        $('head').append(txt);
                    }
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
