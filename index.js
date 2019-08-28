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
const path  = require('path');
const util  = require('util');
const url   = require('url');
const akasha = require('akasharender');
const mahabhuta = akasha.mahabhuta;
const smap  = require('sightmap');

const pluginName = "akashacms-base";

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
        config.addLayoutsDir(path.join(__dirname, 'layout'));
        config.addAssetsDir(path.join(__dirname, 'assets'));
        config.addMahabhuta(module.exports.mahabhutaArray(options));
        if (!options.linkRelTags) this[_plugin_options].linkRelTags = [];
    }

    get config() { return this[_plugin_config]; }
    get options() { return this[_plugin_options]; }

    doHeaderMetaSync(config, metadata) {
        return akasha.partialSync(config,
            "ak_headermeta.html.ejs",
            fixHeaderMeta(metadata));
    }

    addLinkRelTag(config, lrTag) {
        this.options.linkRelTags.push(lrTag);
        return this;
    }

    doGoogleSitemap(metadata) {
        // TBD This is extracted from the Mahabhuta tag, need to extract these parameters
        //     from somewhere.
        // http://microformats.org/wiki/rel-sitemap
        var href = undefined; // $element.attr("href");
        if (!href) href = "/sitemap.xml";
        // var title = $element.attr("title");
        // if (!title) title = "Sitemap";
        return `<link rel="sitemap" type="application/xml" title="${metadata.title}" href="${href}" />`;
        // return `<xml-sitemap title="${metadata.title}" href="/sitemap.xml" />`; // akasha.partialSync(this._config, 'ak_sitemap.html.ejs', metadata);
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
        var documents = await akasha.documentSearch(config, {
            renderers: [ akasha.HTMLRenderer ]
        });

        for (let doc of documents) {
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
    ret.addMahafunc(new XMLSitemap());
    ret.addMahafunc(new LinkRelTagsElement());
    ret.addMahafunc(new CanonicalURLElement());
    ret.addMahafunc(
        function($, metadata, dirty, done) {
            var elements = [];
            $('ak-siteverification').each((i, elem) => { elements.push(elem); });
            if (elements.length <= 0) return done();
            return done(new Error("ak-siteverification deprecated, use site-verification instead"));
        });
    ret.addMahafunc(new GoogleAnalyticsElement());
    ret.addMahafunc(new PublicationDateElement());
    ret.addMahafunc(new TOCGroupElement());
    ret.addMahafunc(new TOCItemElement());
    ret.addMahafunc(new AuthorLinkElement());
    ret.addMahafunc(new OpenGraphPromoteImages());
    ret.addMahafunc(new img2figureImage());
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
                "ak_headermeta.html.ejs",
                fixHeaderMeta(metadata));
    }
}

/* Moved to Mahabhuta */
class XMLSitemap extends mahabhuta.CustomElement {
    get elementName() { return "ak-sitemapxml"; }
    process($element, metadata, dirty) {
        return Promise.reject(new Error("ak-sitemapxml deprecated"));
    }
}

function doLinkRelTag(config, lrtag) {
    return `<link rel="${lrtag.relationship}" href="${lrtag.url}" />`;
    // return akasha.partial(this.array.options.config, "ak_linkreltag.html.ejs", {
    //     relationship: lrtag.relationship,
    //     url: lrtag.url
    // });
}

class LinkRelTagsElement extends mahabhuta.CustomElement {
    get elementName() { return "ak-header-linkreltags"; }
    process($element, metadata, dirty) {
        var ret = "";
        // console.log(`ak-header-linkreltags `, this.array.options);
        if (this.array.options.linkRelTags.length > 0) {
            for (var lrtag of this.array.options.linkRelTags) {
                ret += doLinkRelTag(this.array.options.config, lrtag);
            }
        }
        // Why was this here a 2nd time?
        /* if (this.array.options.linkRelTags.length > 0) {
            for (var lrtag of this.array.options.linkRelTags) {
                ret += doLinkRelTag(this.array.options.config, lrtag);
            }
        } */
        // console.log(`ak-header-linkreltags `, ret);
        return ret;
    }
}

class CanonicalURLElement extends mahabhuta.CustomElement {
    get elementName() { return "ak-header-canonical-url"; }
    process($element, metadata, dirty) {
        return doLinkRelTag(this.array.options.config, {
            relationship: "canonical",
            url: metadata.rendered_url
        });
    }
}

class GoogleAnalyticsElement extends mahabhuta.CustomElement {
    get elementName() { return "ak-google-analytics"; }
    process($element, metadata, dirty) {
        return Promise.reject("ak-google-analytics deprecated")
    }
}

class PublicationDateElement extends mahabhuta.CustomElement {
    get elementName() { return "publication-date"; }
    async process($element, metadata, dirty) {
        if (metadata.publicationDate) {
            return akasha.partial(this.array.options.config, "ak_publdate.html.ejs", {
                publicationDate: metadata.publicationDate
            });
        } else return "";
    }
}

class TOCGroupElement extends mahabhuta.CustomElement {
    get elementName() { return "toc-group"; }
    async process($element, metadata, dirty) {
        const template = $element.attr('template') 
                ? $element.attr('template')
                :  "ak_toc_group_element.html.ejs";
        const id = $element.attr('id');
        const additionalClasses = $element.attr('additional-classes')
                ? $element.attr('additional-classes')
                : "";
        const suppressContents = $element.attr('suppress-contents');
        const content = $element.html()
                ? $element.html()
                : "";

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
                :  "ak_toc_item_element.html.ejs";
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

        return akasha.partial(this.array.options.config, template, {
            id, additionalClasses, title, anchor,
            content
        });
    }
}




// TODO revamp this
// TODO this doesn't seem to be used anywhere so I haven't tested it.
class AuthorLinkElement extends mahabhuta.CustomElement {
    get elementName() { return "author-link"; }
    process($element, metadata, dirty, done) {
        throw new Error("author-link disabled");
        /* if (typeof this.array.options.config.authorship === 'undefined') {
            return Promise.resolve("");
        }
        var author;
        for (var i in this.array.options.config.authorship.authors) {
            if (this.array.options.config.authorship.authors[i].name === auname) {
                author = this.array.options.config.authorship.authors[i];
                break;
            }
        }
        if (author) {
            return akasha.partial(this.array.options.config, "ak_authorship.html.ejs", {
                fullname: author.fullname,
                authorship: author.authorship
            });
        } else {
            console.error(`author-link: no author data found for ${auname} in ${metadata.document.path}`);
            throw new Error(`author-link: no author data found for ${auname} in ${metadata.document.path}`);
        } */
    }
}


class img2figureImage extends mahabhuta.CustomElement {
    get elementName() { return 'html body img[figure]'; }
    async process($element, metadata, dirty, done) {
        // console.log($element);
        const template = $element.attr('template') 
                ? $element.attr('template')
                :  "ak_figimg.html.ejs";
        const id = $element.attr('id');
        const clazz = $element.attr('class');
        const style = $element.attr('style');
        const width = $element.attr('width');
        const src = $element.attr('src');
        const dest    = $element.attr('dest');
        const content = $element.attr('caption')
                ? $element.attr('caption')
                : "";
        
        dirty();

        return akasha.partial(this.array.options.config, template, {
            id, clazz, style, width, href: src, dest,
            caption: content
        });
    }
}

class OpenGraphPromoteImages extends mahabhuta.Munger {
    get selector() { return "html head open-graph-promote-images"; }

    async process($, $link, metadata, dirty) {

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
            if (href.match(/\/img\/extlink.png$/)
                || href.match(/\/img\/rss_button.png$/)
                || href.match(/\/img\/rss_button.gif$/)) {
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
                            let pRendered = url.parse(metadata.rendered_url);
                            let dirRender = path.dirname(pRendered.path);
                            let pRootUrl = url.parse(this.array.options.config.root_url);
                            pRootUrl.pathname = dirRender !== "/"
                                            ? dirRender +'/'+ href
                                            : href;
                            // console.log(pRootUrl);
                            href = url.format(pRootUrl);
                        }
                    }
                }
                if ($(`meta[content="${href}"]`).get(0) === undefined) {
                    let txt = await akasha.partial(this.array.options.config, 'ak_metatag.html.ejs', {
                        tagname: 'og:image',
                        tagcontent: href
                    });
                    if (txt) {
                        // console.log(`${metadata.rendered_url} appending image meta ${txt}`);
                        imgcount++;
                        $('head').append(txt);
                    }
                }
            }
        }

        $link.remove();
    }
}
