Ext.define('Scalr.ui.FormFilterField', {
	extend:'Ext.form.field.Picker',
	alias: 'widget.filterfield',

	hideTrigger: true,
	separatedParams: [],
	hideFilterIcon: false,
	hideTriggerButton: false,
	hideSearchButton: false,
	cls: 'x-filterfield',

	initComponent: function() {
		var me = this;
		this.callParent(arguments);

		if (! this.form) {
			this.hideTriggerButton = true;
		} else {
			this.on({
				expand: function() {
					var picker = this.getPicker(), values = this.getParseValue();
					picker.getForm().reset();
					picker.getForm().setValues(values);
					this.triggerButton.addCls('x-filterfield-trigger-pressed');
				},
				collapse: function() {
					var picker = this.getPicker(), values = this.getParseValue();
					Ext.Object.merge(values, picker.getForm().getValues());
					this.setParseValue(values);
					this.triggerButton.removeCls('x-filterfield-trigger-pressed');
				}
			});
		}

		if (this.form && this.form.items) {
			Ext.each(this.form.items, function(item) {
				if (item.name)
					me.separatedParams.push(item.name);
			});
		}

		if (this.store && this.store.remoteSort) {
			this.emptyText = 'Search';

			if (this.store.proxy.extraParams['query'] != '')
				this.value = this.store.proxy.extraParams['query'];
		} else {
			this.emptyText = 'Filter';
			this.hideSearchButton = true;
			if (! this.hideFilterIcon)
				this.fieldCls = this.fieldCls + ' x-form-field-livesearch';
		}

		if (Ext.isFunction(this.handler)) {
			this.on('change', this.handler, this, { buffer: 300 });
		}
	},

	clearFilter: function() {
		this.collapse();
		this.reset();
		if (! this.hideSearchButton)
			this.storeHandler();
		this.focus();
	},

	applyFilter: function(field, value) {
		var me = this;
		value = Ext.String.trim(value);

		if (this.hideSearchButton)
			me.clearButton[value != '' ? 'show' : 'hide' ]();

		if (me.filterFn || me.filterFields) {
			me.store.clearFilter();

			var filterFn = function(record) {
				var result = false,
					r = new RegExp(Ext.String.escapeRegex(value), 'i');
				for (var i = 0, length = me.filterFields.length; i < length; i++) {
					var fieldValue = Ext.isFunction(me.filterFields[i]) ? me.filterFields[i](record) : record.get(me.filterFields[i]);
					result = (fieldValue+'').match(r);
					if (result) {
						break;
					}
				}
				return result;
			}

			if (value != '') {
				this.store.filter({
					filterFn: me.filterFn || filterFn
				});
			}
			this.fireEvent('afterfilter');
		}
	},

	onRender: function() {
		this.callParent(arguments);

		this.clearButton = this.bodyEl.down('tr').createChild({
			tag: 'td',
			width: 22,
			html: '<div class="x-filterfield-reset"></div>'
		});
		this.clearButton[ this.getValue() != '' ? 'show' : 'hide' ]();
		this.applyFilter(this, this.getValue());
		this.clearButton.on('click', this.clearFilter, this);
		this.on('change', this.applyFilter, this, { buffer: 300 });

		this.on('specialkey', function(f, e) {
			if(e.getKey() == e.ESC){
				e.stopEvent();
				this.clearFilter();
			}
		}, this);

		if (! this.hideTriggerButton) {
			this.triggerButton = this.bodyEl.down('tr').createChild({
				tag: 'td',
				width: 29,
				html: '<div class="x-filterfield-trigger"><div class="x-filterfield-trigger-inner"></div></div>'
			}).down('div');
			this.triggerButton.on('click', this.onTriggerClick, this);

			if (this.hideSearchButton) {
				this.triggerButton.addCls('x-filterfield-trigger-alone');
			}
		}

		if (! this.hideSearchButton) {
			this.searchButton = this.bodyEl.up('tr').createChild({
				tag: 'td',
				width: 44,
				html: '<div class="x-filterfield-btn"><div class="x-filterfield-btn-inner"></div></div>'
			}).down('div');
			this.searchButton.on('click', this.storeHandler, this);
			this.on('specialkey', function(f, e) {
				if(e.getKey() == e.ENTER){
					e.stopEvent();
					this.storeHandler();
				}
			}, this);
			this.triggerWrap.applyStyles('border-radius: 3px 0 0 3px');
			if (this.hideTriggerButton) {
				this.searchButton.addCls('x-filterfield-btn-alone');
			}
		}
	},

	createPicker: function() {
		var me = this,
			formDefaults = {
				style: 'background:#F0F1F4; border-radius: 3px; box-shadow: 0 1px 3px #708098; margin-top:1px',
				fieldDefaults: {
					anchor: '100%'
				},
				focusOnToFront: false,
				padding: 12,
				pickerField: me,
				floating: true,
				hidden: true,
				ownerCt: this.ownerCt
			};

		/*if (!this.form.dockedItems) {
			this.form.dockedItems = {
				xtype: 'container',
				layout: {
					type: 'hbox',
					pack: 'left'
				},
				dock: 'bottom',
				items: [{
					xtype: 'button',
					text: '<img src="/ui2/images/icons/search_icon_13x13.png">',
					handler: function() {
						me.focus();
						me.collapse();
						me.storeHandler();
					}
				}]
			}
		}*/
		/*if (this.form.items) {
		 this.form.items.unshift({
		 xtype: 'textfield',
		 name: 'keywords',
		 fieldLabel: 'Has words',
		 labelAlign: 'top'
		 });
		 }*/
		var form = Ext.create('Ext.form.Panel', Ext.apply(formDefaults, this.form));
		form.getForm().getFields().each(function(){
			if (this.xtype == 'combo') {
				this.on('expand', function(){
					this.picker.el.on('mousedown', function(e){
						me.keepVisible = true;
					});
				}, this, {single: true})
			} else if (this.xtype == 'textfield') {
				this.on('specialkey', function(f, e) {
					if(e.getKey() == e.ENTER){
						e.stopEvent();
						me.collapse();
						me.storeHandler();
					}
				});
			}
		})
		return form;
	},

	getParseValue: function() {
		var v = this.getValue(), res = {};
		if (this.separatedParams.length) {
			var params = v.trim().split(' '), paramsQuery = [], paramsSeparated = {};
			for (var i = 0; i < params.length; i++) {
				var paramsSplited = params[i].trim().split(':');
				if (paramsSplited.length == 1) {
					paramsQuery.push(params[i]);
				} else {
					if (this.separatedParams.indexOf(paramsSplited[0]) != -1)
						paramsSeparated[paramsSplited[0]] = paramsSplited[1];
					else
						paramsQuery.push(params[i]);
				}
			}

			res['query'] = paramsQuery.join(' ');
			Ext.Object.merge(res, paramsSeparated);
		} else {
			res['query'] = v;
		}

		return res;
	},

	setParseValue: function(params) {
		var s = params['query'] || '';
		delete params['query'];
		for (var i in params) {
			if (params[i])
				s += ' ' + i + ':' + params[i];
		}

		this.setValue(s);
	},

	collapseIf: function(e) {
		var me = this;
		if (!me.keepVisible && !me.isDestroyed && !e.within(me.bodyEl, false, true) && !e.within(me.picker.el, false, true) && !me.isEventWithinPickerLoadMask(e)) {
			me.collapse();
		}
		me.keepVisible = false;
	},

	storeHandler: function() {
		this.clearButton[this.getValue() != '' ? 'show' : 'hide' ]();

		for (var i = 0; i < this.separatedParams.length; i++) {
			delete this.store.proxy.extraParams[this.separatedParams[i]];
		}

		Ext.apply(this.store.proxy.extraParams, this.getParseValue());
		this.store.load();
	}
});

Ext.define('Scalr.ui.FormFieldButtonGroup', {
	extend: 'Ext.form.FieldContainer',
	alias: 'widget.buttongroupfield',
	
	mixins: {
		field: 'Ext.form.field.Field'
	},
	
	baseCls: 'x-container x-form-buttongroupfield',
	allowBlank: false,
	
	initComponent: function() {
		var me = this, defaults;
		defaults = {
			xtype: 'button',
			enableToggle: true,
			toggleGroup: me.getInputId(),
			allowDepress: me.allowBlank,
			scope: me,
			doToggle: function(){
				/* Changed */
				if (this.enableToggle && this.allowDepress !== false || !this.pressed && this.ownerCt.fireEvent('beforetoggle', this, this.value) !== false) {
					this.toggle();
				}
				/* End */
			},
			toggleHandler: function(button, state){
				if (state) {
					button.ownerCt.setValue(button.value);
				}
			},
			onMouseDown: function(e) {
				var me = this;
				if (!me.disabled && e.button === 0) {
					/* Changed */
					//me.addClsWithUI(me.pressedCls);
					/* End */
					me.doc.on('mouseup', me.onMouseUp, me);
				}
			}
		};
		me.defaults = me.initialConfig.defaults ? Ext.clone(me.initialConfig.defaults) : {};
		Ext.applyIf(me.defaults, defaults);
		
		me.callParent();
		me.initField();
		if (!me.name) {
			me.name = me.getInputId();
		}
	},

	getValue: function() {
		var me = this,
			val = me.getRawValue();
		me.value = val;
		return val;
	},

	setValue: function(value) {
		var me = this;
		me.setRawValue(value);
		return me.mixins.field.setValue.call(me, value);
	},
	
	getRawValue: function() {
		var me = this, v, b;
		b = Ext.ButtonToggleManager.getPressed(me.getInputId());
		if (b) {
			v = b.value;
			me.rawValue = v;
		} else {
			v = me.rawValue;
		}
		return v;
	},
	
	setRawValue: function(value) {
		var me = this;
		me.rawValue = value;
		me.items.each(function(){
			if (me.rendered) {
				this.toggle(this.value == value);
			} else if (this.value == value){
				this.pressed = true;
			}
		});
		return value;
	},
	
	onAdd: function(item, pos) {
	   var me = this;
	   me.setFirstLastCls();
	   me.callParent();
	},

	onRemove: function(item) {
	   var me = this;
	   me.setFirstLastCls();
	   me.callParent();
	},

	setFirstLastCls: function() {
		this.items.each(function(item, index, len){
			item.removeCls('x-btn-default-small-combo-first x-btn-default-small-combo-last');
			if (index == 0) {
				item.addCls('x-btn-default-small-combo-first');
			}
			if (index + 1 == len) {
				item.addCls('x-btn-default-small-combo-last');
			}
		});
	},
	
	getInputId: function() {
		return this.inputId || (this.inputId = this.id + '-inputEl');
	},
	
    setReadOnly: function(readOnly) {
        var me = this;
        readOnly = !!readOnly;
        me.readOnly = readOnly;
		me.items.each(function(){
			if (me.rendered) {
				this.setDisabled(readOnly);
			}
		});
        me.fireEvent('writeablechange', me, readOnly);
    }

});

Ext.define('Scalr.ui.FormCustomButton', {
	alias: 'widget.btn',
	extend: 'Ext.Component',

	hidden: false,
	disabled: false,
	pressed: false,
	enableToggle: false,
	maskOnDisable: false,

	childEls: [ 'btnEl' ],

	baseCls: 'x-button-text',
	overCls: 'over',
	pressedCls: 'pressed',
	disabledCls: 'disabled',
	expandBaseCls: true,
	text: '',
	type: 'base',
	renderTpl: '',
	tooltipType: 'qtip',

	tpls: {
		base: '<div class="x-btn-inner" id="{id}-btnEl">{text}</div>'
	},

	initComponent: function() {
		var me = this;

		this.renderTpl = this.renderTpl || this.tpls[this.type] || this.tpls['base'];

		me.callParent(arguments);
		me.addEvents('click', 'toggle');

		if (Ext.isString(me.toggleGroup)) {
			me.enableToggle = true;
		}

		if (! me.baseCls) {
			me.baseCls = 'x-btn-' + me.type;
		}

		if (me.expandBaseCls) {
			me.overCls = me.baseCls + '-' + me.overCls;
			me.pressedCls = me.baseCls + '-' + me.pressedCls;
			me.disabledCls = me.baseCls + '-' + me.disabledCls;
		}

		me.renderData['id'] = me.getId();
		me.renderData['disabled'] = me.disabled;
		me.renderData['text'] = me.text;
	},

	onRender: function () {
		var me = this;

		me.callParent(arguments);

		if (me.el) {
			me.mon(me.el, {
				click: me.onClick,
				scope: me
			});
		}

		if (me.pressed)
			me.addCls(me.pressedCls);

		Ext.ButtonToggleManager.register(me);
		
        if (me.tooltip) {
            me.setTooltip(me.tooltip, true);
        }
		
	},

	onDestroy: function() {
		var me = this;
		if (me.rendered) {
			Ext.ButtonToggleManager.unregister(me);
			me.clearTip();
		}
		me.callParent();
	},

	toggle: function(state, suppressEvent) {
		var me = this;
		state = state === undefined ? !me.pressed : !!state;
		if (state !== me.pressed) {
			if (me.rendered) {
				me[state ? 'addCls': 'removeCls'](me.pressedCls);
			}
			me.pressed = state;
			if (!suppressEvent) {
				me.fireEvent('toggle', me, state);
				Ext.callback(me.toggleHandler, me.scope || me, [me, state]);
			}
		}
		return me;
	},

	onClick: function(e) {
		var me = this;

		if (! me.disabled) {
			me.doToggle();
			me.fireHandler(e);
		}
	},

	fireHandler: function(e){
		var me = this,
			handler = me.handler;

		me.fireEvent('click', me, e);
		if (handler) {
			handler.call(me.scope || me, me, e);
		}
	},

	doToggle: function(){
		var me = this;
		if (me.enableToggle && (me.allowDepress !== false || !me.pressed)) {
			me.toggle();
		}
	},
	
	setTooltip: function(tooltip, initial) {
		var me = this;

		if (me.rendered) {
			if (!initial) {
				me.clearTip();
			}
			if (Ext.isObject(tooltip)) {
				Ext.tip.QuickTipManager.register(Ext.apply({
					target: me.btnEl.id
				},
				tooltip));
				me.tooltip = tooltip;
			} else {
				me.btnEl.dom.setAttribute(me.getTipAttr(), tooltip);
			}
		} else {
			me.tooltip = tooltip;
		}
		return me;
	},
	
	getTipAttr: function(){
		return this.tooltipType == 'qtip' ? 'data-qtip' : 'title';
	},
	
    clearTip: function() {
        if (Ext.isObject(this.tooltip)) {
            Ext.tip.QuickTipManager.unregister(this.btnEl);
        }
    }
	
});

Ext.define('Scalr.ui.FormCustomButtonField', {
	alias: 'widget.btnfield',
	extend: 'Scalr.ui.FormCustomButton',

	mixins: {
		field: 'Ext.form.field.Field'
	},
	inputValue: true,

	initComponent : function() {
		var me = this;
		me.callParent();
		me.initField();
	},

	getValue: function() {
		return this.pressed ? this.inputValue : '';
	},

	setValue: function(value) {
		this.toggle(value == this.inputValue ? true : false);
	}
});

Ext.define('Scalr.ui.FormFieldInfoTooltip', {
	extend: 'Ext.form.DisplayField',
	alias: 'widget.displayinfofield',
	initComponent: function () {
		// should use value for message
		var info = this.value || this.info;
		this.value = '<img class="tipHelp" src="/ui2/images/icons/info_icon_16x16.png" data-qtip="' + info + '" style="cursor: help; height: 16px;">';

		this.callParent(arguments);
	}
});

Ext.define('Scalr.ui.FormFieldFarmRoles', {
	extend: 'Ext.form.FieldSet',
	alias: 'widget.farmroles',

	layout: 'column',

	initComponent: function() {
		this.callParent(arguments);
		this.params = this.params || {};
		this.params.options = this.params.options || [];

		var farmField = this.down('[name="farmId"]'), farmRoleField = this.down('[name="farmRoleId"]'), serverField = this.down('[name="serverId"]');
		farmField.store.loadData(this.params['dataFarms'] || []);
		farmField.setValue(this.params['farmId'] || '');

		if (this.params.options.indexOf('requiredFarm') != -1)
			farmField.allowBlank = false;

		if (this.params.options.indexOf('requiredFarmRole') != -1)
			farmRoleField.allowBlank = false;

		if (this.params.options.indexOf('requiredServer') != -1)
			serverField.allowBlank = false;

		delete this.params['farmId'];
		delete this.params['farmRoleId'];
		delete this.params['serverId'];
		this.fixWidth();
	},

	fixWidth: function() {
		var farmField = this.down('[name="farmId"]'), farmRoleField = this.down('[name="farmRoleId"]'), serverField = this.down('[name="serverId"]');

		if (this.params.options.indexOf('disabledServer') != -1) {
			farmField.columnWidth = 0.5;
			farmRoleField.columnWidth = 0.5;
		} else if (this.params.options.indexOf('disabledFarmRole') != -1) {
			farmField.columnWidth = 1;
		} else {
			farmField.columnWidth = 1/3;;
			farmRoleField.columnWidth = 1/3;
			serverField.columnWidth = 1/3;
		}
	},

	items: [{
		xtype: 'combo',
		hideLabel: true,
		name: 'farmId',
		store: {
			fields: [ 'id', 'name' ],
			proxy: 'object'
		},
		valueField: 'id',
		displayField: 'name',
		emptyText: 'Select a farm',
		editable: false,
		queryMode: 'local',
		listeners: {
			change: function () {
				var me = this, fieldset = this.up('fieldset');

				if (fieldset.params.options.indexOf('disabledFarmRole') != -1)
					return;

				if (fieldset.params.options.indexOf('disabledServer') == -1)
					fieldset.down('[name="serverId"]').hide();

				if (!this.getValue()) {
					fieldset.down('[name="farmRoleId"]').hide();
					return;
				}

				var successHandler = function(data) {
					var field = fieldset.down('[name="farmRoleId"]');
					field.show();
					if (data['dataFarmRoles']) {
						field.emptyText = 'Select a role';
						field.reset();
						field.store.loadData(data['dataFarmRoles']);

						if (fieldset.params['farmRoleId']) {
							field.setValue(fieldset.params['farmRoleId']);
							delete fieldset.params['farmRoleId'];
						} else {
							if (fieldset.params.options.indexOf('addAll') != -1) {
								field.setValue('0');
							} else {
								if (field.store.getCount() == 1)
									field.setValue(field.store.first()); // preselect single element
								else
									field.setValue('');
							}
						}

						field.enable();
						field.clearInvalid();
					} else {
						field.store.removeAll();
						field.emptyText = 'No roles';
						field.reset();
						field.disable();
						if (field.allowBlank == false)
							field.markInvalid('This field is required');
					}
				};

				if (fieldset.params['dataFarmRoles']) {
					successHandler(fieldset.params);
					delete fieldset.params['dataFarmRoles'];
				} else
					Scalr.Request({
						url: '/farms/xGetFarmWidgetRoles/',
						params: {farmId: me.getValue(), options: fieldset.params['options'].join(',')},
						processBox: {
							type: 'load',
							msg: 'Loading farm roles ...'
						},
						success: successHandler
					});
			}
		}
	}, {
		xtype: 'combo',
		hideLabel: true,
		hidden: true,
		name: 'farmRoleId',
		store: {
			fields: [ 'id', 'name', 'platform', 'role_id' ],
			proxy: 'object'
		},
		valueField: 'id',
		displayField: 'name',
		emptyText: 'Select a role',
		margin: '0 0 0 5',
		editable: false,
		queryMode: 'local',
		listeners: {
			change: function () {
				var me = this, fieldset = this.up('fieldset');

				if (fieldset.params.options.indexOf('disabledServer') != -1) {
					fieldset.down('[name="serverId"]').hide();
					return;
				}

				if (! me.getValue() || me.getValue() == '0') {
					fieldset.down('[name="serverId"]').hide();
					return;
				}

				var successHandler = function (data) {
					var field = fieldset.down('[name="serverId"]');
					field.show();
					if (data['dataServers']) {
						field.emptyText = 'Select a server';
						field.reset();
						field.store.load({data: data['dataServers']});

						if (fieldset.params['serverId']) {
							field.setValue(fieldset.params['serverId']);
							delete fieldset.params['serverId'];
						} else {
							field.setValue(0);
						}

						field.enable();
					} else {
						field.emptyText = 'No running servers';
						field.reset();
						field.disable();
					}
				};

				if (fieldset.params['dataServers']) {
					successHandler(fieldset.params);
					delete fieldset.params['dataServers'];
				} else
					Scalr.Request({
						url: '/farms/xGetFarmWidgetServers',
						params: {farmRoleId: me.getValue(), options: fieldset.params['options'].join(',')},
						processBox: {
							type: 'load',
							msg: 'Loading servers ...'
						},
						success: successHandler
					});
			}
		}
	}, {
		xtype: 'combo',
		hideLabel: true,
		hidden: true,
		name: 'serverId',
		store: {
			fields: [ 'id', 'name' ],
			proxy: 'object'
		},
		valueField: 'id',
		displayField: 'name',
		margin: '0 0 0 5',
		editable: false,
		queryMode: 'local'
	}],

	optionChange: function(action, key) {
		var index = this.params.options.indexOf(key);

		if (action == 'remove' && index != -1 || action == 'add' && index == -1) {
			if (action == 'remove') {
				this.params.options.splice(index, index);
			} else {
				this.params.options.push(key);
			}

			switch(key) {
				case 'disabledFarmRole':
					if (action == 'add') {
						this.down('[name="farmRoleId"]').hide();
						this.down('[name="serverId"]').hide();
					} else {
						this.down('[name="farmId"]').fireEvent('change');
					}
					break;

				case 'disabledServer':
					if (action == 'add') {
						this.down('[name="serverId"]').hide();
					} else {
						this.down('[name="farmRoleId"]').fireEvent('change');
					}
					break;
			}
		}

		this.fixWidth();
		this.updateLayout();
	},

	syncItems: function () {
		/*if (this.enableFarmRoleId && this.down('[name="farmId"]').getValue()) {
		 this.down('[name="farmId"]').fireEvent('change');
		 } else
		 this.down('[name="farmRoleId"]').hide();

		 if (! this.enableServerId)
		 this.down('[name="serverId"]').hide();*/
	}
});

Ext.define('Scalr.ui.FormFieldProgress', {
	extend: 'Ext.form.field.Display',
	alias: 'widget.progressfield',
	
    fieldSubTpl: [
        '<div id="{id}"',
        '<tpl if="fieldStyle"> style="{fieldStyle}"</tpl>', 
        ' class="{fieldCls}"><div class="x-form-progress-bar"></div><span class="x-form-progress-text">{value}</span></div>',
        {
            compiled: true,
            disableFormats: true
        }
    ],
	
	fieldCls: Ext.baseCSSPrefix + 'form-progress-field',
	
	progressTextCls: 'x-form-progress-text',
	progressBarCls: 'x-form-progress-bar',
	warningPercentage: 60,
	alertPercentage: 80,
	warningCls: 'x-form-progress-bar-warning',
	alertCls: 'x-form-progress-bar-alert',
	
	valueField: 'value',
	emptyText: '',
	units: '%',
	
	setRawValue: function(value) {
		var me = this, 
			percentage;
		me.rawValue = Ext.isObject(value) ? Ext.clone(value) : value;
		percentage = this.getProgressBarPercentage()*1;
		if (me.rendered) {
			var progressbar = me.inputEl.down('.'+me.progressBarCls);
			progressbar.stopAnimation();
			progressbar.setWidth(0).removeCls(me.warningCls + ' ' + me.alertCls);

			if (percentage > me.alertPercentage) {
				progressbar.addCls(me.alertCls);
			} else if (percentage > me.warningPercentage) {
				progressbar.addCls(me.warningCls);
			}
			progressbar.animate({
				duration: 500,
				from: {
					width: 0
				},
				to: {
					width: percentage+ '%'
				}
			});
			me.inputEl.down('.'+me.progressTextCls).dom.innerHTML = me.getDisplayValue();
			//me.updateLayout();
		}
		return value;
	},
	
	getProgressBarPercentage: function() {
        var value = this.getRawValue(),
            size = 0;
		if (Ext.isNumeric(value)) {
			size = value*100;
		} else if (Ext.isObject(value)) {
			size = Math.round(value[this.valueField]*100/value.total);
		}
		return size;
	},
	
    getDisplayValue: function() {
        var value = this.getRawValue(),
            display;
		if (Ext.isObject(value)) {
			if (this.units == '%') {
				display = Math.round(value[this.valueField]*100/value.total);
			} else {
				display = value[this.valueField] + ' of ' + value.total;
			}
		} else if (Ext.isNumeric(value)) {
			display = Math.round(value*100);
		}
        if (display !== undefined) {
			display += ' ' + this.units;
		}
		
        return display !== undefined ? display : this.emptyText;
    },
	
	setText: function(text) {
		var me = this;
		if (me.rendered) {
			me.inputEl.down('.'+me.progressTextCls).dom.innerHTML = text;
		}
	},
	
    valueToRaw: function(value) {
        return value;
    }
});
