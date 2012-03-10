// http://xmpp.org/extensions/xep-0136.html
//
Strophe.addConnectionPlugin('archive', {
  _connection: null,

  init: function(connection) {
    this._connection = connection;
    Strophe.addNamespace('DELAY', 'jabber:x:delay');
    //Strophe.addNamespace('ARCHIVE', 'http://www.xmpp.org/extensions/xep-0136.html#ns');
    Strophe.addNamespace('ARCHIVE', 'urn:xmpp:archive');
  },

  listCollections: function(jid, rsm, callback) {
    //var xml = $iq({type: 'get', id: this._connection.getUniqueId('list')}).c('list', {xmlns: Strophe.NS.ARCHIVE, 'with': jid, 'start': '1469-07-21T02:00:00Z'});
    var xml = $iq({type: 'get', id: this._connection.getUniqueId('pref')}).c('pref', {xmlns: Strophe.NS.ARCHIVE});
    if (rsm) { xml = xml.cnode(rsm.toXML()); }
    console.error(xml.tree());
    this._connection.sendIQ(xml, this._handleListConnectionResponse.bind(this, callback), function(s) {console.warn(s)});
  },
  
  _handleListConnectionResponse: function(callback, stanza) {
	 console.error('ssssss');
	console.error(stanza);
    var collections = [];
    var chats = stanza.getElementsByTagName('chat');
    for (var ii = 0; ii < chats.length; ii++) {
      var jid = chats[ii].getAttribute('with');
      var start = chats[ii].getAttribute('start');
      collections.push(new Strophe.ArchivedCollection(this._connection, jid, start));
    }
    var responseRsm = new Strophe.RSM({xml: stanza.getElementsByTagName('set')[0]});
    callback(collections, responseRsm);
  }
});

Strophe.ArchivedCollection = function(connection, jid, start) {
  this.connection = connection;
  this.jid = jid;
  this.start = start;
  this.startDate = new Date();
  this.startDate.setISO8601(start);
};

Strophe.ArchivedCollection.prototype = {
  retrieveMessages: function(rsm, callback) {
    var builder = $iq({type: 'get', id: this.connection.getUniqueId('retrieve')}).c('retrieve', {xmlns: Strophe.NS.ARCHIVE, 'with': this.jid, start: this.start});
    if (rsm) { builder = builder.cnode(rsm.toXML()); }
    this.connection.sendIQ(builder, function(stanza) {
      var messages = [];
      var myJid = Strophe.getBareJidFromJid(this.connection.jid);
      var responseRsm;
      var timestamp = this.startDate;
      var msgTimestamp;
      var chat = stanza.getElementsByTagName('chat')[0];
      var element = chat.firstChild;
      while (element) {
        switch (element.tagName) {
        case 'to':
          msgTimestamp = this._incrementTimestampForMessage(timestamp, element);
          messages.push(new Strophe.ArchivedMessage(msgTimestamp, myJid, this.jid, Strophe.getText(element.getElementsByTagName('body')[0])));
          break;
        case 'from':
          msgTimestamp = this._incrementTimestampForMessage(timestamp, element);
          messages.push(new Strophe.ArchivedMessage(msgTimestamp, this.jid, myJid, Strophe.getText(element.getElementsByTagName('body')[0])));
          break;
        case 'set':
          responseRsm = new Strophe.RSM({xml: element});
          break;
        default:
          break;
        }
        element = element.nextSibling;
      }
      callback(messages, responseRsm);
    }.bind(this));
  },

  _incrementTimestampForMessage: function(timestamp, element) {
    var secs = element.getAttribute('secs');
    var newTimestamp = new Date();
    newTimestamp.setTime(timestamp.getTime() + Number(secs) * 1000);
    return newTimestamp;
  }
};

Strophe.ArchivedMessage = function(timestamp, from, to, body) {
  this.timestamp = timestamp;
  this.from = from;
  this.to = to;
  this.body = body;
};

Strophe.ArchivedMessage.prototype = {
};
