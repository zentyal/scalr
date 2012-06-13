Ext.define('Ext.layout.container.Scalr', {
	extend: 'Ext.layout.container.Absolute',
	alias: [ 'layout.scalr' ],

	activeItem: null,
	stackItems: [],
	activeModalItem: null,
	stackModalItems: [],
	zIndex: 101,
	firstRun: true,

	initLayout : function() {
		if (!this.initialized) {
			this.callParent();

			this.owner.on('resize', function () {
				this.onOwnResize();
			}, this);

			this.owner.items.on('add', function (index, o) {

				//c.style = c.style || {};
				//Ext.apply(c.style, { position: 'absolute' });

				//Ext.apply(c, { hidden: true });
				o.scalrOptions = o.scalrOptions || {};
				Ext.applyIf(o.scalrOptions, {
					'reload': true, // close window before show other one
					'modal': false, // mask prev window and show new one (false - don't mask, true - mask previous, box - mask all and remember)
					'maximize': '' // maximize which sides (all, (max-height - default))
				});
				// for layout, save width @TODO better
				if (o.width)
					o.minWidth = o.width;

				o.setAutoScroll(true);
				o.scalrDestroy = function () {


					this.destroy();
					/*Ext.create('Ext.fx.Animator', {
					 target: this,
					 keyframes: {
					 '0%': {
					 opacity: 1
					 },
					 '100%': {
					 opacity: 0
					 }
					 },
					 duration: 1000,
					 listeners: {
					 afteranimate: function () {
					 this.destroy();
					 },
					 scope: this
					 }
					 });*/
				};
			});
		}
	},

	setActiveModalItem: function (newPage) {
		if (newPage) {
			this.owner.el.mask();

			if (this.activeModalItem) {
				this.stackModalItems.push(this.activeModalItem);
			}

			this.activeModalItem = newPage;
			this.activeModalItem.on('destroy', function (c) {
				Ext.Array.remove(this.stackModalItems, c);
				if (c == this.activeModalItem) {
					this.activeModalItem = this.stackModalItems.pop();
					if (! this.activeModalItem) {
						this.owner.el.unmask();
						this.onOwnResize();
					}
				}
			}, this);

			this.activeModalItem.doAutoRender();
			this.setSize(this.activeModalItem);
			this.activeModalItem.show();
			this.activeModalItem.el.setStyle({ 'z-index': ++this.zIndex });

		} else {
			this.owner.el.unmask();
		}
	},

	setActiveItem: function (newPage, param) {
		var me = this,
			oldPage = this.activeItem;

		if (this.firstRun) {
			Ext.get('loading').down('div').applyStyles('background-position: 0px 0px');
			Ext.get('loading').remove();
			Ext.get('body-container').applyStyles('visibility: visible');

			this.firstRun = false;
		}

		if (newPage) {
			if (oldPage != newPage) {
				if (oldPage) {
					if (oldPage.scalrOptions.modal) {
						if (newPage.scalrOptions.modal) {
							if (
								newPage.rendered &&
								(parseInt(oldPage.el.getStyles('z-index')['z-index']) == (parseInt(newPage.el.getStyles('z-index')['z-index']) + 1)))
							{
								this.zIndex--;
								//oldPage.el.unmask();
								oldPage.scalrDestroy();
							} else {
								this.zIndex++;
								oldPage.el.mask();
								oldPage.fireEvent('deactivate');
							}
						} else {
							this.zIndex = 101;
							oldPage.scalrDestroy();
							// old window - modal, a new one - no, close all windows with reload = true
							// miss newPage
							if (! newPage.scalrOptions.modal) {
								me.owner.items.each(function () {
									if (this.rendered && !this.hidden && this != newPage && this.scalrOptions.modal != 'box') {
										if (this.scalrOptions.reload == true) {
											//this.el.unmask();
											this.scalrDestroy();
										} else {
											this.el.unmask();
											this.hide();
											this.fireEvent('deactivate');
										}
									}
								});
							}
						}
					} else {
						if (newPage.scalrOptions.modal) {
							oldPage.el.mask();
							oldPage.fireEvent('deactivate');
						} else {
							if (oldPage.scalrOptions.reload) {
								//oldPage.el.unmask();
								oldPage.scalrDestroy();
							} else {
								oldPage.hide();
								oldPage.fireEvent('deactivate');
							}
						}
					}
				}
			} else {
				if (oldPage.scalrOptions.reload) {
					//oldPage.unmask();
					oldPage.scalrDestroy();
					this.activeItem = null;
					return false;
				}
			}

			this.activeItem = newPage;
			this.setSize(this.activeItem);

			if (! newPage.scalrOptions.modal)
				document.title = ((this.activeItem.title ? (this.activeItem.title + ' - ') : '') + 'Scalr CP').replace(/&raquo;/g, '»');

			if (this.activeItem.scalrReconfigureFlag && this.activeItem.scalrReconfigure)
				this.activeItem.scalrReconfigure(param || {});
			else
				this.activeItem.scalrReconfigureFlag = true;

			this.activeItem.show();
			this.activeItem.el.unmask();
			this.activeItem.fireEvent('activate');

			if (this.activeItem.scalrOptions.modal)
				this.activeItem.el.setStyle({ 'z-index': this.zIndex });

			return true;
		}
	},

	setSize: function (comp) {
		var r = this.getTarget().getSize();
		var top = 0, left = 0;

		r.height = r.height - 5; // TEMP FIX
		comp.doAutoRender();

		if (comp.scalrOptions.modal) {
			if (comp.scalrOptions.modal == 'box') {
				top = top + 100;
			} else {
				top = top + 5;
				r.height = r.height - 5 * 2;
			}

			if (comp.scalrOptions.maximize == 'all') {
				left = left + 5;
				r.width = r.width - 5 * 2;
			}
		}

		if (comp.scalrOptions.maximize == 'all') {
			comp.setSize(r);
		} else {
			comp.setWidth(0);
			comp.maxHeight = Math.max(0, r.height - 5*2);
			left = (r.width - comp.getWidth()) / 2;
		}

		comp.setPosition(left, top);

		// TODO: investigate in future, while component doesn't have method updateLayout
		if (Ext.isFunction(comp.updateLayout)) {
			comp.updateLayout();
		}
	},

	onOwnResize: function () {
		if (this.activeModalItem) {
			this.setSize(this.activeModalItem);
		} else if (this.activeItem) {
			this.setSize(this.activeItem);
		}
	}
});

var menu = Scalr.InitParams.menu || [];
menu.unshift({
	xtype: 'tbtext',
		text: '<a title="Home" href="#/dashboard"><img src="/ui/images/icons/scalr_logo_icon_34x26.png"></a>',
	width: 36
});
var size = Ext.get('body-container').getSize();
Scalr.application = Ext.create('Ext.panel.Panel', {
	layout: 'scalr',
	border: 0,
	padding: 5,
	width: size.width,
	height: size.height,
	minWidth: 1000,
	bodyStyle: 'margin-top: 5px; margin-bottom: 5px',
	bodyCls: 'x-docked-noborder-top x-docked-noborder-left',
	dockedItems: [/*{
		xtype: 'toolbar',
		dock: 'top',
		height: 28,
		margin: '0 0 5 0',
		cls: 'scalr-mainwindow-docked-warning',
		padding: 5,
		hidden: ! (Scalr.InitParams['user'] ? Scalr.InitParams['user']['userIsOldPkg'] : false),
		html:
			"You're under an old plan that doesn't allow for metered billing. " +
			"If you want to get access to the new features we recently announced, <a href='#/billing/changePlan'>please upgrade your subscription</a>"
	}, */{
		xtype: 'toolbar',
		dock: 'top',
		height: 45,
		margin: '0 0 5 0',
		cls: 'scalr-mainwindow-docked-warning',
		padding: 5,
		hidden: ! (Scalr.InitParams['user'] ? Scalr.InitParams['user']['userIsPaypal'] : false),
		html:
			"Hey mate, I see that you are using Paypal for your subscription. " +
			"Unfortunately paypal hasn't been working too well for us, so we've discontinued its use.<br/>" +
			"<a href='#/billing/changePlan'>Click here to switch to direct CC billing</a>, and have your subscription to paypal canceled."
	}, {
		xtype: 'toolbar',
		dock: 'top',
		itemId: 'top',
		enableOverflow: true,
		height: 34,
		cls: 'scalr-mainwindow-docked-toolbar',
		items: menu,
		listeners: {
			afterrender: function () {
				var e = this.down('[environment="true"]');
				if (e) {
					var handler = function() {
						if (this.envId && Scalr.user.envId != this.envId)
							Scalr.Request({
								processBox: {
									type: 'action',
									msg: 'Changing environment ...'
								},
								url: '/core/xChangeEnvironment/',
								params: { envId: this.envId },
								success: function() {
									Scalr.event.fireEvent('reload');
								}
							});
					};

					e.menu.items.each(function(it) {
						it.on('click', handler);
					});

					Scalr.event.on('update', function (type, env) {
						if (type == '/environments/create') {
							var ind = this.menu.items.indexOf(this.menu.child('menuseparator'));
							this.menu.insert(ind, {
								'text': env.name,
								'checked': false,
								'group': 'environment',
								'envId': env.id
							}).on('click', handler);
						} else if (type == '/environments/rename') {
							var el = this.menu.child('[envId="' + env.id + '"]');
							if (el) {
								el.setText(env.name);
							}
						} else if (type == '/environments/delete') {
							var el = this.menu.child('[envId="' + env.id + '"]');
							if (el) {
								this.menu.remove(el);
							}
						}
					}, e);
				}
			}
		}
	}],
	disabledDockedToolbars: function (disable) {
		Ext.each(this.getDockedItems(), function (item) {
			if (disable)
				item.disable();
			else
				item.enable();
		});
	},
	listeners: {
		afterrender: function () {
			var t = this.body.getTop(true);

			this.elMessages = this.el.createChild({
				tag: 'div',
				id: 'body-container-messages',
				style: 'position: absolute; top: ' + (t + 8 ) + 'px; left: 0px; width: 100%; height: auto'
			});
		},
		add: function (cont, cmp) {
			// hack for grid, dynamic width and columns (afterrender)
			//if (cont.el && cmp.scalrOptions && cmp.scalrOptions.maximize == 'all')
			//	cmp.setWidth(cont.getWidth());
		},
		boxready: function () {
			Ext.EventManager.onWindowResize(function () {
				Scalr.application.setSize(Ext.get('body-container').getSize());
			});
		}
	}
});

Scalr.application.add({
	xtype: 'component',
	scalrOptions: {
		'reload': false,
		'maximize': 'all'
	},
	html: '&nbsp;',
	hidden: true,
	title: '',
	itemId: 'blank'
});

window.onhashchange = function (e) {
	if (Scalr.state.pageSuspendForce) {
		Scalr.state.pageSuspendForce = false;
	} else {
		if (Scalr.state.pageSuspend)
			return;
	}

	/*if (Scalr.state.pageChangeInProgress) {
		Scalr.state.pageChangeInProgressInvalid = true; // User changes link while loading page
		Scalr.message.Warning('Please wait');
	}*/

	Scalr.state.pageChangeInProgress = true;

	Scalr.message.Flush();
	Scalr.message.SetKeepMessages(false);
	// Scalr.utils.ClearMsgPanels

	var h = window.location.hash.substring(1).split('?'), link = '', param = {}, loaded = false, defaultPage = false;
	if (window.location.hash) {
		// only if hash not null
		if (h[0])
			link = h[0];
		// cut ended /  (/logs/view'/')

		if (h[1])
			param = Ext.urlDecode(h[1]);

		if (link == '' || link == '/') {
			defaultPage = true;
			return;
		}
	} else {
		defaultPage = true;
	}

	if (defaultPage) {
		if (Scalr.user.userId)
			document.location.href = "#/dashboard";
		else
			document.location.href = "#/guest/login";
		return;
	}

	var cacheLink = function (link, cache) {
		var re = cache.replace(/\/\{[^\}]+\}/g, '/([^\\}\\/]+)').replace(/\//g, '\\/'), fieldsRe = /\/\{([^\}]+)\}/g, fields = [];

		while ((elem = fieldsRe.exec(cache)) != null) {
			fields[fields.length] = elem[1];
		}

		return {
			scalrReconfigureFlag: false,
			scalrRegExp: new RegExp('^' + re + '$', 'g'),
			scalrCache: cache,
			scalrParamFields: fields,
			scalrParamGets: function (link) {
				var pars = {}, reg = new RegExp(this.scalrRegExp), params = reg.exec(link);
				if (Ext.isArray(params))
					params.shift(); // delete first element

				for (var i = 0; i < this.scalrParamFields.length; i++)
					pars[this.scalrParamFields[i]] = Ext.isArray(params) ? params.shift() : '';

				return pars;
			}
		};
	};

	// check in cache
	Scalr.application.items.each(function () {
		if (this.scalrRegExp && this.scalrRegExp.test(link)) {

			//TODO: Investigate in Safari
			this.scalrParamGets(link);

			Ext.apply(param, this.scalrParamGets(link));

			loaded = Scalr.application.layout.setActiveItem(this, param);

			return false;
		}
	});

	if (loaded) {
		// update statistic
		var stats = Ext.state.Manager.get('system-link-statistic') || {}, link = Scalr.application.layout.activeItem.scalrCache;

		if (! Ext.isDefined(stats[link]))
			stats[link] = { cnt: 1 };

		stats[link]['cnt']++;
		Ext.state.Manager.set('system-link-statistic', stats);
		return;
	}

	Ext.apply(param, Scalr.state.pageRedirectParams);
	Scalr.state.pageRedirectParams = {};

	var finishChange = function () {
		if (Scalr.state.pageChangeInProgressInvalid) {
			Scalr.state.pageChangeInProgressInvalid = false;
			Scalr.state.pageChangeInProgress = false;
			window.onhashchange(true);
		} else {
			Scalr.state.pageChangeInProgress = false;
		}
	};

	var r = {
		disableFlushMessages: true,
		disableAutoHideProcessBox: true,
		url: link,
		params: param,
		success: function (data, response, options) {
			var c = 'Scalr.' + data.moduleName.replace('/ui/js/', '').replace(/-[0-9]+.js/, '').replace(/\//g, '.'), cacheId = response.getResponseHeader('X-Scalr-Cache-Id'), cache = cacheLink(link, cacheId);
			var initComponent = function (c) {
				if (Ext.isObject(c)) {

					Ext.apply(c, cache);
					Scalr.application.add(c);

					if (Scalr.state.pageChangeInProgressInvalid) {
						if (options.processBox)
							options.processBox.destroy();

						finishChange();
					} else {
						Scalr.application.layout.setActiveItem(c, param);
						if (options.processBox)
							options.processBox.destroy();
					}
				} else {
					if (options.processBox)
						options.processBox.destroy();

					Scalr.application.layout.setActiveItem(Scalr.application.getComponent('blank'));
					finishChange();
				}
			};

			Ext.apply(param, cache.scalrParamGets(link));

			if (Ext.isDefined(Scalr.cache[c]))
				initComponent(Scalr.cache[c](param, data.moduleParams));
			else {
				var head = Ext.getHead();
				if (data.moduleRequiresCss) {
					for (var i = 0; i < data.moduleRequiresCss.length; i++) {
						var el = document.createElement('link');
						el.type = 'text/css';
						el.rel = 'stylesheet';
						el.href = data.moduleRequiresCss[i];

						head.appendChild(el);
					}
				}

				var sc = [ data.moduleName ];
				if (data.moduleRequires)
					sc = sc.concat(data.moduleRequires);

				var load = function () {
					if (sc.length)
						Ext.Loader.injectScriptElement(sc.shift(), load);
					else {
						initComponent(Scalr.cache[c](param, data.moduleParams));
					}
				};

				load();
			}
		},
		failure: function (data, response, options) {
			if (options.processBox)
				options.processBox.destroy();

			Scalr.application.layout.setActiveItem(Scalr.application.getComponent('blank'));
			finishChange();
		}
	};

	if (e)
		r['processBox'] = {
			type: 'action',
			msg: 'Loading page. Please wait ...'
		};

	Scalr.Request(r);
};

Scalr.timeoutHandler = {
	defaultTimeout: 60000,
	timeoutRun: 60000,
	timeoutRequest: 5000,
	params: {},
	enabled: false,
	locked: false,
	clearDom: function () {
		if (Ext.get('body-timeout-mask'))
			Ext.get('body-timeout-mask').remove();

		if (Ext.get('body-timeout-container'))
			Ext.get('body-timeout-container').remove();
	},
	schedule: function () {
		this.timeoutId = Ext.Function.defer(this.run, this.timeoutRun, this);
	},
	createTimer: function (cont) {
		clearInterval(this.timerId);
		var f = Ext.Function.bind(function (cont) {
			var el = cont.child('span');
			if (el) {
				var s = parseInt(el.dom.innerHTML);
				s -= 1;
				if (s < 0)
					s = 0;
				el.update(s.toString());
			} else {
				clearInterval(this.timerId);
			}
		}, this, [ cont ]);

		this.timerId = setInterval(f, 1000);
	},
	undoSchedule: function () {
		clearTimeout(this.timeoutId);
		clearInterval(this.timerId);
	},
	restart: function () {
		this.undoSchedule();
		this.run();
	},
	run: function () {
		Ext.Ajax.request({
			url: '/guest/xPerpetuumMobile',
			params: this.params,
			timeout: this.timeoutRequest,
			scope: this,
			doNotShowError: true,
			callback: function (options, success, response) {
				if (success) {
					try {
						var response = Ext.decode(response.responseText);

						if (response.success != true)
							throw 'False';

						this.clearDom();
						this.timeoutRun = this.defaultTimeout;

						if (! response.isAuthenticated) {
							Scalr.application.MaiWindow.layout.setActiveItem(Scalr.application.MainWindow.getComponent('loginForm'));
							this.schedule();
							return;
						} else if (! response.equal) {
							document.location.reload();
							return;
						} else {
							if (this.locked) {
								this.locked = false;
								Scalr.event.fireEvent('unlock');
								// TODO: проверить, нужно ли совместить в unlock
								window.onhashchange(true);
							}

							Scalr.event.fireEvent('update', 'lifeCycle', response);

							this.schedule();
							return;
						}
					} catch (e) {
						this.schedule();
						return;
					}
				}

				if (response.aborted == true) {
					this.schedule();
					return;
				}

				if (response.timedout == true) {
					this.schedule();
					return;
				}

				Scalr.event.fireEvent('lock');
				this.locked = true;

				var mask = Ext.get('body-timeout-mask') || Ext.getBody().createChild({
					id: 'body-timeout-mask',
					tag: 'div',
					style: {
						position: 'absolute',
						top: 0,
						left: 0,
						width: '100%',
						height: '100%',
						background: '#CCC',
						opacity: '0.5',
						'z-index': 300000
					}
				});

				this.timeoutRun += 6000;
				if (this.timeoutRun > 60000)
					this.timeoutRun = 60000;

				if (! Ext.get('body-timeout-container'))
					this.timeoutRun = 5000;

				var cont = Ext.get('body-timeout-container') || Ext.getBody().createChild({
					id: 'body-timeout-container',
					tag: 'div',
					style: {
						position: 'absolute',
						top: '5px',
						left: '5px',
						right: '5px',
						'z-index': 300001,
						background: '#F6CBBA',
						border: '1px solid #BC7D7A',
						'box-shadow': '0 1px #FEECE2 inset',
						font: 'bold 13px arial',
						color: '#420404',
						padding: '10px',
						'text-align': 'center'
					}
				}).applyStyles({ background: '-webkit-gradient(linear, left top, left bottom, from(#FCD9C5), to(#F0BCAC))'
					}).applyStyles({ background: '-moz-linear-gradient(top, #FCD9C5, #F0BCAC)' });

				this.schedule();

				cont.update('Not connected. Connecting in <span>' + this.timeoutRun/1000 + '</span>s. <a href="#">Try now</a> ');
				cont.child('a').on('click', function (e) {
					e.preventDefault();
					cont.update('Not connected. Trying now');
					this.undoSchedule();
					this.run();
				}, this);
				this.createTimer(cont);
			}
		});
	}
};

/*
 Scalr.timeoutHandler = {
 defaultTimeout: 60000,
 timeoutRun: 60000,
 timeoutRequest: 5000,
 params: {},
 enabled: false,
 forceCheck: false,
 locked: false,
 lockedCheck: true,
 clearDom: function () {
 if (Ext.get('body-timeout-mask'))
 Ext.get('body-timeout-mask').remove();

 if (Ext.get('body-timeout-container'))
 Ext.get('body-timeout-container').remove();
 },
 schedule: function () {
 this.timeoutId = Ext.Function.defer(this.run, this.timeoutRun, this);
 },
 createTimer: function (cont) {
 clearInterval(this.timerId);
 var f = Ext.Function.bind(function (cont) {
 var el = cont.child('span');
 if (el) {
 var s = parseInt(el.dom.innerHTML);
 s -= 1;
 if (s < 0)
 s = 0;
 el.update(s.toString());
 } else {
 clearInterval(this.timerId);
 }
 }, this, [ cont ]);

 this.timerId = setInterval(f, 1000);
 },
 undoSchedule: function () {
 clearTimeout(this.timeoutId);
 clearInterval(this.timerId);
 },
 restart: function () {
 this.undoSchedule();
 this.run();
 },
 run: function () {
 if (!this.locked && !this.forceCheck) {
 var cur = new Date(), tm = Scalr.storage.get('system-pm-updater');
 if (cur < tm) {
 this.schedule();
 return;
 }

 Scalr.storage.set('system-pm-updater', Ext.Date.add(cur, Ext.Date.SECOND, this.timeoutRun/1000));
 }

 Ext.Ajax.request({
 url: this.forceCheck || this.locked && this.lockedCheck ? '/ui/js/connection.js?r=' + new Date().getTime() : '/guest/xPerpetuumMobile',
 params: this.params,
 method: 'GET',
 timeout: this.timeoutRequest,
 scope: this,
 doNotShowError: true,
 callback: function (options, success, response) {
 if (success) {
 try {
 if (this.locked && this.lockedCheck) {
 this.lockedCheck = false;
 this.run();
 return;
 } else if (this.forceCheck) {
 this.forceCheck = false;
 this.schedule();
 return;
 } else {
 var response = Ext.decode(response.responseText);
 }

 if (response.success != true)
 throw 'False';

 this.clearDom();
 this.timeoutRun = this.defaultTimeout;

 if (! response.isAuthenticated) {
 Scalr.state.userNeedLogin = true;
 Scalr.event.fireEvent('redirect', '#/guest/login', true);
 this.schedule();
 return;
 } else if (! response.equal) {
 document.location.reload();
 return;
 } else {
 if (this.locked) {
 this.locked = false;
 this.lockedCheck = true;
 Scalr.event.fireEvent('unlock');
 Scalr.storage.set('system-pm-updater-status', this.locked);
 // TODO: проверить, нужно ли совместить в unlock
 window.onhashchange(true);
 }

 this.schedule();
 return;
 }
 } catch (e) {
 this.schedule();
 return;
 }
 }

 if (response.aborted == true) {
 this.schedule();
 return;
 }

 if (response.timedout == true) {
 this.schedule();
 return;
 }

 Scalr.event.fireEvent('lock');
 this.locked = true;
 Scalr.storage.set('system-pm-updater-status', this.locked);

 var mask = Ext.get('body-timeout-mask') || Ext.getBody().createChild({
 id: 'body-timeout-mask',
 tag: 'div',
 style: {
 position: 'absolute',
 top: 0,
 left: 0,
 width: '100%',
 height: '100%',
 background: '#CCC',
 opacity: '0.5',
 'z-index': 300000
 }
 });

 this.timeoutRun += 6000;
 if (this.timeoutRun > 60000)
 this.timeoutRun = 60000;

 if (! Ext.get('body-timeout-container'))
 this.timeoutRun = 5000;

 var cont = Ext.get('body-timeout-container') || Ext.getBody().createChild({
 id: 'body-timeout-container',
 tag: 'div',
 style: {
 position: 'absolute',
 top: '5px',
 left: '5px',
 right: '5px',
 'z-index': 300001,
 background: '#F6CBBA',
 border: '1px solid #BC7D7A',
 'box-shadow': '0 1px #FEECE2 inset',
 font: 'bold 13px arial',
 color: '#420404',
 padding: '10px',
 'text-align': 'center'
 }
 }).applyStyles({ background: '-webkit-gradient(linear, left top, left bottom, from(#FCD9C5), to(#F0BCAC))'
 }).applyStyles({ background: '-moz-linear-gradient(top, #FCD9C5, #F0BCAC)' });

 this.schedule();

 cont.update('Not connected to Scalr. Connecting in <span>' + this.timeoutRun/1000 + '</span>s. <a href="#">Try now</a> ');
 cont.child('a').on('click', function (e) {
 e.preventDefault();
 cont.update('Not connected to Scalr. Trying now');
 this.undoSchedule();
 this.run();
 }, this);
 this.createTimer(cont);
 }
 });
 }
 };

 */

// Scalr.initParams.user (old)
// Scalr.user (used as global var)
Scalr.Init = function () {
	if (Ext.get('body-message-container-mask') && Ext.get('body-message-container-mask').dom)
		Ext.get('body-message-container-mask').dom.count = 0; // from utils.js
	
	Scalr.application.render('body-container');
	Scalr.user = Scalr.InitParams.user || {};

	if (Ext.isObject(Scalr.InitParams['user'])) {
		if (Scalr.InitParams.flags.needEnvConfig && !sessionStorage.getItem('needEnvConfigLater')) {
			Scalr.flags.needEnvConfig = true;
			Scalr.event.fireEvent('lock');
			Scalr.event.fireEvent('redirect', '#/environments/' + Scalr.InitParams.flags.needEnvConfig + '/platform/ec2', true, true);
			Scalr.event.on('update', function (type, platform, enabled) {
				if (! sessionStorage.getItem('needEnvConfigDone')) {
					if (type ==  '/environments/' + Scalr.InitParams.flags.needEnvConfig + '/edit') {
						if (enabled) {
							sessionStorage.setItem('needEnvConfigDone', true);
							Scalr.event.fireEvent('unlock');
							Scalr.flags.needEnvConfig = false;
							if (platform == 'ec2') {
								Scalr.message.Success('Cloud credentials successfully configured. Now you can start to build your first farm. <a target="_blank" href="http://www.youtube.com/watch?v=6u9M-PD-_Ds&t=6s">Learn how to do this by watching video tutorial.</a>');
								Scalr.event.fireEvent('redirect', '#/farms/build', true);
							} else {
								Scalr.message.Success('Cloud credentials successfully configured. You need to create some roles before you will be able to create your first farm.');
								Scalr.event.fireEvent('redirect', '#/roles/builder', true);
							}
						}
					}
				}
			});
		}
		window.onhashchange(false);
	} else {
		window.onhashchange(false);


		/*if (document.location.hash == '#/guest/login')
			window.onhashchange(false);
		else
			Scalr.event.fireEvent('redirect', '#/guest/login', true, true);*/
	}

	new Ext.util.KeyMap(Ext.getBody(), [{
		key: Ext.EventObject.ESC,
		fn: function () {
			if (Scalr.flags.suspendPage == false && Scalr.application.layout.activeItem.scalrOptions.modal == true) {
				Scalr.event.fireEvent('close');
			}
		}
	}]);

	if (Ext.isObject(Scalr.InitParams['user'])) {
		Scalr.timeoutHandler.enabled = true;
		Scalr.timeoutHandler.params = Scalr.InitParams['user'];
		Scalr.timeoutHandler.schedule();
	}

	if (Scalr.user['userIsTrial']) {
		Ext.Loader.injectScriptElement('https://snapabug.appspot.com/snapabug.js', function () {
			Ext.getBody().createChild({
				tag: 'div',
				id: 'SnapABug_W'
			});

			Ext.getBody().createChild({
				tag: 'div',
				id: 'SnapABug_WP'
			});

			Ext.getBody().createChild({
				tag: 'div',
				id: 'SnapABug_Applet'
			});

			SnapABug.initAsync('1ddc18b2-03c6-49a3-a858-4e1b34d41dec');
			SnapABug.setDomain('scalr.net');

			Scalr.application.getDockedComponent('top').down('#trialChat').on('click', function () {
				SnapABug.setSecureConnexion();
				SnapABug.allowOffline(false);
				SnapABug.startChat('Hello, how can I help you today?');
			});
		});
	}

	window.onunload = function () {
		Scalr.timeoutHandler.enabled = false;
		Scalr.timeoutHandler.undoSchedule();
		Scalr.timeoutHandler.clearDom();

		Ext.getBody().createChild({
			tag: 'div',
			style: {
				opacity: '0.8',
				background: '#EEE',
				'z-index': 400000,
				position: 'absolute',
				top: 0,
				left: 0,
				width: '100%',
				height: '100%'
			}
		});
	};

	/*window.onbeforeunload = function (e) {
		var message = "Where are you gone?";
		e = e || window.event;

		if (e)
			e.returnValue = message;

		return message;
	};*/

	window.onerror = function (message, file, lineno) {
		Scalr.Request({
			url: '/guest/xPostError',
			doNotShowError: true,
			params: {
				message: message,
				file: file,
				lineno: lineno,
				url: document.location.href
			}
		});

		Scalr.message.Warning("Whoops! Something went wrong, and we have been notified. Try reloading the page if things don't work.");

		return false;
	};
};
