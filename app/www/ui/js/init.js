// catch server error page (404, 403, timeOut and other)
Ext.Ajax.on('requestexception', function(conn, response, options) {
	if (options.doNotShowError == true)
		return;

	if (response.status == 403) {
		Scalr.state.userNeedLogin = true;
		Scalr.event.fireEvent('redirect', '#/guest/login', true);
	} else if (response.status == 404) {
		Scalr.message.Error('Page not found.');
	} else if (response.timedout == true) {
		Scalr.message.Error('Server didn\'t respond in time. Please try again in a few minutes.');
	} else if (response.aborted == true) {
		Scalr.message.Error('Request was aborted by user.');
	} else {
		if (Scalr.timeoutHandler.enabled) {
			Scalr.timeoutHandler.undoSchedule();
			Scalr.timeoutHandler.run();

			//Scalr.timeoutHandler.forceCheck = true;
			//Scalr.timeoutHandler.restart();
		}
		Scalr.message.Error('Cannot proceed your request at the moment. Please try again later.');
	}
});

Scalr.storage = {
	prefix: 'scalr-',
	getStorage: function (session) {
		session = session || false;
		if (session)
			return sessionStorage;
		else
			return localStorage;
	},
	getName: function (name) {
		return this.prefix + name;
	},
	listeners: {},

	/**
	 * Decodes a string previously encoded with {@link #encodeValue}.
	 * @param {String} value The value to decode
	 * @return {Object} The decoded value
	 */
	decodeValue : function(value){

		// a -> Array
		// n -> Number
		// d -> Date
		// b -> Boolean
		// s -> String
		// o -> Object
		// -> Empty (null)

		var me = this,
			re = /^(a|n|d|b|s|o|e)\:(.*)$/,
			matches = re.exec(unescape(value)),
			all,
			type,
			value,
			keyValue;

		if(!matches || !matches[1]){
			return null; // non state
		}

		type = matches[1];
		value = matches[2];
		switch (type) {
			case 'e':
				return null;
			case 'n':
				return parseFloat(value);
			case 'd':
				return new Date(Date.parse(value));
			case 'b':
				return (value == '1');
			case 'a':
				all = [];
				if(value != ''){
					Ext.each(value.split('^'), function(val){
						all.push(me.decodeValue(val));
					}, me);
				}
				return all;
			case 'o':
				all = {};
				if(value != ''){
					Ext.each(value.split('^'), function(val){
						keyValue = val.split('=');
						all[keyValue[0]] = me.decodeValue(keyValue[1]);
					}, me);
				}
				return all;
			default:
				return value;
		}
	},

	/**
	 * Encodes a value including type information.  Decode with {@link #decodeValue}.
	 * @param {Object} value The value to encode
	 * @return {String} The encoded value
	 */
	encodeValue : function(value){
		var flat = '',
			i = 0,
			enc,
			len,
			key;

		if (value == null) {
			return 'e:1';
		} else if(typeof value == 'number') {
			enc = 'n:' + value;
		} else if(typeof value == 'boolean') {
			enc = 'b:' + (value ? '1' : '0');
		} else if(Ext.isDate(value)) {
			enc = 'd:' + value.toGMTString();
		} else if(Ext.isArray(value)) {
			for (len = value.length; i < len; i++) {
				flat += this.encodeValue(value[i]);
				if (i != len - 1) {
					flat += '^';
				}
			}
			enc = 'a:' + flat;
		} else if (typeof value == 'object') {
			for (key in value) {
				if (typeof value[key] != 'function' && value[key] !== undefined) {
					flat += key + '=' + this.encodeValue(value[key]) + '^';
				}
			}
			enc = 'o:' + flat.substring(0, flat.length-1);
		} else {
			enc = 's:' + value;
		}
		return escape(enc);
	},

	get: function (name, session) {
		var storage = this.getStorage(session);
		return this.decodeValue(storage.getItem(this.getName(name)));
	},
	set: function (name, value, session) {
		var storage = this.getStorage(session);
		storage.setItem(this.getName(name), this.encodeValue(value));
	},
	clear: function (name, session) {
		var storage = this.getStorage(session);
		storage.removeItem(this.getName(name));
	}
};

window.addEventListener('storage', function (e) {
	var name = e.key.replace(Scalr.storage.prefix, '');
	if (Scalr.storage.listeners[name]) {
		Scalr.storage.listeners[name](Scalr.storage.get(name));
	}
}, false);


Scalr.event = new Ext.util.Observable();
/*
 * update - any content on page was changed (notify): function (type, arguments ...)
 * close - close current page and go back
 * redirect - redirect to link: function (href, keepMessages, force)
 * reload - browser page
 * refresh - current application
 * lock - lock to switch current application (override only throw redirect with force = true)
 * unlock - unlock ...
 * clear - clear application from cache (close and reload)
 */
Scalr.event.addEvents('update', 'close', 'redirect', 'reload', 'refresh', 'resize', 'lock', 'unlock', 'maximize', 'clear');

Scalr.event.on = Ext.Function.createSequence(Scalr.event.on, function (event, handler, scope) {
	if (event == 'update' && scope)
		scope.on('destroy', function () {
			this.un('update', handler, scope);
		}, this);
});

Scalr.cache = {};
Scalr.regPage = function (type, fn) {
	Scalr.cache[type] = fn;
};

Scalr.state = {
	pageSuspend: false,
	pageSuspendForce: false,
	pageRedirectParams: {},
	userNeedLogin: false
};

Scalr.flags = {};

Scalr.version = function (checkVersion) {
	try {
		var version = Scalr.InitParams.ui.version;
	} catch (e) {}
	return ( !version || version == checkVersion) ? true : false;
};

Ext.getBody().setStyle('overflow', 'hidden');
Ext.tip.QuickTipManager.init();

Ext.state.Manager.setProvider(new Ext.state.LocalStorageProvider({ prefix: 'scalr-' }));

Scalr.event.on('close', function(force) {
	Scalr.message.SetKeepMessages(true);
	Scalr.state.pageSuspendForce = Ext.isBoolean(force) ? force : false;

	if (history.length > 1)
		history.back();
	else
		document.location.href = "#/dashboard";
});

Scalr.event.on('redirect', function(href, force, params) {
	Scalr.state.pageSuspendForce = Ext.isBoolean(force) ? force : false;
	Scalr.state.pageRedirectParams = params || {};
	document.location.href = href;
});

Scalr.event.on('lock', function() {
	Scalr.state.pageSuspend = true;
	Scalr.application.disabledDockedToolbars(true);
});

Scalr.event.on('unlock', function() {
	Scalr.state.pageSuspend = false;
	Scalr.application.disabledDockedToolbars(false);
});

Scalr.event.on('reload', function () {
	document.location.reload();
});

Scalr.event.on('refresh', function (forceReload) {
	// @TODO: forceReload
	window.onhashchange(true);
});

Scalr.event.on('resize', function () {
	Scalr.application.getLayout().onOwnResize();
});

Scalr.event.on('maximize', function () {
	var options = Scalr.application.getLayout().activeItem.scalrOptions;
	options.maximize = options.maximize == 'all' ? '' : 'all';
	Scalr.application.getLayout().onOwnResize();
});

Scalr.event.on('clear', function (url) {
	var hashchange = false;

	Scalr.application.items.each(function () {
		if (this.scalrRegExp && this.scalrRegExp.test(url)) {
			if (Scalr.application.getLayout().activeItem == this)
				hashchange = true;

			this.close();
			return false;
		}
	});

	if (hashchange)
		window.onhashchange(true);
});

Ext.Ajax.timeout = 60000;
