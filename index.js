/**
 *
 * Copyright 2014-2017 David Herron
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

'use strict';

const fs    = require('fs');
const path  = require('path');
const util  = require('util');
const url   = require('url');
const co    = require('co');
const akasha = require('akasharender');
const mahabhuta = akasha.mahabhuta;
const smap       = require('sightmap');

const log   = require('debug')('akasha:base-plugin');
const error = require('debug')('akasha:error-base-plugin');

const pluginName = "akashacms-base";

module.exports = class BasePlugin extends akasha.Plugin {
    constructor() {
        super(pluginName);
    }

    configure(config) {
        config.addPartialsDir(path.join(__dirname, 'partials'));
        config.addLayoutsDir(path.join(__dirname, 'layout'));
        config.addAssetsDir(path.join(__dirname, 'assets'));
        config.addMahabhuta(module.exports.mahabhuta);
        config.pluginData(pluginName).linkRelTags = [];
    }

    doHeaderMetaSync(config, metadata) {
        return akasha.partialSync(config, "ak_headermeta.html.ejs", fixHeaderMeta(metadata));
    }

    addLinkRelTag(config, lrTag) {
        config.pluginData(pluginName).linkRelTags.push(lrTag);
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
        config.pluginData(pluginName).generateSitemapFlag = doit;
        return this;
    }

    onSiteRendered(config) {
        if (!config.pluginData(pluginName).generateSitemapFlag) {
            return Promise.resolve("skipped");
        }
        return co(function* () {
            var rendered_files = [];
            var documents = yield akasha.documentSearch(config, {
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
            yield new Promise((resolve, reject) => {
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
        })
    }
}

module.exports.mahabhuta = new mahabhuta.MahafuncArray("akashacms-base", {});

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

var akDoHeaderMeta = function(metadata) {
	return akasha.partial(metadata.config, "ak_headermeta.html.ejs", fixHeaderMeta(metadata));
};

/* TOO SILLY */
class PageTitleElement extends mahabhuta.CustomElement {
	get elementName() { return "ak-page-title"; }
	process($element, metadata, dirty) {
        return Promise.reject(new Error("ak-page-title deprecated"));
	}
}
module.exports.mahabhuta.addMahafunc(new PageTitleElement()); /* */

class HeaderMetatagsElement extends mahabhuta.CustomElement {
	get elementName() { return "ak-header-metatags"; }
	process($element, metadata, dirty, done) {
		return akDoHeaderMeta(metadata);
	}
}
module.exports.mahabhuta.addMahafunc(new HeaderMetatagsElement());

/* Moved to Mahabhuta */
class XMLSitemap extends mahabhuta.CustomElement {
    get elementName() { return "ak-sitemapxml"; }
    process($element, metadata, dirty, done) {
        return Promise.reject(new Error("ak-sitemapxml deprecated"));
    }
}
module.exports.mahabhuta.addMahafunc(new XMLSitemap()); /* */

function doLinkRelTag(config, lrtag) {
    return akasha.partial(metadata.config, "ak_linkreltag.html.ejs", {
        relationship: lrtag.relationship,
        url: lrtag.url
    });
}

class LinkRelTagsElement extends mahabhuta.CustomElement {
    get elementName() { return "ak-header-linkreltags"; }
    process($element, metadata, dirty) {
        return co(function* () {
            var ret = "";
            if (metadata.config.pluginData(pluginName).linkRelTags.length > 0) {
                for (var lrtag of metadata.config.pluginData(pluginName).linkRelTags) {
                    ret += yield doLinkRelTag(metadata.config, lrtag);
                }
            }
            if (metadata.config.pluginData(pluginName).linkRelTags.length > 0) {
                for (var lrtag of metadata.config.pluginData(pluginName).linkRelTags) {
                    ret += yield doLinkRelTag(metadata.config, lrtag);
                }
            }
            return ret;
        });
    }
}
module.exports.mahabhuta.addMahafunc(new LinkRelTagsElement());

class CanonicalURLElement extends mahabhuta.CustomElement {
    get elementName() { return "ak-header-canonical-url"; }
    process($element, metadata, dirty) {
        return doLinkRelTag(metadata.config, {
            relationship: "canonical",
            url: metadata.rendered_url
        });
    }
}
module.exports.mahabhuta.addMahafunc(new CanonicalURLElement());

module.exports.mahabhuta.addMahafunc(
    function($, metadata, dirty, done) {
            var elements = [];
            $('ak-siteverification').each((i, elem) => { elements.push(elem); });
            if (elements.length <= 0) return done();
            return done(new Error("ak-siteverification deprecated, use site-verification instead"));
        });

class GoogleAnalyticsElement extends mahabhuta.CustomElement {
    get elementName() { return "ak-google-analytics"; }
    process($element, metadata, dirty) {
        return Promise.reject("ak-google-analytics deprecated")
    }
}
module.exports.mahabhuta.addMahafunc(new GoogleAnalyticsElement());

class PublicationDateElement extends mahabhuta.CustomElement {
    get elementName() { return "publication-date"; }
    process($element, metadata, dirty, done) {
        if (metadata.publicationDate) {
            return akasha.partial(metadata.config, "ak_publdate.html.ejs", {
                publicationDate: metadata.publicationDate
            });
        } else return Promise.resolve("");
    }
}
module.exports.mahabhuta.addMahafunc(new PublicationDateElement());

// TODO revamp this
// TODO this doesn't seem to be used anywhere so I haven't tested it.
class AuthorLinkElement extends mahabhuta.CustomElement {
    get elementName() { return "author-link"; }
    process($element, metadata, dirty, done) {
        throw new Error("author-link disabled");
        /* if (typeof metadata.config.authorship === 'undefined') {
            return Promise.resolve("");
        }
        var author;
        for (var i in metadata.config.authorship.authors) {
            if (metadata.config.authorship.authors[i].name === auname) {
                author = metadata.config.authorship.authors[i];
                break;
            }
        }
        if (author) {
            return akasha.partial(metadata.config, "ak_authorship.html.ejs", {
                fullname: author.fullname,
                authorship: author.authorship
            });
        } else {
            console.error(`author-link: no author data found for ${auname} in ${metadata.document.path}`);
            throw new Error(`author-link: no author data found for ${auname} in ${metadata.document.path}`);
        } */
    }
}
module.exports.mahabhuta.addMahafunc(new AuthorLinkElement());

class OpenGraphImage extends mahabhuta.Munger {
    get selector() { return "html body opengraph-image"; }
    process($, $link, metadata, dirty) {
        return co(function* () {
            const href = $link.attr('href');
            if ($(`meta[content="${href}"]`).get(0) === undefined) {
                let txt = yield akasha.partial(metadata.config, 'ak_metatag.html.ejs', {
                    tagname: 'og:image',
                    tagcontent: href
                });
                if (txt) {
                    $('head').append(txt);
                }
            }
            $link.remove();
        });
    }
}
module.exports.mahabhuta.addMahafunc(new OpenGraphImage());

class OpenGraphPromoteImages extends mahabhuta.Munger {
    get selector() { return "html head open-graph-promote-images"; }

    process($, $link, metadata, dirty) {
        return co(function* () {

            var imgcount = 0;
            // Look for <img> tags
            var selector = $link.attr('root')
                    ? ($link.attr('root') +' img')
                    : 'img';
            var imgz = [];
            $(selector).each(function(i, elem) {
                if ($(elem).hasClass('opengraph-promote')
               || !($(elem).hasClass('opengraph-no-promote')))
                    imgz.push(elem);
            });
            // Look for <meta-og-image> tags
            var selector = $link.attr('root')
                    ? ($link.attr('root') +' meta-og-image')
                    : 'meta-og-image';
            $(selector).each(function(i, elem) { imgz.push(elem); });
            // console.log(`${metadata.rendered_url} image selector ${selector} - gave ${imgz.length} images`);
            for (let img of imgz) {
                let href = $(img).attr('src');
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
                                href = metadata.config.root_url + href;
                            } else {
                                let pRendered = url.parse(metadata.rendered_url);
                                let dirRender = path.dirname(pRendered.path);
                                let pRootUrl = url.parse(metadata.config.root_url);
                                pRootUrl.pathname = dirRender +'/'+ href;
                                href = url.format(pRootUrl);
                            }
                        }
                    }
                    if ($(`meta[content="${href}"]`).get(0) === undefined) {
                        let txt = yield akasha.partial(metadata.config, 'ak_metatag.html.ejs', {
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
        });
    }
}
module.exports.mahabhuta.addMahafunc(new OpenGraphPromoteImages());

/* This is now in akashacms-external-links
 *
module.exports.mahabhuta.addMahafunc(
		function($, metadata, dirty, done) {

            var links = [];
            $('html body a').each((i, elem) => { links.push(elem); });
			if (links.length <= 0) return done();
        	log('a modifications');
            async.eachSeries(links,
            (link, next) => {
                setImmediate(function() {
            	var href   = $(link).attr('href');

            	// The potential exists to manipulate links to local documents
            	// Such as what's done with the linkto tag above.
            	// Such as checking for valid links
            	// Also need to consider links to //hostname/path/to/object
            	// Potential for complete link checking service right here

            	if (href && href !== '#') {
					var uHref = url.parse(href, true, true);

					if (uHref.protocol || uHref.slashes) {
						// It's a link to somewhere else
						// look at domain in whitelist and blacklist

						var donofollow = false;

						if (metadata.config.nofollow && metadata.config.nofollow.blacklist) {
							metadata.config.nofollow.blacklist.forEach(function(re) {
								if (uHref.hostname.match(re)) {
									donofollow = true;
								}
							});
						}
						if (metadata.config.nofollow && metadata.config.nofollow.whitelist) {
							metadata.config.nofollow.whitelist.forEach(function(re) {
								if (uHref.hostname.match(re)) {
									donofollow = false;
								}
							});
						}

						if (donofollow && !$(link).attr('rel')) {
							$(link).attr('rel', 'nofollow');
						}

						/* TODO
						if (! metadata.config.builtin.suppress.extlink
						 && $(link).find("img.ak-extlink-icon").length <= 0) {
							$(link).append('<img class="ak-extlink-icon" src="/img/extlink.png"/>');
						} * /

						next();
					} else {
						// This is where we would handle local links
						if (! href.match(/^\//)) {
						    var hreforig = href;
						    var pRenderedUrl = url.parse(metadata.rendered_url);
						    var docpath = pRenderedUrl.pathname;
						    var docdir = path.dirname(docpath);
							href = path.join(docdir, href);
							// util.log('***** FIXED href '+ hreforig +' to '+ href);
						}
						/* TODO
            			var docEntry = akasha.findDocumentForUrlpath(href);
            			if (docEntry) {
            				// Automatically add a title= attribute
            				if (!$(link).attr('title') && docEntry.frontmatter.yaml.title) {
            					$(link).attr('title', docEntry.frontmatter.yaml.title);
            				}
            				// For local links that don't have text or interior nodes,
            				// supply text from the title of the target of the link.
            				var linktext = $(link).text();
            				if ((!linktext || linktext.length <= 0 || linktext === href)
            				 && $(link).children() <= 0
            				 && docEntry.frontmatter.yaml.title) {
            					$(link).text(docEntry.frontmatter.yaml.title);
            				}
            			} * /
            			next();
					}
				} else next();
                });
            },
            err => {
				if (err) done(err);
				else done();
        	});
        }); */
