---
layout: plugin-documentation.html.ejs
title: AskashaCMS "base" plugin documentation - Foundational support for website construction
---

The `akashacms-base` plugin provides foundation-level support for building websites.  This includes useful partials, and a long list of Mahabhuta tags.  They work together to provide a comprehensive base for presenting website content.  

# Installation

With an AkashaCMS website setup, add the following to `package.json`

```
  "dependencies": {
    ...
    "akashacms-base": ">0.6",
    ...
  }
```

Once added to `package.json` run: `npm install`

# Configuration

In `config.js` for the website:

```
config.use(require('akashacms-base'));

config.plugin("akashacms-base").generateSitemap(config, true);
```

The latter causes an XML Sitemap to be generated in the file `/sitemap.xml`. See the XML Sitemaps section below.

# Custom tags

## Metadata in page header

There's a lot of metadata, Open Graph etc, that can be put into the `<head>` section.  These tags are useful for customizing the presentation in search engines or on social media websites.

The `<ak-header-metatags>` tag generates most of these tags using page metadata.

This tag renders through the `ak_headermeta.html.ejs` partial.  Consult that file for details.

## Generating link rel= tags in header

Header tags of the pattern `<link rel="..." href="..."/>` are used for many purposes.  AkashaCMS-Base supports simplified method to generate these tags

The `<ak-header-linkreltags>` tag generates the tags from data provided in the site configuration.

For site-wide link/rel tags use this in `config.js`:

```
config.plugin("akashacms-base")
    .addLinkRelTag(config, { relationship: "...", url: ".." })
    .addLinkRelTag(config, { relationship: "...", url: ".." });
```

For per-page link/rel tags, use this in the frontmatter:

```
---
...
akbaseLinkRelTags:
  - relationship: "..."
    url: "..."
  - relationship: "..."
    url: "..."
...
---
```

## Generate a canonical URL in header

The `canonical` link tag defines the most correct official URL for the page.  It's used by search engines to disambiguate pages that might appear under multiple URL's.

The `<ak-header-canonical-url>` tag generates this tag using the `ak_linkreltag.html.ejs` partial.  

## Show the Publication Date on the page

It's often desirable to show the publication date for a page.  It's often desirable for the page metadata to include the `publicationDate` for a variety of purposes.  For example the `akashacms-blog-podcast` plugin uses the publicationDate to sort content.

The page can include `publicationDate` in its metadata.  If missing, AkashaRender substitutes in the last modification date of the content file.

The tag `<publication-date>` formats that date through the `ak_publdate.html.ejs` partial.

## Promote images with OpenGraph tags

The the banner image in social media website posts is derived from images listed in OpenGraph tags.  We all want our web content to have a good appearance on social media sites.  Having a good quality image is key to that goal.

The `<open-graph-promote-images>` tag causes a process to occur which searches for `<img>` tags.  The URL's are collected and added to the header as OpenGraph meta tags.

By default the search is conducted over the entire page.  This is likely undesired, since it will scoop up every last image.  Instead you probably want to constrain the search to the area of the page containing its primary content.  The `root=` attribute can contain a jQuery selector that will constrain the search.

For example if your primary content is within an `article` tag (as it should be), you would use:

```
<open-graph-promote-images root="article"></open-graph-promote-images>
```

## Promoting a single image for OpenGraph

The previous tag handles promoting multiple images from a given section of a page.  If you have a single image to promote, this tag will do the trick.

```
<opengraph-image href="... image href ..."/>
```

# XML Sitemaps

The sitemap will list any file rendered using HTMLRenderer.  See https://www.sitemaps.org/index.html for information about XML Sitemaps.
