// http://code.google.com/intl/en/apis/talk/jep_extensions/gmail.html

Strophe.addConnectionPlugin('googleSharedStatus', {
	_connection: null,

	_callbackSharedStatusChanged: null,

	init: function(connection) {
		this._connection = connection;
		Strophe.addNamespace('GOOGLE_SHARED_STATUS', 'google:shared-status');
	},

	addSharedStatusChangedHandler: function(callback) {
		this._callbackSharedStatusChanged = callback;
	},

	/*
	 * requestSharedStatusList, 同时注册为shared-status-awared client
	 */
	requestSharedStatusList: function(callback) {
		this._connection.addHandler(this._sharedStatusChanged.bind(this), Strophe.NS.GOOGLE_SHARED_STATUS, 'iq');

		var iq = $iq({type: 'get', id: this._connection.getUniqueId('ss')}).c('query', {xmlns: Strophe.NS.GOOGLE_SHARED_STATUS, version: 2});

		this._connection.sendIQ(iq, function(response) {
			response = Strophe.Mixin.apply(response, this.mixins.GoogleSharedStatus) 
			callback(response);
			this._sharedStatusChanged(response);
		}.bind(this));
	},

	changeSharedStatus: function(show, status) {
		this._changeSharedStatus(show, status, false);
	},

	goInvisible: function() {
		this._changeSharedStatus('', '', true);
	},

	_sharedStatusChanged: function(iq) {
		iq = Strophe.Mixin.apply(iq, this.mixins.GoogleSharedStatus) 

		var attributes = iq.getSharedStatus();
		this._connection.googleSharedStatus.attributes = attributes;

		if (this._callbackSharedStatusChanged) {
			this._callbackSharedStatusChanged(attributes);
		}

		return true;
	},

	_changeSharedStatus: function(show, status, invisible) {
		var iq = $iq({type: 'set', to: Strophe.getBareJidFromJid(this._connection.jid), id: this._connection.getUniqueId('ss')}).c('query').attrs({xmlns: Strophe.NS.GOOGLE_SHARED_STATUS, 'version': 2});

		if (show) {
			iq.c('show').t(show).up();
			iq.c('status').t(status).up();
		}
		
		if (invisible) {
			iq.c('invisible').attrs({value: 'true'});
		} else {
			iq.c('invisible').attrs({value: 'false'});
		}

		if (this._connection.googleSharedStatus.attributes && this._connection.googleSharedStatus.attributes.statusLists) {
			var statusLists = this._connection.googleSharedStatus.attributes.statusLists;
			for (var i in statusLists) {
				var statuses = statusLists[i].statuses;
				iq.up();
				iq.c('status-list').attrs({show: statusLists[i].show});
				for (var j in statuses) {
					iq.c('status').t(statuses[j]);
				}
			}
			this._connection.send(iq);
		}
	},

	mixins: (function(){
		var GoogleSharedStatus = Strophe.Mixin.apply({
			getSharedStatus: function() {
				var query = this.getQuery();

				var statusMinVer = query.getAttribute('status-min-ver');
				var statusMax = query.getAttribute('status-max');
				var statusListMax = query.getAttribute('status-list-max');
				var statusListContentsMax = query.getAttribute('status-list-contents-max');

				var show = new Strophe.Parser(query).find('show').text() || '';
				var status = new Strophe.Parser(query).find('status').text() || '';

				var invisible = 'true' == (new Strophe.Parser(query).find('invisible').get(0).getAttribute('value'));

				var statusLists = [];
				new Strophe.Parser(query).find('status-list').each(function(statusList) {
					var show = statusList.getAttribute('show');
					var list = {};
					var statuses = [];
					new Strophe.Parser(statusList).find('status').each(function(status) {
						statuses.push(status.textContent);
					});

					list.show = show;
					list.statuses = statuses;

					statusLists.push(list);
				});

				return {
					show: show,
					status: status,
					statusListContentsMax: statusListContentsMax,
					statusMax: statusMax,
					statusMinVer: statusMinVer,
					statusListMax: statusListMax,
					statusLists: statusLists,
					invisible: invisible,
				}
			},
			getSyncingStatus: function() {
				var from = Strophe.getBareJidFromJid(this.getFrom());
				var to = Strophe.getBareJidFromJid(this.getTo());

				if (from == to) {

					var show = 'chat',
					status = '',
					type = this.getType();

					if (type) {
						// unavailable
						// do nothing
					} else {
						// 一般状态
						var show = new Strophe.Parser(this).find('show').text();
						var status = new Strophe.Parser(this).find('status').text();

						if (this._callbackPresenceChanged) {
							this._callbackPresenceChanged(show, status);
						}
					}
				}
			},
		}, Strophe.Mixin.IQ);

		return {GoogleSharedStatus: GoogleSharedStatus};
	})()
});
