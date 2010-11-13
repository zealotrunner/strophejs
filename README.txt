NEW: IE support (all tests pass in IE 6, 7, 8)

This fork of Strophe contains a framework that makes it easy to parse
and handle incoming XML stanzas.  Several plugins have been built using
this framework. They reside in plugins/, along with corresponding tests
in tests/:

mixin.support.js - the mixin framework that makes the other plugins possible (this is a required include for the other plugins)
plugin.0004.js - dataforms 
plugin.0030.js - disco#items support
plugin.0045.js - MUC support for basics and then some
plugin.0050.js - some support for sending and receiving adhoc stanzas
plugin.0060.js - comprehensive PubSub support
plugin.roster.js - roster and presence subscription management
plugin.cm.js - Connection manager: used to actively detect disconnections and reconnect.  Also guarantees that stanzas sent while disconnected are not lost and resent when connection is re-established.  Currently, breaks Strophe when this plugin is loaded but not enabled.

No modifications to the core Strophe library are made and it is periodically synced it with metajack's upstream.

See the corresponding tests (and plugin source) for sample usage.  Examples to come.

The plugins' APIs will be kept as stable as possible, but are subject 
to change as some plugins are still under active development 
(release early, release often!).

These contributions are licensed under the MIT license.


---
Strophe.js is a JavaScript library for speaking XMPP via BOSH (XEP 124
and 206).  It is licensed under the MIT license, except for the files
base64.js and md5.js, which are licensed as public domain and
BSD (see these files for details).

It has been tested on Firefox 1.5, 2.x, and 3.x, IE 6, 7, and 8, Safari, Mobile
Safari, Chrome, and it should also work on the mobile Opera browser as
well as the desktop Opera browser.

The homepage for Strophe is http://code.stanziq.com/strophe.

The book Professional XMPP Programming with JavaScript and jQuery is
also available, which covers Strophe in detail in the context of web
applications. You can find more information at
http://professionalxmpp.com.
