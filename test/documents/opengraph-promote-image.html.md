---
title: Opengraph Promote Images test
layout: default.html.ejs
---

<img src="http://foo.bar/this-should-be-promoted-default-action.jpg">

<img src="http://foo.bar/should-not-be-promoted-class.jpg" class="opengraph-no-promote">

<img src="http://foo.bar/should-be-promoted-class.jpg" class="opengraph-promote">

Put this a second time to see what happens

<img src="http://foo.bar/this-should-be-promoted-default-action.jpg">

These should not be promoted because of special rules


<img src="http://foo.bar/img/extlink.png">

<img src="http://foo.bar/img/rss_button.png">

<img src="http://foo.bar/img/rss_button.gif">
