// http://code.google.com/intl/en/apis/talk/jep_extensions/gmail.html

Strophe.addConnectionPlugin('gmailNotification', {
	_connection: null,
	_onNewMails: null,

	init: function(connection) {
		this._connection = connection;
		Strophe.addNamespace('GMAIL_NOTIFY', 'google:mail:notify');

		this._listen();
	},

	addNewMailHandler: function(handler) {
		this._onNewMails = handler;
	},
	
	requestNewMails: function(callback, query, newerThan, newerThanTid) {
		var queryNode = {xmlns: Strophe.NS.GMAIL_NOTIFY};
		if (query) {
			queryNode.q = query;
		}
		if (newerThan) {
			queryNode['newer-than-time'] = newerThan;
		}
		if (query) {
			queryNode['newer-than-tid'] = newerThanTid;
		}

		var iq = $iq({type: 'get', id: this._connection.getUniqueId('mail-request')}).c('query', queryNode);

		this._connection.sendIQ(iq, function(response) {
			var result = {};
			Strophe.forEachChild(response, 'mailbox', function (mailbox) {
				result.threads = [];
				result.url = mailbox.getAttribute('url');
				result.totalMatched = mailbox.getAttribute('total-matched');
				result.resultTime = mailbox.getAttribute('result-time');

				Strophe.forEachChild(mailbox, 'mail-thread-info', function(mailThreadInfo) {
					var thread = {};
					thread.tid = mailThreadInfo.getAttribute('tid');
					thread.url = mailThreadInfo.getAttribute('url');

					Strophe.forEachChild(mailThreadInfo, 'senders', function(senders) {
						thread.senders = [];
						Strophe.forEachChild(senders, 'sender', function(sender) {
							var tempSender = {};
							tempSender.name = sender.getAttribute('name');
							tempSender.address = sender.getAttribute('address');
							tempSender.originator = sender.getAttribute('originator');
							tempSender.unread = sender.getAttribute('unread');

							thread.senders.push(tempSender);
						});
					});

					Strophe.forEachChild(mailThreadInfo, 'subject', function(subject) {
						thread.subject = Strophe.getText(subject);
					});

					Strophe.forEachChild(mailThreadInfo, 'snippet', function(snippet) {
						thread.snippet = Strophe.getText(snippet);
					});

					result.threads.push(thread);
				});
			});

			callback(result);
		});
	},

	retriveOfflineMessages: function(callback) {
		this.requestNewMails(function(mailbox) {
			callback(mailbox);
		}, 'label:chats');
	},

	_listen: function() {
		this._connection.addHandler(this._onNewMailNotification.bind(this), Strophe.NS.GMAIL_NOTIFY, 'iq');
	},

	// new mail notification
	_onNewMailNotification: function(element) {
		var self = this;
		Strophe.forEachChild(element, 'new-mail', function(childElement) {
			// send result as a response
			var id = element.getAttribute('id');
			self._connection.send($iq({type: 'get', id: id, type: 'result'}));

			if (self._onNewMails) {
				self.requestNewMails(function(mailbox) { 
					(self._onNewMails)(mailbox);
				});
			}
		})

		return true;
	},
});
