Ext.ns('Scalr.utils');

Scalr.utils.CreateProcessBox = function (config) {
	config['icon'] = 'scalr-mb-icon-' + config['type'];
	var a = '';
	switch (config['type']) {
		case 'delete':
			config['msg'] = config['msg'] || 'Deleting ... Please wait ...'; break;
		case 'reboot':
			config['msg'] = config['msg'] || 'Rebooting ...'; break;
		case 'terminate':
			config['msg'] = config['msg'] || 'Terminating ...'; break;
		case 'launch':
			config['msg'] = config['msg'] || 'Launching ...'; break;
		case 'save':
			config['msg'] = config['msg'] || 'Saving ...'; break;
		case 'action': default:
			config['msg'] = config['msg'] || 'Processing ... Please wait ...'; config['icon'] = 'scalr-mb-icon-action'; break;
	};

	var c = Ext.create('Ext.Component', {
		itemId: 'box',
		data: config,
		width: 422,
		scalrOptions: {
			modal: 'box'
		},
		cls: 'scalr-mb-container',
		tpl: '<div class="scalr-mb-icon-text {icon}" style="margin: 20px 20px 10px 20px">{msg}</div><div style="margin: 10px 20px 15px 20px;"><img src="/ui/images/icons/anim/progress.gif" /></div>'
	});

	Scalr.application.add(c);
	Scalr.application.getLayout().setActiveModalItem(c);
	return c;
};

Scalr.utils.CloneObject = function (o) {
	if (o == null || typeof(o) != 'object')
		return o;

	if(o.constructor == Array)
		return [].concat(o);

	var t = {};
	for (var i in o)
		t[i] = Scalr.utils.CloneObject(o[i]);

	return t;
};

Scalr.utils.Confirm = function (config) {
	config['icon'] = 'scalr-mb-icon-' + config['type'];
	var a = '';
	switch (config['type']) {
		case 'delete':
			a = 'Delete'; break;
		case 'reboot':
			a = 'Reboot'; break;
		case 'terminate':
			a = 'Terminate'; break;
		case 'launch':
			a = 'Launch'; break;
	};

	if (config.objects) {
		config.objects.sort();
		var r = '<span style="font-weight: 700;">' + config.objects.shift() + '</span>';
		if (config.objects.length)
			r = r + ' and <span title="' + config.objects.join("\n") + '" style="font-weight: 700; border-bottom: 1px dashed #000080;">' + config.objects.length + ' others</span>';

		config.msg = config.msg.replace('%s', r);
	}

	config['ok'] = config['ok'] || a;
	config['closeOnSuccess'] = config['closeOnSuccess'] || false;
	var items = [];

	if (Ext.isDefined(config.type)) {
		items.push({
			margin: 10,
			border: false,
			bodyCls: config['icon'] + ' scalr-mb-icon-text',
			html: config['msg']
		});
	}

	if (Ext.isDefined(config.form)) {
		var form = {
			margin: Ext.isDefined(config.type) ? '0 5 0 5' : '5 5 0 5',
			bodyStyle: {
				'background-color': 'inherit'
			},
			layout: 'anchor',
			itemId: 'form',
			xtype: 'form',
			border: false,
			defaults: {
				msgTarget: 'side',
				anchor: '100%'
			},
			items: config.form
		};

		if (Ext.isDefined(config.formValidate)) {
			form.listeners = {
				validitychange: function (form, valid) {
					if (valid)
						this.up('#box').down('#buttonOk').enable();
					else
						this.up('#box').down('#buttonOk').disable();
				},
				boxready: function () {
					if (this.form.hasInvalidField())
						this.up('#box').down('#buttonOk').disable();
				}
			};
		}

		items.push(form);
	}

	var c = Ext.create('Ext.panel.Panel', {
		cls: 'scalr-mb-container',
		itemId: 'box',
		border: false,
		scalrOptions: {
			modal: 'box'
		},
		bodyStyle: {
			'background-color': 'inherit'
		},
		width: config.formWidth || 400,
		title: config.title || 'Confirmation',
		items: items,
		dockedItems: [{
			xtype: 'container',
			dock: 'bottom',
			cls: 'scalr-ui-docked-bottombar',
			layout: {
				type: 'hbox',
				pack: 'center'
			},
			items: [{
				xtype: 'button',
				text: config['ok'] || 'OK',
				width: 80,
				itemId: 'buttonOk',
				disabled: config['disabled'] || false,
				handler: function () {
					var values = this.up('#box').down('#form') ? this.up('#box').down('#form').getValues() : {};

					if (! config.closeOnSuccess)
						this.up('#box').close();

					if (config.success.call(config.scope || this.up('#box'), values, this.up('#box') ? this.up('#box').down('#form') : this) && config.closeOnSuccess) {
						this.up('#box').close();
					}
				}
			}, {
				xtype: 'button',
				text: 'Cancel',
				width: 80,
				margin: '0 0 0 5',
				handler: function () {
					this.up('#box').close();
				}
			}]
		}]
	});

	c.keyMap = new Ext.util.KeyMap(Ext.getBody(), [{
		key: Ext.EventObject.ESC,
		fn: function () {
			this.close();
		},
		scope: c
	}]);

	if (! Ext.isDefined(config.form)) {
		c.keyMap.addBinding({
			key: Ext.EventObject.ENTER,
			fn: function () {
				var btn = this.down('#buttonOk');
				btn.handler.call(btn);
			},
			scope: c
		});
	}

	c.on('destroy', function () {
		this.keyMap.destroy();
	});

	Scalr.application.add(c);
	Scalr.application.getLayout().setActiveModalItem(c);

	return c;
};

Scalr.utils.Request = function (config) {
	var currentUrl = document.location.href;

	config = Ext.apply(config, {
		callback: function (options, success, response) {
			if (!options.disableAutoHideProcessBox && options.processBox)
				options.processBox.destroy();

			if (success == true && (Ext.isDefined(response.status) ? response.status == 200 : true))  {
				// only for HTTP Code = 200 (for fake ajax upload files doesn't exist response status)
				//try {
					var result = Ext.decode(response.responseText);

					if (result.success == true) {
						if (result.successMessage)
							Scalr.message.Success(result.successMessage);

						if (result.warningMessage)
							Scalr.message.Warning(result.warningMessage);

						options.successF.call(this, result, response, options);
						/*try {
							options.successF.call(this, result, response, options);
						} catch (e) {
							Scalr.message.Error('Success handler error:' + e);
						}*/
						return true;
					} else {
						if (result.errorMessage)
							Scalr.message.Error(result.errorMessage);

						options.failureF.call(this, result, response, options);
						/*try {
							options.failureF.call(this, result, response, options);
						} catch (e) {
							Scalr.message.Error('Failure handler error:' + e);
						}*/
						return;
					}
				/*} catch (e) {
					Scalr.message.Error('Received incorrect response from server (' + e + ')');
					//Scalr.utils.PostReport(response, options, e);
				}*/
			}
			// else nothing, global error handler used (if status code != 200)

			options.failureF.call(this, null, response, options);
		}
	});

	config.disableFlushMessages = !!config.disableFlushMessages;
	if (! config.disableFlushMessages)
		Scalr.message.Flush();

	config.disableAutoHideProcessBox = !!config.disableAutoHideProcessBox;

	config.successF = config.success || function () {};
	config.failureF = config.failure || function () {};
	config.scope = config.scope || config;
	config.params = config.params || {};

	delete config.success;
	delete config.failure;

	var pf = function (config) {
		if (config.processBox) {
			config.processBox = Scalr.utils.CreateProcessBox(config.processBox);
		}

		if (config.form) {
			config['success'] = function (form, action) {
				action.callback.call(this, action, true, action.response);
			};

			config['failure'] = function (form, action) {
				// investigate later, in extjs 4
				action.callback.call(this, action, /*(action.response.status == 200) ? true : false*/ true, action.response);
			};
			config['clientValidation'] = false;

			if (config.form.hasUpload()) {
				config.params['X-Requested-With'] = 'XMLHttpRequest';
			}

			config.form.submit(config);
		} else {
			return Ext.Ajax.request(config);
		}
	};

	if (Ext.isObject(config.confirmBox)) {
		config.confirmBox['success'] = function (params) {
			delete config.confirmBox;

			if (Ext.isDefined(params))
				Ext.applyIf(config.params, params);

			pf(config);
		};

		Scalr.Confirm(config.confirmBox);
	} else {
		return pf(config);
	}
};

Scalr.utils.UserLoadFile = function (path) {
	Ext.Function.defer(
		Ext.getBody().createChild({
			tag: 'iframe',
			src: path,
			width: 0,
			height: 0,
			frameborder: 0
		}).remove, 1000
	);
};

Scalr.utils.ThrowDebug = function (c) {
	var d = [];
	for (var s in c) {
		if (Ext.isString(c[s]))
			d.push(s + ': ' + c[s]);
	}

	d = d.join('; ');
	throw d;
};

Scalr.utils.IsEqualValues = function (obj1, obj2) {
	for (var i in obj1) {
		if (! Ext.isDefined(obj2[i]) && obj1[i] == obj2[i])
			return false;
	}

	return true;
}

// shorter name
Scalr.Confirm = Scalr.utils.Confirm;
Scalr.Request = Scalr.utils.Request;
