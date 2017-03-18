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
const async = require('async');
const co    = require('co');
const akasha = require('akasharender');
const mahabhuta = require('mahabhuta');
const smap       = require('sightmap');

const log   = require('debug')('akasha:base-plugin');
const error = require('debug')('akasha:error-base-plugin');

const pluginName = "akashacms-base";

const _plugin_config = Symbol('config');

module.exports = class BasePlugin extends akasha.Plugin {
    constructor() {
        super(pluginName);
    }

    configure(config) {
        this[_plugin_config] = config;
        config.addPartialsDir(path.join(__dirname, 'partials'));
        config.addLayoutsDir(path.join(__dirname, 'layout'));
        config.addAssetsDir(path.join(__dirname, 'assets'));
        config.addMahabhuta(module.exports.mahabhuta);
    }

    doHeaderMetaSync(metadata) {
        return akasha.partialSync(this[_plugin_config], "ak_headermeta.html.ejs", fixHeaderMeta(metadata));
    }

    googleSiteVerification(code) {
        this[_plugin_config].pluginData(pluginName).googleSiteVerification = code;
        return this;
    }

    doGoogleSiteVerification() {
        return this[_plugin_config].pluginData(pluginName).googleSiteVerification
            ? akasha.partialSync(this[_plugin_config], "ak_siteverification.html.ejs",
                { googleSiteVerification: this[_plugin_config].pluginData(pluginName).googleSiteVerification })
            : "";
    }

    /* googleAnalytics(analyticsAccount, analyticsDomain) {
        this[_plugin_config].pluginData(pluginName).googleAnalyticsAccount = analyticsAccount;
        this[_plugin_config].pluginData(pluginName).googleAnalyticsDomain = analyticsDomain;
        return this;
    }

    doGoogleAnalyticsSync() {
        if (this[_plugin_config].pluginData(pluginName).googleAnalyticsAccount
         && this[_plugin_config].pluginData(pluginName).googleAnalyticsDomain) {
            return akasha.partialSync(this[_plugin_config], "ak_googleAnalytics.html.ejs", {
                googleAnalyticsAccount: this[_plugin_config].pluginData(pluginName).googleAnalyticsAccount,
                googleAnalyticsDomain: this[_plugin_config].pluginData(pluginName).googleAnalyticsDomain
            });
        } else {
            return "";
        }
    } */

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

    generateSitemap(doit) {
        this[_plugin_config].pluginData(pluginName).generateSitemapFlag = doit;
    }

    onSiteRendered(config) {
        if (!this[_plugin_config].pluginData(pluginName).generateSitemapFlag) {
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
        return Promise.reject(new Error("ak-page-title deprecated"))
		var title;
		if (typeof metadata.pagetitle !== "undefined") {
			title = metadata.pagetitle;
		} else if (typeof metadata.title !== "undefined") {
			title = metadata.title;
		} else title = "";
		return Promise.resolve(`<title>${title}</title>`);
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
        return Promise.reject(new Error("ak-sitemapxml deprecated"))
        /* // http://microformats.org/wiki/rel-sitemap
        var href = $element.attr("href");
        if (!href) href = "/sitemap.xml";
        var title = $element.attr("title");
        if (!title) title = "Sitemap";
        dirty();
        return Promise.resolve(`<xml-sitemap title="${title}" href="${href}" />`); */
    }
}
module.exports.mahabhuta.addMahafunc(new XMLSitemap()); /* */

class LinkRelTagsElement extends mahabhuta.CustomElement {
    get elementName() { return "ak-header-linkreltags"; }
    process($element, metadata, dirty) {
        if (metadata.config.akBase && metadata.config.akBase.linkRelTags) {
            return co(function* () {
                var ret = "";
                for (var lrtag of metadata.config.akBase.linkRelTags) {
                    ret += yield akasha.partial(metadata.config, "ak_linkreltag.html.ejs", {
                        relationship: lrtag.relationship,
                        url: lrtag.url
                    });
                }
                return ret;
            });
        } else {
            return Promise.resolve("");
        }
        return akasha.partial(metadata.config, "ak_linkreltag.html.ejs", {
            relationship: "canonical",
            url: metadata.rendered_url
        });
    }
}
module.exports.mahabhuta.addMahafunc(new LinkRelTagsElement());

class CanonicalURLElement extends mahabhuta.CustomElement {
    get elementName() { return "ak-header-canonical-url"; }
    process($element, metadata, dirty) {
        return akasha.partial(metadata.config, "ak_linkreltag.html.ejs", {
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
        	/* log('ak-siteverification');
            async.eachSeries(elements,
            (element, next) => {
				let sv = metadata.config.plugin('akashacms-base').doGoogleSiteVerification();
				// console.log(`Site Verification ${sv}`);
				if (sv && sv !== "") {
					$(element).replaceWith(sv);
				} else {
					$(element).remove();
				}
				next();
            },
            (err) => {
				if (err) {
					error('ak-siteverification Errored with '+ util.inspect(err));
					done(err);
				} else done();
            }); */
        });

class GoogleAnalyticsElement extends mahabhuta.CustomElement {
    get elementName() { return "ak-google-analytics"; }
    process($element, metadata, dirty) {
        return Promise.reject("ak-google-analytics deprecated")
        // return Promise.resolve(metadata.config.plugin('akashacms-base').doGoogleAnalyticsSync());
    }
}
module.exports.mahabhuta.addMahafunc(new GoogleAnalyticsElement());

/* Moved to Mahabhuta
module.exports.mahabhuta.addMahafunc(
		function($, metadata, dirty, done) {
			if ($('html head').get(0)) {
				var rssheadermeta = [];
				$('rss-header-meta').each(function(i, elem){ rssheadermeta.push(elem); });
				if (rssheadermeta.length <= 0) return done();
				log('rss-header-meta');
				async.eachSeries(rssheadermeta,
				function(rssmeta, next) {
					var href = $(rssmeta).attr('href');
					if (href) {
						$('head').append(
							'<link rel="alternate" type="application/rss+xml" href="'+href+'" />'
						);
					} else error('no href= tag in rss-header-meta ... skipped');
					$(rssmeta).remove();
					next();
				},
				function(err) {
					if (err) done(err);
					else done();
				});
			} else done();
        }); */

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

module.exports.mahabhuta.addMahafunc(
		function($, metadata, dirty, done) {
			if (metadata.config.authorship) {
				var auname;
				if (!metadata.authorname && metadata.config.authorship.defaultAuthorName) {
					auname = metadata.config.authorship.defaultAuthorName;
				} else if (metadata.authorname) {
					auname = metadata.authorname;
				}
				if (auname) {
					var elements = [];
					$('author-link').each(function(i, elem) { elements.push(elem); });
					if (elements.length <= 0) return done();
					log('author-link');
					async.eachSeries(elements,
					function(element, next) {
						var author;
						for (var i in metadata.config.authorship.authors) {
							if (metadata.config.authorship.authors[i].name === auname) {
								author = metadata.config.authorship.authors[i];
								break;
							}
						}
						if (author) {
							akasha.partial(metadata.config, "ak_authorship.html.ejs", {
								fullname: author.fullname,
								authorship: author.authorship
							})
							.then(html => {
								$(element).replaceWith(html);
								next();
							})
							.catch(err => { next(err); });
						} else {
							log('no author data found for '+ auname);
							next();
						}
					}, function(err) {
						if (err) { error(err); done(err); }
						else { done(); }
					});
				} else done();
			} else done();
        });

/**
 * These next two tags / functions are a two-step process for extracting image
 * references and listing them as meta og:image tags.
 *
 * In phase 1 <open-graph-promote-images> should be put in a template, to trigger
 * the code below.  It simply adds the metaog-promote class to any image found
 * in the content, and then the <open-graph-promote-images> tag is removed.
 * That class triggers phase 2.
 *
 * In phase 2 - triggered only when there is "html head" present in the DOM -
 * we take img.metaog-promote images and insert a
 *			<meta name="og:image" content="...">
 * tag into the <head> section for each one.
 */
module.exports.mahabhuta.addMahafunc(
        function($, metadata, dirty, done) {
			var elements = [];
			$('open-graph-promote-images').each(function(i,elem){ elements.push(elem); });
			if (elements.length <= 0) return done();
        	log('open-graph-promote-images');
			async.eachSeries(elements,
			function(element, next) {
				$(element).remove();
				var imgz = [];
				var selector = $(element).attr('root')
						? ($(element).attr('root') +' img')
						: 'img';
				$(selector).each(function(i, elem) { imgz.push(elem); });
				async.eachSeries(imgz,
				function(img, next2) {
					var imgurl = $(img).attr('src');
					if (imgurl.match(/\/img\/extlink.png/)
					 || imgurl.match(/\/img\/rss_button.png/)
					 || imgurl.match(/\/img\/rss_button.gif/)) {
						// Ignore these images
					} else {
						$(img).addClass('metaog-promote');
					}
					next2();

				}, function(err) {
					if (err) next(err);
					else next();
				});
			}, function(err) {
				if (err) { error(err); done(err); }
				else { done(); }
			});
        });

/** Handle phase 2 of promoting image href's as og:image meta tags. */
module.exports.mahabhuta.addMahafunc(
        function($, metadata, dirty, done) {
			if ($('html head').get(0)) {
				var elements = [];
				$('img.metaog-promote').each(function(i,elem) {
					elements.push(elem);
				});
				if (elements.length <= 0) return done();
				log('img.metaog-promote');
				async.eachSeries(elements,
				function(element, next) {
					$(element).removeClass('metaog-promote');
					var href = $(element).attr('src');
					if (href && href.length > 0) {
						var pHref = url.parse(href);
						// In case this is a site-relative URL, fix it up
						// to have the full URL.
						if (! pHref.host) {
							if (pHref.path.match(/^\//)) {
								href = metadata.config.root_url +'/'+ href;
							} else {
								var pRendered = url.parse(metadata.rendered_url);
								var dirRender = path.dirname(pRendered.path);
								var pRootUrl = url.parse(metadata.config.root_url);
								pRootUrl.pathname = dirRender +'/'+ href;
								href = url.format(pRootUrl);
							}
						}
					}
					akasha.partial(metadata.config, 'ak_metatag.html.ejs', {
						tagname: 'og:image',
						tagcontent: href
					})
					.then(txt => {
						$('head').append(txt);
						next();
					})
					.catch(err => { next(err); });
				}, function(err) {
					if (err) { error(err); done(err); }
					else { done(); }
				});
			} else done();
        });

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
						} */

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
            			} */
            			next();
					}
				} else next();
                });
            },
            err => {
				if (err) done(err);
				else done();
        	});
        });
