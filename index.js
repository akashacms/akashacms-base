/**
 *
 * Copyright 2014-2015 David Herron
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

const path = require('path');
const util = require('util');
const url   = require('url');
const async = require('async');
const akasha = require('../akasharender');

const log   = require('debug')('akasha:base-plugin');
const error = require('debug')('akasha:error-base-plugin');


module.exports = class BasePlugin extends akasha.Plugin {
	constructor() {
		super("akashacms-base");
	}
	
	configure(config) {
        this._config = config;
		config.addPartialsDir(path.join(__dirname, 'partials'));
		config.addLayoutsDir(path.join(__dirname, 'layout'));
		config.addAssetsDir(path.join(__dirname, 'assets'));
		config.addMahabhuta(module.exports.mahabhuta);
	}

}


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

module.exports.doHeaderMetaSync = function(metadata) {
    return akasha.partialSync(metadata.config, "ak_headermeta.html.ejs", fixHeaderMeta(metadata));
};

module.exports.mahabhuta = [
		function($, metadata, dirty, done) {
            var titles = [];
            $('ak-page-title').each(function(i, elem) { titles.push(elem); });
			if (titles.length <= 0) return done();
        	log('ak-page-title');
            async.eachSeries(titles,
            (titleTag, next) => {
            	var title;
				if (typeof metadata.pagetitle !== "undefined") {
					title = metadata.pagetitle;
				} else if (typeof metadata.title !== "undefined") {
					title = metadata.title;
				} else title = "";
				akasha.partial(metadata.config, "ak_titletag.html.ejs", {
					title: title
				})
				.then(rendered => {
					$(titleTag).replaceWith(rendered);
					next();
				})
				.catch(err => { error(err); next(err); });
            },
            (err) => {
            	if (err) {
					error('ak-page-title Errored with '+ util.inspect(err));
					done(err);
            	} else done();
            });
        },
		
		function($, metadata, dirty, done) {
            var metas = [];
            $('ak-header-metatags').each((i, elem) => { metas.push(elem); });
			if (metas.length <= 0) return done();
        	log('ak-header-metatags');
            async.eachSeries(metas,
            function(meta, next) {
            	akDoHeaderMeta(metadata)
				.then(rendered => {
					$(meta).replaceWith(rendered);
					next();
            	})
				.catch(err => {
					error('ak-header-metatags ERROR '+ util.inspect(err));
					next(err);
				});
            },
            function(err) {
				if (err) {
					error('ak-header-metatags Errored with '+ util.inspect(err));
					done(err);
				} else done();
            });
        },
        
		function($, metadata, dirty, done) {
            var elements = [];
            $('ak-header-linkreltags').each((i, elem) => { elements.push(elem); });
			if (elements.length <= 0) return done();
        	log('ak-header-linkreltags');
            async.eachSeries(elements,
            (element, next) => {
                if (metadata.config.akBase && metadata.config.akBase.linkRelTags) {
                    metadata.config.akBase.linkRelTags.forEach(
					lrtag => {
					    akasha.partial(metadata.config, "ak_linkreltag.html.ejs", {
					        relationship: lrtag.relationship,
					        url: lrtag.url
					    })
						.then(rendered => {
    						if (err) { error(err); next(err); }
    						else { $(element).replaceWith(rendered); next(); }
    					})
						.catch(err => { next(err); });
                    });
                } else {
					$(element).remove();
					next();
                }
            },
            (err) => {
				if (err) {
					error('ak-header-linkreltags Errored with '+ util.inspect(err));
					done(err);
				} else done();
            });
        },
		
		function($, metadata, dirty, done) {
            var elements = [];
            $('ak-header-canonical-url').each((i, elem) => { elements.push(elem); });
			if (elements.length <= 0) return done();
        	log('ak-header-canonical-url');
            async.eachSeries(elements,
            (element, next) => {
				if (typeof metadata.rendered_url !== "undefined") {
					akasha.partial(metadata.config, "ak_linkreltag.html.ejs", {
						relationship: "canonical",
						url: metadata.rendered_url
					})
					.then(rendered => {
						if (err) { error(err); next(err); }
						else { $(element).replaceWith(rendered); next(); }
					})
					.catch(err => { next(err); });
				}
				else {
					$(element).remove();
					next();
				}
            },
            function(err) {
				if (err) {
					error('ak-header-canonical-url Errored with '+ util.inspect(err));
					done(err);
				} else done();
            });
        },
		
		function($, metadata, dirty, done) {
            var elements = [];
            $('ak-siteverification').each((i, elem) => { elements.push(elem); });
			if (elements.length <= 0) return done();
        	log('ak-siteverification');
            async.eachSeries(elements,
            (element, next) => {
				if (metadata.config.google && typeof metadata.config.google.siteVerification !== "undefined") {
				    akasha.partial(metadata.config, "ak_siteverification.html.ejs",
					{ googleSiteVerification: metadata.config.google.siteVerification })
					.then(html => {
						if (err) return next(err);
						$(element).replaceWith(html);
						next();
					})
					.catch(err => { next(err); });
				} else {
					$(element).remove();
            		next();
				}
            },
            (err) => {
				if (err) {
					error('ak-siteverification Errored with '+ util.inspect(err));
					done(err);
				} else done();
            });
        },
		
		function($, metadata, dirty, done) {
            var elements = [];
            $('ak-google-analytics').each((i, elem) => { elements.push(elem); });
			if (elements.length <= 0) return done();
        	log('ak-google-analytics');
            async.eachSeries(elements,
            (element, next) => {
				if (typeof config.google.analyticsAccount !== "undefined" && typeof config.google.analyticsDomain !== "undefined") {
				    akasha.partial(metadata.config, "ak_googleAnalytics.html.ejs", {
						googleAnalyticsAccount: config.google.analyticsAccount,
						googleAnalyticsDomain: config.google.analyticsDomain
					})
					.then(html => {
						$(element).replaceWith(html);
						next();
					})
					.catch(err => { next(err); });
				}
				else {
					$(element).remove();
            		next();
				}
            },
            function(err) {
				if (err) {
					error('ak-google-analytics Errored with '+ util.inspect(err));
					done(err);
				} else done();
            });
        },
		
		function($, metadata, dirty, done) {
            var elements = [];
            $('ak-sitemapxml').each(function(i, elem) { elements.push(elem); });
			if (elements.length <= 0) return done();
        	log('ak-sitemapxml');
            async.eachSeries(elements,
            function(element, next) {
				akasha.partial(metadata.config, "ak_sitemap.html.ejs", {  })
				.then(html => {
					$(element).replaceWith(html);
					next();
				})
				.catch(err => { next(err); });
            },
            function(err) {
				if (err) {
					error('ak-sitemapxml Errored with '+ util.inspect(err));
					done(err);
				} else done();
            });
        },
		
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
        },
		
		function($, metadata, dirty, done) {
			var elements = [];
			$('publication-date').each(function(i, elem) { elements.push(elem); });
			if (elements.length <= 0) return done();
        	log('publication-date');
			async.eachSeries(elements,
			function(element, next) {
				log(metadata.publicationDate);
				if (metadata.publicationDate) {
					akasha.partial(metadata.config, "ak_publdate.html.ejs", {
						publicationDate: metadata.publicationDate
					})
					.then(html => {
						$(element).replaceWith(html);
						next();
					})
					.catch(err => { next(err); });
				} else next();
			}, function(err) {
				if (err) { error(err); done(err); }
				else { done(); }
			});
        },
		
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
        },
        
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
        },
        				
        /** Handle phase 2 of promoting image href's as og:image meta tags. */
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
        },
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
        }
];
