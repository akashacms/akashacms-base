---
layout: plugin-documentation.html.ejs
title: AskashaCMS "base" plugin documentation - Foundational support for website construction
---

The `@akashacms/plugins-base` plugin provides foundation-level support for building websites.  This includes useful partials, and a long list of Mahabhuta tags.  They work together to provide a comprehensive base for presenting website content.  

<toc-group>
<toc-item anchor="#install" title="Installation" additional-classes="bg-light" text-classes="text-dark"></toc-item>
<toc-item anchor="#config" title="Configuration" additional-classes="bg-light" text-classes="text-dark"></toc-item>
<toc-item anchor="#custom-tags" title="Custom tags" additional-classes="bg-light" text-classes="text-dark">
    <toc-group>
    <toc-item anchor="#metadata" title="Metadata in page header" additional-classes="bg-light" text-classes="text-dark"></toc-item>
    <toc-item anchor="#link-rel" title="Generating link rel= tags in header" additional-classes="bg-light" text-classes="text-dark"></toc-item>
    <toc-item anchor="#canonical-url" title="Generate a canonical URL in header" additional-classes="bg-light" text-classes="text-dark"></toc-item>
    <toc-item anchor="#mktoc" title="Generate a Table of Contents for a page" additional-classes="bg-light" text-classes="text-dark"></toc-item>
    <toc-item anchor="#publdate" title="Show the Publication Date on the page" additional-classes="bg-light" text-classes="text-dark"></toc-item>
    <toc-item anchor="#opengraph" title="Promote images with OpenGraph tags" additional-classes="bg-light" text-classes="text-dark"></toc-item>
    <toc-item anchor="#opengraph-single" title="Promoting a single image for OpenGraph" additional-classes="bg-light" text-classes="text-dark"></toc-item>
    </toc-group>
</toc-item>
<toc-item anchor="#sitemaps" title="XML Sitemaps" additional-classes="bg-light" text-classes="text-dark"></toc-item>
</toc-group>


<h1 id="install">Installation</h1>

With an AkashaCMS website setup, add the following to `package.json`

```
  "dependencies": {
    ...
    "@akashacms/plugins-base": "^0.9.x",
    ...
  }
```

This version number matches that of AkashaRender.

Once added to `package.json` run:

```shell
$ npm install
```

<h1 id="config">Configuration</h1>

In `config.mjs` for the website:

```js
import { BasePlugin } from '@akashacms/plugins-base';
// ...
config
    // ...
    .use(BasePlugin, {
        generateSitemapFlag: true
    })
    // ...
```

The `generateSitemapFlag` flag causes an XML Sitemap to be generated in the file `/sitemap.xml`. See the XML Sitemaps section below.

<h1 id="custom-tags">Custom tags</h1>

<h2 id="metadata">Metadata in page header</h2>

There's a lot of metadata, Open Graph etc, that can be put into the `<head>` section.  These tags are useful for customizing the presentation in search engines or on social media websites.

The `<ak-header-metatags>` tag generates most of these tags using page metadata.  This tag renders the `ak_headermeta.html.njk` partial.  Consult that file for details.

One method for avoiding using the custom tag is to directly invoke the `partial` function.  In an EJS template

```html
<%- partialSync('ak_headermeta.html.njk') %>
```

In Nunjucks templates we can do this:

```html
{% akheadermetatags %}
{% endakheadermetatags %}
```

<h2 id="link-rel">Generating link rel= tags in header</h2>

Header tags of the pattern `<link rel="..." href="..."/>` are used for many purposes.  AkashaCMS-Base supports simplified method to generate these tags.

The `<ak-header-linkreltags>` tag generates the tags from data provided in the site configuration.

For site-wide link/rel tags use this in `config.js`:

```
config.plugin("@akashacms/plugins-base")
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

In Nunjucks templates we can do this:

```html
{% aklinkreltags %}
{% endaklinkreltags %}
```

From the EJS template engine do this:

```html
<%- config.plugin("@akashacms/plugins-base").doLinkRelTags() %>
```

The other template engines have a different syntax for invoking this function.

<h2 id="canonical-url">Generate a canonical URL in header</h2>

The `canonical` link tag defines the most correct official URL for the page.  It's used by search engines to disambiguate pages that might appear under multiple URL's.

The `<ak-header-canonical-url>` tag generates this tag using the `ak_linkreltag.html.ejs` partial.

In Nunjucks templates we can do this:

```html
{% akcanonicalurl %}
{% endakcanonicalurl %}
```

In an EJS template

```html
<%- partialSync('ak_linkreltag.html.ejs') %>
```

<h2 id="mktoc">Generate a Table of Contents for a page</h2>

Many websites have a "table of contents" block at the top of a page to help navigate the page.  It's simply a list (possibly nested list) of links to locations within the page.

With `<toc-group>` we generate a container for such a table of contents.  Attributes are:

* `template` for an alternative to the standard template (`ak_toc_group_element.html.njk`)
* `id` for the ID of the `toc-group`
* `additional-classes` for additional class declarations to add to the `class` attribute

This element is expected to contain `<toc-item>` elements that will be the links to locations within the page.  Attributes to this element are:

* `template` for an alternative to the standard template (`ak_toc_group_element.html.njk`)
* `id` for the ID of the `toc-group`
* `additional-classes` for additional class declarations to add to the `class` attribute
* `text-classes` supports adding class names to the `class` attribute of the `<a>` tag
* `title` for the anchor text in the generated link
* `anchor` for the href to use in the generated link

Any additional markup will be inserted into the generated list item after the link.  The primary use for this will be to have a nested `<toc-group>`.

To implement a "_return to top_" link, simply scatter something like this throughout the page:

```html
<div style="clear: both">
    <a href="#ID-FOR-TOC-GROUP">[return to top]</a>
</div>
```

The `<toc-group>` must, in this case, have an `id` attribute.  Your link would use that `id` in the `href` as shown here.

<h2 id="publdate">Show the Publication Date on the page</h2>

It's often desirable to show the publication date for a page.  It's often desirable for the page metadata to include the `publicationDate` for a variety of purposes.  For example the `akashacms-blog-podcast` plugin uses the publicationDate to sort content.

The page can include `publicationDate` in its metadata.  If missing, AkashaRender substitutes in the last modification date of the content file.

The tag `<publication-date>` formats that date through the `ak_publdate.html.njk` partial.

In Nunjucks templates we can do this:

```html
{% akpublicationdate %}
{% endakpublicationdate %}
```

In an EJS template

```html
<%- partialSync('ak_publdate.html.njk') %>
```

<h2 id="opengraph">Promote images with OpenGraph tags</h2>

The the banner image in social media website posts is derived from images listed in OpenGraph tags.  We all want our web content to have a good appearance on social media sites.  Having a good quality image is key to that goal.

The `<open-graph-promote-images>` tag causes a process to occur which searches for `<img>` tags.  The URL's are collected and added to the header as OpenGraph meta tags.

By default the search is conducted over the entire page.  This is likely undesired, since it will scoop up every last image.  Instead you probably want to constrain the search to the area of the page containing its primary content.  The `root=` attribute can contain a jQuery selector that will constrain the search.

For example if your primary content is within an `article` tag (as it should be), you would use:

```
<open-graph-promote-images root="article"></open-graph-promote-images>
```

<h2 id="opengraph-single">Promoting a single image for OpenGraph</h2>

The previous tag handles promoting multiple images from a given section of a page.  If you have a single image to promote, this tag will do the trick.

```
<opengraph-image href="... image href ..."/>
```

<h1 id="sitemaps">XML Sitemaps</h1>

The sitemap will list any file rendered using HTMLRenderer.  See https://www.sitemaps.org/index.html for information about XML Sitemaps.
