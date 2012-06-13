Ext.define('Scalr.ui.dashboard.Column', {
	extend: 'Ext.container.Container',
	alias: 'widget.dashboard.column',

	cls: 'scalr-ui-dashboard-container',
	index: 0,
	initComponent: function () {
		this.callParent();
		this.html =
			'<div class = "editpanel">' +
				'<div class = "add" style= "height: 49.5px;" align="center" index=' + this.index + '>' +
				'<a class="linkA"><div class="scalr-ui-dashboard-icon-add-widget"></div>Add widget</a>' +
				'</div>' +
				'<div class = "remove" style= "height: 49.5px;" align="center">' +
				'<a class="linkA"><div class="scalr-menu-icon-delete"></div>Remove column</a>' +
				'</div>' +
				'</div>';
	}

});
Ext.define('Scalr.ui.dashboard.Panel', {
	extend: 'Ext.panel.Panel',
	alias: 'widget.dashpanel',

	cls: 'scalr-ui-dashboard-panel',
	defaultType: 'dashboard.column',
	autoScroll: true,
	border: false,

	layout: {
		type : 'column'
	},

	initComponent : function() {
		this.callParent();

		this.addEvents({
			validatedrop: true,
			beforedragover: true,
			dragover: true,
			beforedrop: true,
			drop: true
		});

		this.on('drop',
			function (dropObject, e) {
				dropObject.panel.setPosition(0, 0);
				//this.savePanel();
				this.doLayout();
			},
		this);
	},

	// Set columnWidth
/*beforeLayout: function() {
		var items = this.layout.getLayoutItems(),
			len = items.length,
			i = 0,
			j = 0,
			item;
		if (items[0]) {
			var allWidth = items[0].up().getWidth();
			for (; i < len; i++) {  ///columns
				item = items[i];
				item.columnWidth = (1 / len);
			}
		}
		return this.callParent(arguments);
	},
*/
	// private
	initEvents : function(){
		this.callParent();
		this.dd = Ext.create('Scalr.ui.dashboard.DropZone', this, this.dropConfig);
	},

	// private
	beforeDestroy : function() {
		if (this.dd) {
			this.dd.unreg();
		}
		Scalr.ui.dashboard.Panel.superclass.beforeDestroy.call(this);
	},

	updateColWidth: function () {
		var items = this.layout.getLayoutItems(),
			len = items.length,
			i = 0,
			j = 0,
			item;
		 if (items[0] && items[0].up()) {
			for (; i < len; i++) {  ///columns
				item = items[i];
				item.columnWidth = (1 / len);
			}
		}
		this.doLayout();
	},

	newCol: function (index) {
		this.add({
			layout: 'anchor',
			index: index || 0,
			margin: '0 5 0 0'
		});
	},

	newWidget: function(type, params) {
		return {
			xtype: type,
			collapsible: true,
			draggable: true,
			addTools: this.setTools,
			layout: 'fit',
			anchor: '100%',
			params: params,
			bodyStyle: {
				background: '#F3F7FC'
			},
			margin: '0 0 5 0'
		};
	},
	setTools: function() { //function for all moduls
		var me = this.up('dashpanel');
		if (this.showSettingsWindow)
			this.tools.push({
				xtype: 'tool',
				type: 'gear',
				handler: function () {
					this.up().up().showSettingsWindow();
				}
			});
		this.tools.push({
			xtype: 'tool',
			type: 'close',
			handler: function(e, toolEl, closePanel) {
				Scalr.Confirm({
					msg: 'Are you sure you want to remove this widget from dashboard?',
					type: 'action',
					success: function() {
						var p = closePanel.up();
						p.el.animate({
							opacity: 0,
							callback: function(){
								p.fireEvent('close', p);
								p[this.closeAction]();
								me.savePanel();
							},
							scope: p
						});
					}
				});
			}
		});
	}
});
Ext.define('Scalr.ui.dashboard.DropZone', {
	extend: 'Ext.dd.DropTarget',

	constructor: function(dash, cfg) {
		this.dash = dash;
		Ext.dd.ScrollManager.register(dash.body);
		Scalr.ui.dashboard.DropZone.superclass.constructor.call(this, dash.body, cfg);
		dash.body.ddScrollConfig = this.ddScrollConfig;
	},

	ddScrollConfig: {
		vthresh: 50,
		hthresh: -1,
		animate: true,
		increment: 200
	},

	createEvent: function(dd, e, data, col, c, pos) {
		return {
			dash: this.dash,
			panel: data.panel,
			columnIndex: col,
			column: c,
			position: pos,
			data: data,
			source: dd,
			rawEvent: e,
			status: this.dropAllowed
		};
	},

	notifyOver: function(dd, e, data) {
		var xy = e.getXY(),
			dash = this.dash,
			proxy = dd.proxy;

		// case column widths
		if (!this.grid) {
			this.grid = this.getGrid();
		}
		// handle case scroll where scrollbars appear during drag
		var cw = dash.body.dom.clientWidth;
		if (!this.lastCW) {
			// set initial client width
			this.lastCW = cw;
		} else if (this.lastCW != cw) {
			// client width has changed, so refresh layout & grid calcs
			this.lastCW = cw;
			//dash.doLayout();
			this.grid = this.getGrid();
		}

		// determine column
		var colIndex = 0,
			colRight = 0,
			cols = this.grid.columnX,
			len = cols.length,
			cmatch = false;

		for (len; colIndex < len; colIndex++) {
			colRight = cols[colIndex].x + cols[colIndex].w;
			if (xy[0] < colRight) {
				cmatch = true;
				break;
			}
		}
		// no match, fix last index
		if (!cmatch) {
			colIndex--;
		}

		// find insert position
		var overWidget, pos = 0,
			h = 0,
			match = false,
			overColumn = dash.items.getAt(colIndex),
			widgets = overColumn.items.items,
			overSelf = false;
		//overColumn.addCls('scalr-ui-dashboard-container-dd');

		len = widgets.length;

		for (len; pos < len; pos++) {
			overWidget = widgets[pos];
			h = overWidget.el.getHeight();
			if (h === 0) {
				overSelf = true;
			} else if ((overWidget.el.getY() + (h / 2)) > xy[1]) {
				match = true;
				break;
			}
		}

		pos = (match && overWidget ? pos : overColumn.items.getCount()) + (overSelf ? -1 : 0);
		var overEvent = this.createEvent(dd, e, data, colIndex, overColumn, pos);

		if (dash.fireEvent('validatedrop', overEvent) !== false && dash.fireEvent('beforedragover', overEvent) !== false) {

			// make sure proxy width is fluid in different width columns
			proxy.getProxy().setWidth('auto');

			if (overWidget) {
				dd.panelProxy.moveProxy(overWidget.el.dom.parentNode, match ? overWidget.el.dom : null);
			} else {
				dd.panelProxy.moveProxy(overColumn.el.dom, null);
			}

			this.lastPos = {
				c: overColumn,
				col: colIndex,
				p: overSelf || (match && overWidget) ? pos : false
			};
			this.scrollPos = dash.body.getScroll();

			dash.fireEvent('dragover', overEvent);
			return overEvent.status;
		} else {
			return overEvent.status;
		}
	},

	notifyOut: function() {
		delete this.grid;
	},

	notifyDrop: function(dd, e, data) {
		delete this.grid;
		if (!this.lastPos) {
			return;
		}
		var c = this.lastPos.c,
			col = this.lastPos.col,
			pos = this.lastPos.p,
			panel = dd.panel,
			dropEvent = this.createEvent(dd, e, data, col, c, pos !== false ? pos : c.items.getCount());

		if (this.dash.fireEvent('validatedrop', dropEvent) !== false &&
			this.dash.fireEvent('beforedrop', dropEvent) !== false) {

			Ext.suspendLayouts();

			// make sure panel is visible prior to inserting so that the layout doesn't ignore it
			panel.el.dom.style.display = '';
			dd.proxy.hide();
			dd.panelProxy.hide();
			var parentCol = panel.up();
			if (pos !== false) {
				c.insert(pos, panel);
			} else {
				c.add(panel);
			}

			Ext.resumeLayouts(true);
			this.dash.fireEvent('drop', dropEvent);

			// scroll position is lost on drop, fix it
			var st = this.scrollPos.top;
			if (st) {
				var d = this.dash.body.dom;
				setTimeout(function() {
						d.scrollTop = st;
					},
					10);
			}
		}
		delete this.lastPos;
		if (parentCol != c)
			panel.up('dashpanel').savePanel(0);
		return true;
	},

	// internal cache of body and column coords
	getGrid: function() {
		var box = this.dash.body.getBox();
		box.columnX = [];
		this.dash.items.each(function(c) {
			box.columnX.push({
				x: c.el.getX(),
				w: c.el.getWidth()
			});
		});
		return box;
	},

	// unregister the dropzone from ScrollManager
	unreg: function() {
		Ext.dd.ScrollManager.unregister(this.dash.body);
		Scalr.ui.dashboard.DropZone.superclass.unreg.call(this);
	}
});

Ext.define('Scalr.ui.dashboard.Farm', {
	extend: 'Ext.panel.Panel',
	alias: 'widget.dashboard.farm',

	title: '<div class="scalr-ui-dashboard-widgets-paneltitle">Farm servers</div>',
	bodyCls: 'scalr-ui-frame',
	bodyPadding: 5,
	defaults: {
		anchor: '100%'
	},
	items: [{
		xtype: 'dataview',
		width: '100%',
		store: {
			fields: [ 'behaviors', 'group', 'servCount', 'farmRoleId', 'farmId', 'roleId'],
			proxy: 'object'
		},
		border: true,
		deferEmptyText: false,
		emptyText: '<div class="scalr-ui-dashboard-farms-nocontent">No servers running</div>',
		loadMask: false,
		itemSelector: 'div.scalr-ui-dashboard-farms-servers',
		tpl: new Ext.XTemplate(
			'<ul class="scalr-ui-dashboard-farms" align="center">' +
				'<tpl for=".">' +
				'<li>' +
				'<a href="#/farms/{farmId}/roles/{farmRoleId}/view"><div class="icon" ><img src="/ui/images/ui/dashboard/{[this.getLocationIcon(values)]}.png" title="{behaviors}"/></div></a>' +
				'<a href="#/servers/view?farmId={farmId}&farmRoleId={farmRoleId}"><div class="count">{servCount}</div></a>' +
				'<p class="scalr-ui-dashboard-farms-text" style="margin-top: 11px;">{[this.getBehaviorName(values)]}</p>' +
				'</li>' +
				'</tpl>' +
				'</ul>',
			{
				getBehaviorName: function (values) {
					if (values['behaviors'].length < 10)
						return values['behaviors'];
					else {
						return Ext.util.Format.substr(values['behaviors'], 0, 4) + '...' + Ext.util.Format.substr(values['behaviors'], values['behaviors'].length - 3, 3);
					}

				},
				getLocationIcon: function (values) {
					var groups = [ "base", "database", "app", "lb", "cache", "mixed", "utils", "cloudfoundry"];
					var behaviors = [
						"cf_cchm",
						"cf_dea",
						"cf_router",
						"cf_service",
						"mq_rabbitmq",
						"lb_www",
						"app_app",
						"app_tomcat",
						"utils_mysqlproxy",
						"cache_memcached",
						"database_cassandra",
						"database_mysql",
						"database_postgresql",
						"database_redis",
						"database_mongodb"
					];

					//Handle CF all-in-one role
					if (values['behaviors'].match("cf_router") && values['behaviors'].match("cf_cloud_controller") && values['behaviors'].match("cf_health_manager") && values['behaviors'].match("cf_dea"))
						return "behaviors/cloudfoundry_cf_all-in-one";

					//Handle CF CCHM role
					if (values['behaviors'].match("cf_cloud_controller") || values['behaviors'].match("cf_health_manager"))
						return "behaviors/cloudfoundry_cf_cchm";

					var b = (values['behaviors'] || '').split(','), key;
					for (var i = 0, len = b.length; i < len; i++) {
						key = values['group'] + '_' + b[i];
						key2 = b[i];

						for (var k = 0; k < behaviors.length; k++ ) {
							if (behaviors[k] == key || behaviors[k] == key2)
								return 'behaviors/' + key;
						}
					}

					for (var i = 0; i < groups.length; i++ ) {
						if (groups[i] == values['group'])
							return 'groups/' + groups[i];
					}
				}
			})
	}],
	widgetType: 'local',
	widgetUpdate: function (content) {
		if (content['servers'])
			this.down('dataview').store.load({
				data: content['servers']
			});
		this.title = '<div class="scalr-ui-dashboard-widgets-paneltitle">Farm ' + content['name'] + '</div>';
	}
});

Ext.define('Scalr.ui.dashboard.Monitoring', {
	extend: 'Ext.panel.Panel',
	alias: 'widget.dashboard.monitoring',

	title: '<div class="scalr-ui-dashboard-widgets-paneltitle">Monitoring</div>',
	widgetType: 'local',
	widgetUpdate: function (content) {
		this.title = this.params['title'];
		if (this.params['height'])
			this.setHeight(this.params['height']);
		if (content['msg']) {
			if (content['type'] && content['type'] == 'error') {
				if(this.body)
					this.body.update('<div style="position: relative; top: 48%; text-align: center; width: 100%; height: 50%;"><font color = "red">' + content.msg + '</font></div>');
				else
					this.html = '<div style="position: relative; top: 48%; text-align: center; width: 100%; height: 50%;"><font color = "red">' + content.msg + '</font></div>';
			}
			else {
				if (this.body)
					this.body.update('<div style="position: relative; text-align: center; width: 100%; height: 50%; padding: 3px;"><img src = "' + content.msg + '"/></div>');
				else
					this.html = '<div style="position: relative; text-align: center; width: 100%; height: 50%; padding: 3px;"><img src = "' + content.msg + '"/></div>';
			}
		}
		else {
			if (this.body)
				this.body.update('<div style="position: relative; text-align: center; width: 100%; height: 50%; padding: 3px;"><font color = "red">No info</font></div>');
			else
				this.html = '<div style="position: relative; text-align: center; width: 100%; height: 50%; padding: 3px;"><font color = "red">No info</font></div>';
		}
	}
});

Ext.define('Scalr.ui.dashboard.Announcement', {
	extend: 'Ext.panel.Panel',
	alias: 'widget.dashboard.announcement',

	title: '<div class="scalr-ui-dashboard-widgets-paneltitle">Announcements</div>',
	items: {
		xtype: 'dataview',
		store: {
			fields: ['time','text', 'url', 'newS'],
			proxy: 'object'
		},
		deferEmptyText: false,
		emptyText: '<div class="scalr-ui-dashboard-farms-nocontent">No news</div>',
		loadMask: false,
		itemSelector: 'div.scalr-ui-dashboard-widgets-div',
		tpl: new Ext.XTemplate(
			'<tpl for=".">',
			'<div class="scalr-ui-dashboard-widgets-div',
			'<tpl if="xindex%2==1"> scalr-ui-dashboard-widgets-panelcolor</tpl>',
			'">',
			'<div class="scalr-ui-dashboard-widgets-desc">{time}</div>',
			'<div>' +
				'<a href="{url}" style="text-decoration: none;" target="_blank"><span class="scalr-ui-dashboard-widgets-message-slim">{text}</span></a>' +
				'<tpl if="newS"><span style=" margin-left: 5px; cursor: pointer;" class="scalr-ui-dashboard-widgets-info">New</span></tpl>' +
				'</div>',
			'</div>',
			'</tpl>'
		)
	},
	widgetType: 'local',
	widgetUpdate: function (content) {
		if (!this.params || !this.params['newsCount'])
			this.params = {'newsCount': 5};
		this.down('dataview').store.load({
			data: content
		});
	},
	showSettingsWindow: function () {
		if (!this.params || !this.params['newsCount'])
			this.params = {'newsCount': 5};
		Scalr.Confirm({
			form: [{
				xtype: 'combo',
				margin: 5,
				store: [1, 2, 5, 10],
				fieldLabel: 'Number of news:',
				labelWidth: 120,
				editable: false,
				value: this.params['newsCount'],
				queryMode: 'local',
				name: 'newsCount',
				anchor: '100%'
			}],
			title: 'Settings',
			success: function (data) {
				if (data['newsCount']) {
					this.params = {'newsCount': data['newsCount']};
					this.up('dashpanel').savePanel(1);
				}
			},
			scope: this
		});
	}
});

Ext.define('Scalr.ui.dashboard.LastErrors', {
	extend: 'Ext.panel.Panel',
	alias: 'widget.dashboard.lasterrors',

	title: '<div class="scalr-ui-dashboard-widgets-paneltitle">Last errors</div>',
	autoScroll: true,
	items: {
		xtype: 'dataview',
		store: {
			fields: [ 'message', 'time'],
			proxy: 'object'
		},
		deferEmptyText: false,
		emptyText: '<div class="scalr-ui-dashboard-farms-nocontent">No errors</div>',
		loadMask: false,
		itemSelector: 'div.scalr-ui-dashboard-widgets-div',
		tpl: new Ext.XTemplate(
			'<tpl for=".">',
			'<div title = "{message}" class="scalr-ui-dashboard-widgets-div',
			'<tpl if="xindex%2==1"> scalr-ui-dashboard-widgets-panelcolor</tpl>',
			'">',
			'<div class="scalr-ui-dashboard-widgets-desc">{time}</div>',
			'<div><span class="scalr-ui-dashboard-widgets-message-slim">{message}</span></div>',
			'</div>',
			'</tpl>'
		)
	},
	widgetType: 'local',
	widgetUpdate: function (content) {
		if (!this.params || !this.params['errorCount'])
			this.params = {'errorCount': 10};
		this.down('dataview').store.load({
			data: content
		});
	},
	showSettingsWindow: function () {
		if (!this.params || !this.params['errorCount'])
			this.params = {errorCount: 10};
		Scalr.Confirm({
			form: [{
				xtype: 'combo',
				margin: 5,
				store: [5, 10, 15, 20, 50, 100],
				fieldLabel: 'Number of errors:',
				labelWidth: 120,
				editable: false,
				value: this.params['errorCount'],
				queryMode: 'local',
				name: 'errorCount',
				anchor: '100%'
			}],
			title: 'Settings',
			success: function (data) {
				if (data['errorCount']) {
					this.params = {'errorCount': data['errorCount']};
					this.up('dashpanel').savePanel(1);
				}
			},
			scope: this
		});
	}
});

Ext.define('Scalr.ui.dashboard.UsageLastStat', {
	extend: 'Ext.panel.Panel',
	alias: 'widget.dashboard.usagelaststat',

	title: '<div class="scalr-ui-dashboard-widgets-paneltitle">Servers Usage Statistics</div>',
	autoScroll: true,
	minHeight: 120,
	items: {
		xtype: 'gridpanel',
		border: false,
		store: {
			fields: ['farm', 'farm_id', 'current', 'recent'],
			proxy: 'object',
			data: []
		},
		columns: [{
			header: 'Farm',
			hideable: false,
			xtype: 'templatecolumn',
			dataIndex: 'farm',
			flex: 3,
			cls: 'scalr-ui-dashboard-widgets-usage-title',
			tpl: '<span class="scalr-ui-dashboard-widgets-message" style = "display: block; margin-right: 7px;"><a href="#/farms/{farm_id}/view">{farm}</a></span>'
		}, {
			header: 'This month',
			hideable: false,
			xtype: 'templatecolumn',
			dataIndex: 'current',
			cls: 'scalr-ui-dashboard-widgets-usage-title',
			tpl: '<span class="scalr-ui-dashboard-widgets-message" style = "display: block; "><tpl if="current"><a href="#/statistics/serversusage?farmId={farm_id}">${current}</a></tpl><tpl if="!current"><img src="/ui/images/icons/false.png" /></tpl></span>'
		}, {
			header: 'Last month',
			hideable: false,
			xtype: 'templatecolumn',
			dataIndex: 'recent',
			cls: 'scalr-ui-dashboard-widgets-usage-title',
			tpl: '<span class="scalr-ui-dashboard-widgets-message" style="display: block;"><tpl if="recent"><a href="#/statistics/serversusage?farmId={farm_id}">${recent}</a></tpl><tpl if="!recent"><img src="/ui/images/icons/false.png" /></tpl></span>'
		}],
		viewConfig: {
			emptyText: 'No statistics found',
			deferEmptyText: false,
			getRowClass: function(rec, rowIdx, params, store) {
				return rowIdx%2==1 ? 'scalr-ui-dashboard-back' : '';
			}
		},
		plugins: {
			ptype: 'gridstore'
		},
		listeners: {
			columnresize: function (ct, col, w) {
				this.up().down('#' + col.dataIndex + 'Total').setWidth(w);
			},
			resize: function (comp, adjW, adjH, eOpts) {
				this.up().down('#farmTotal').setWidth((comp.headerCt.container.getWidth() - comp.headerCt.items.getAt(1).getWidth() - comp.headerCt.items.getAt(2).getWidth()));
				this.up().down('#currentTotal').setWidth(comp.headerCt.items.getAt(1).getWidth());
				this.up().down('#recentTotal').setWidth(comp.headerCt.items.getAt(2).getWidth());
			}
		}
	},
	onBoxReady: function () {
		this.down('#farmTotal').setWidth((this.down('gridpanel').headerCt.container.getWidth() - this.down('gridpanel').headerCt.items.getAt(1).getWidth() - this.down('gridpanel').headerCt.items.getAt(2).getWidth()));
		this.down('#currentTotal').setWidth(this.down('gridpanel').headerCt.items.getAt(1).width);
		this.down('#recentTotal').setWidth(this.down('gridpanel').headerCt.items.getAt(2).width);
		if (!this.params || !this.params['farmCount'])
			this.params = {'farmCount': 5};
		this.callParent();
	},
	dockedItems: [{
		xtype: 'container',
		dock: 'bottom',
		cls: 'scalr-ui-docked-bottombar',
		height: 27,
		padding: '0 0 0 5',
		layout: {
			type: 'hbox',
			pack: 'start'
		},
		defaults: {
			hideLabel: true,
			xtype: 'displayfield',
			height: 26
		},
		items: [{
			itemId: 'farmTotal',
			fieldCls: '',
			value: '<span class="scalr-ui-dashboard-widgets-message">Total spent:</span>'
		}, {
			itemId: 'currentTotal'
		}, {
			itemId: 'recentTotal'
		}]
	}],
	widgetType: 'local',
	widgetUpdate: function (content) {
		if (content['farms']) {
			this.down('gridpanel').store.load({
				data: content['farms']
			});
			this.down('#currentTotal').update(content['total']);
			this.down('#recentTotal').update(content['total']);
		}
	},
	showSettingsWindow: function () {
		if (!this.params || !this.params['farmCount'])
			this.params = {'farmCount': 5};
		Scalr.Confirm({
			form: [{
				xtype: 'combo',
				margin: 5,
				store: [1, 2, 5, 10, 15, 20, 'all'],
				fieldLabel: 'Number of farms:',
				labelWidth: 120,
				editable: false,
				value: this.params['farmCount'],
				queryMode: 'local',
				name: 'farmCount',
				anchor: '100%'
			}],
			title: 'Settings',
			success: function (data) {
				if (data['farmCount']) {
					this.params = {'farmCount': data['farmCount']};
					this.up('dashpanel').savePanel(1);
				}
			},
			scope: this
		});
	}
});

Ext.define('Scalr.ui.dashboard.Billing', {
	extend: 'Ext.form.Panel',
	alias: 'widget.dashboard.billing',

	title: '<div class="scalr-ui-dashboard-widgets-paneltitle">Billing</div>',
	items: [{
		xtype: 'dashboard.loading',
		height: '99%',
		itemId: 'loadI'
	}],
	tpl: new Ext.XTemplate('Open Source'),
	widgetType: 'nonlocal',
	onBoxReady: function () {
		if (!this.collapsed)
			this.loadContent();
		this.callParent();
	},
	listeners: {
		expand: function () {
			this.loadContent();
		}
	},
	loadContent: function () {
		this.setHeight(176);
		Scalr.Request({
			url: '/dashboard/widget/billing/xGetContent',
			scope: this,
			success: function (content) {
				if(this.body) {
					this.down('#loadI').hide();
					this.update(content);
				}
			},
			failure: function () {
				if(this.body) {
					this.down('#loadI').hide();
				}
			}
		});
		this.setHeight(140);
		this.doLayout();
	}
});

Ext.define('Scalr.ui.dashboard.Status', {
	extend: 'Ext.panel.Panel',
	alias: 'widget.dashboard.status',

	title: '<div class="scalr-ui-dashboard-widgets-paneltitle"> AWS Health status</div>',
	autoScroll: true,
	autoHeight: true,
	items: [{
		xtype: 'dashboard.loading',
		height: '99%',
		itemId: 'loadI'
	}, {
		xtype: 'gridpanel',
		border: false,
		hidden: true,
		store: {
			fields: ['img', 'status', 'name', 'message', 'locations', 'EC2', 'RDS', "S3"],
			proxy: 'object'
		},
		columns: [{
			text: 'Location',
			flex: 2,
			xtype: 'templatecolumn',
			cls: 'scalr-ui-dashboard-widgets-usage-title',
			tpl: '<span class="scalr-ui-dashboard-widgets-message">{locations}</span>'
		}, {
			text: 'EC2',
			xtype: 'templatecolumn',
			cls: 'scalr-ui-dashboard-widgets-usage-title',
			tpl: '<img src="/ui/images/ui/dashboard/{EC2.img}" title="{EC2.status}">',
			flex: 1
		}, {
			text: 'RDS',
			xtype: 'templatecolumn',
			cls: 'scalr-ui-dashboard-widgets-usage-title',
			tpl: '<img src="/ui/images/ui/dashboard/{RDS.img}" title="{RDS.status}">',
			flex: 1
		}, {
			text: 'S3',
			xtype: 'templatecolumn',
			cls: 'scalr-ui-dashboard-widgets-usage-title',
			tpl: '<img src="/ui/images/ui/dashboard/{S3.img}" title="{S3.status}">',
			flex: 1
		}],
		viewConfig: {
			emptyText: 'No info found',
			deferEmptyText: false,
			getRowClass: function(rec, rowIdx, params, store) {
				return rowIdx%2==1 ? 'scalr-ui-dashboard-back' : '';
			}
		},
		plugins: {
			ptype: 'gridstore'
		}
	}],
	widgetType: 'nonlocal',
	loadContent: function () {
		this.down('#loadI').show();
		this.down('gridpanel').hide();
		if (!this.params || !this.params['locations'])
			this.getUsedLocations();
		Scalr.Request({
			url: '/dashboard/widget/status/xGetContent',
			scope: this,
			params: {locations: this.params ? this.params['locations'] : ''},
			success: function (content) {
				if(this.down('gridpanel')) {
					this.down('#loadI').hide();
					this.down('gridpanel').show();
					if (content['result'])
						this.down('gridpanel').store.load({
							data: content['result']
						});
					else
						this.down('gridpanel').store.load({
							data: []
						});
				}
			},
			failure: function () {
				if (this.down('gridpanel')) {
					this.down('#loadI').hide();
					this.down('gridpanel').show();
				}
			}
		});
		this.doLayout();
	},

	listeners: {
		expand: function () {
			if (!this.down('#loadI').hidden)
				this.loadContent();
		}
	},

	onBoxReady: function () {
		if (!this.collapsed)
			this.loadContent();
		this.callParent();
	},

	getUsedLocations: function () {
		var me = this;
		Scalr.Request({
			url: '/dashboard/widget/status/xGetUsedLocations',
			scope: this,
			success: function (data) {
				me.params = {locations: data['locations']};
			}
		});
	},

	addSettingsForm: function () {
		var settingsForm = new Ext.form.FieldSet({
			title: 'Choose location(s) to show',
			items: {
				xtype: 'checkboxgroup',
				columns: 3,
				vertical: true,
				labelWidth: 150
			}
		});
		if (!this.params || !this.params['locations'])
			this.getUsedLocations();
		var locations = this.params['locations'];
		for (var i in this.locations) {
			settingsForm.down('checkboxgroup').add({
				xtype: 'checkbox',
				boxLabel: i,
				name: 'locations',
				inputValue: i,
				checked: locations.indexOf(i)!=-1 ? true: false
			});
		}
		return settingsForm;
	},

	showSettingsWindow: function () {
		Scalr.Request({
			url: '/dashboard/widget/status/xGetLocations',
			scope: this,
			success: function (locationData) {
				if (locationData['locations']) {
					this.locations = locationData['locations'];
					Scalr.Confirm({
						form: this.locations ? this.addSettingsForm() : {xtype: 'displayfield', value: 'No locations to select'},
						title: 'Settings',
						padding: 5,
						success: function (formValues) {
							if(formValues.locations){
								var locations = [];
								if (Ext.isArray(formValues.locations)) {
									for(var i = 0; i < formValues.locations.length; i++) {
										locations.push(formValues.locations[i]);
									}
								} else
									locations.push(formValues.locations);
								this.params = {'locations': Ext.encode(locations)};
								this.up('dashpanel').savePanel(0);
								if (!this.collapsed)
									this.loadContent();
							}
						},
						scope: this
					});
				}
				else {
					Scalr.Confirm({
						title: 'No locations',
						msg: 'No locations to select',
						type: 'action'
					});
				}
			},
			failure: function() {
				Scalr.Confirm({
					title: 'No locations',
					msg: 'No locations to select',
					type: 'action'
				});
			}
		});
	}
});
Ext.define('Scalr.ui.dashboard.tutorFarm', {
	extend: 'Ext.panel.Panel',
	alias: 'widget.dashboard.tutorfarm',

	title: '<div class="scalr-ui-dashboard-widgets-paneltitle">Farms</div>',
	bodyCls: 'scalr-ui-frame',
	items: [{
		xtype: 'panel',
		border: false,
		html:
			'<div style="float: left; width: 55%; padding: 30px 0px 25px 25px; height: 150px;">' +
				'<span class="scalr-ui-dashboard-tutor-message" style="margin-left: 17px;">New to Scalr?</span>' +
				'<br/><br/><span class="scalr-ui-dashboard-tutor-message-big">Create a farm</span>' +
				'</div>' +
				'<a href="#/farms/build"><div style="float: left; width: 40%; margin-top: 10px; height: 115px; background: url(\'ui/images/ui/dashboard/create_farm.png\') no-repeat;" align="center">' +
				'</div></a>' +
				'<div style="width: 5%; float: left; height: 100%; padding-left: 5px;">' +
				'<div class="scalr-menu-icon-help" style="cursor: pointer; position: absolute; top: 115px;" align="right"></div>' +
				'</div>'
	}, {
		xtype: 'panel',
		margin: '10 0 0 0',
		itemId: 'tutorFarmInfo',
		hidden: true,
		autoScroll: true,
		border: false,
		height: 230,
		html:
			'<div class="scalr-ui-dashboard-tutor-desc"><span class="scalr-ui-dashboard-tutor-title">Farms</span><br/>' +
				'<br/>To create a farm, simply click on this widget or go to <a href="#/farms/build"> Server Farms > Build New</a>.<br/><br/>' +
				'In Scalr, farms are logical unit that allow you to group a set of configurati on and behavior according to which your servers should behave. With Scalr\'s terminology, farms are simply set of roles.' +
				'<br/><br/><span class="scalr-ui-dashboard-tutor-title">Roles</span><br/>' +
				'Roles are core concepts in Scalr and fundamental components of your architecture.They are images that define the behavior of your servers. As in object-oriented programming, a role is used as a blueprint to create instances of itself.' +
				'<br/><br/><a href="#/farms/build"><span class="scalr-ui-dashboard-tutor-title">Farm Builder</span></a><br/>' +
				'Start by naming your farm and click on the Role tab. Here, you will be asked to add roles. If you are getting started with Scalr, you should still have a list of pre-made roles ready to be added to your farm. Let us take the example of a classic three-tier web stack. In Scalr, each tier corresponds to a separate role. First comes the load balancing tier that can be added to a farm by clicking the *Add* button on the NGINX load-balancer role. Then comes the application tier. Simply add an Apache+Ubuntu 64bit role to the farm. The same can be done for the database tier by adding a MySQL on Ubuntu 64bit role. In this example a role comprises the operating system and the software that will give the role its specific behavior.' +
				'<br/><br/>Once you’ve added all your roles you will need to configure them. To do so, simply click on the role icon. For more information on all the configurations, please visit our wiki.' +
				'<br/><br/>You might wonder: what exactly does adding these roles to the farm do? Well it does not actually do anything. It simply creates the blueprint from which your farm will be launched. To launch it, simply hit Save at the bottom of the page and Launch in the drop down Options menu.' +
				'</div>'
	}],
	onBoxReady: function () {
		var tutorpanel = this;
		this.body.on('click', function(e, el, obj) {
			if (e.getTarget('div.scalr-menu-icon-help'))
			{
				if (tutorpanel.down('#tutorFarmInfo').hidden) {
					tutorpanel.down('#tutorFarmInfo').el.slideIn('t');
					tutorpanel.down('#tutorFarmInfo').show();
				} else {
					tutorpanel.down('#tutorFarmInfo').el.slideOut('t', {easing: 'easeOut'});
					tutorpanel.down('#tutorFarmInfo').hide();
				}
				tutorpanel.up('dashpanel').doLayout();
			}
		});
		this.doLayout();
		this.callParent();
	}
});
Ext.define('Scalr.ui.dashboard.tutorApp', {
	extend: 'Ext.panel.Panel',
	alias: 'widget.dashboard.tutorapp',

	title: '<div class="scalr-ui-dashboard-widgets-paneltitle">Applications</div>',
	bodyCls: 'scalr-ui-frame',
	items: [{
		xtype: 'panel',
		border: false,
		html:
			'<div style="float: left; width: 58%; padding: 30px 0px 25px 25px; height: 150px;">' +
				'<span class="scalr-ui-dashboard-tutor-message" style="margin-left: 17px;">No app running?</span>' +
				'<br/><br/><span class="scalr-ui-dashboard-tutor-message-big">Deploy your code</span>' +
			'</div>' +
			'<a href="#/dm/applications/view"><div style=" float: left; width: 37%; margin-top: 10px; height: 115px; background: url(\'ui/images/ui/dashboard/deploy_code.png\') no-repeat;" align="center">' +
			'</div></a>' +
			'<div style="width: 5%; float: left; height: 100%; padding-left: 5px;">' +
				'<div class="scalr-menu-icon-help" style="cursor: pointer; position: absolute; top: 115px;" align="right"></div>' +
				'</div>'
	}, {
		xtype: 'panel',
		margin: '10 0 0 0',
		itemId: 'tutorAppInfo',
		hidden: true,
		autoScroll: true,
		border: false,
		height: 230,
		html:
			'<div class="scalr-ui-dashboard-tutor-desc"><span class="scalr-ui-dashboard-tutor-title">Application</span><br/>' +
				'<br/>You can use Scalr\'s deployment functionality to orchestrate code deployments to your farms. To do so, simply go to <a href="#/dm/tasks/view">Websites > Deployments</a>.' +
				'<br/>Within Scalr, Deployments are implemented through Sources and Applications.' +
				'<br/><br/><a href="#/dm/sources/view"><span class="scalr-ui-dashboard-tutor-title">Sources</span></a>' +
				'<br/>A source in Scalr is a path to your application’s source code. This can be Git, SVN, or simply HTTP. When you add a source, you have the option of providing authentication if your source is protected. You can have multiple sources for the testing or stable branches of your code.' +
				'<br/><br/>Depending on the type of source you chose, your code will be deployed:' +
				'<br/>- with a simple download (http);' +
				'<br/>- with svn checkout the first time, then svn update (svn);' +
				'<br/>- with git clone the first time, then git pull (git).' +
				'<br/><br/>To automatically deploy code when you push to your repository, you can set post-commit hooks in svn and git that trigger a new deployment.' +
				'<br/><br/><a href="#/dm/applications/view"><span class="scalr-ui-dashboard-tutor-title">Applications</span></a>' +
				'<br/>We assume that everyone is familiar with the concept of application: this is simply the' +
				'software that you want to run on your servers. In Scalr, an application is an object that has one or several *sources* attached to it and to which you can apply pre and post deploy scripts. This object can then be deployed on the instances of a specific role in a given farm. ' +
				'</div>'
	}],
	onBoxReady: function () {
		var tutorpanel = this;
		this.body.on('click', function(e, el, obj) {
			if (e.getTarget('div.scalr-menu-icon-help'))
			{
				if (tutorpanel.down('#tutorAppInfo').hidden) {
					tutorpanel.down('#tutorAppInfo').show();
					tutorpanel.down('#tutorAppInfo').el.slideIn('t');
				} else {
					tutorpanel.down('#tutorAppInfo').el.slideOut('t', {easing: 'easeOut'});
					tutorpanel.down('#tutorAppInfo').hide();
				}
			}
		});
		this.doLayout();
		this.callParent();
	}
});

Ext.define('Scalr.ui.dashboard.tutorDnsZones', {
	extend: 'Ext.panel.Panel',
	alias: 'widget.dashboard.tutordns',

	title: '<div class="scalr-ui-dashboard-widgets-paneltitle">DNS Zones</div>',
	bodyCls: 'scalr-ui-frame',
	items: [{
		xtype: 'panel',
		border: false,
		html:
			'<div style="float: left; width: 55%; padding: 30px 0px 25px 25px; height: 150px;">' +
				'<span class="scalr-ui-dashboard-tutor-message">Let us manage your</span>' +
				'<br/><br/><span class="scalr-ui-dashboard-tutor-message-big" style="margin-left: 30px;">DNS zones</span>' +
			'</div>' +
			'<a href="#/dnszones/view"><div style="float: left; width: 40%; margin-top: 10px; height: 115px; background: url(\'ui/images/ui/dashboard/dns_zone.png\') no-repeat;" align="center">' +
			'</div></a>'+
			'<div style="width: 5%; float: left; height: 100%; padding-left: 5px;">' +
				'<div class="scalr-menu-icon-help" style="cursor: pointer; position: absolute; top: 115px;" align="right"></div>' +
				'</div>'
	}, {
		xtype: 'panel',
		margin: '10 0 0 0',
		itemId: 'tutorDnsInfo',
		hidden: true,
		autoScroll: true,
		border: false,
		height: 230,
		html:
			'<div class="scalr-ui-dashboard-tutor-desc"><span class="scalr-ui-dashboard-tutor-title">DNS Management</span><br/>' +
				'<br/>Scalr provides an out-of-the-box DNS Management tool. To use it, you\'ll need to log in to your registrar and point your domain to Scalr\'s name servers.' +
				'<br/><br/>Create \'IN NS\' records on nameservers authoritative for your root domain:' +
				'<br/>- beta.yourdomain.com. IN NS ns1.scalr.net.' +
				'<br/>- beta.yourdomain.com. IN NS ns2.scalr.net.' +
				'<br/>- beta.yourdomain.com. IN NS ns3.scalr.net.' +
				'<br/>- beta.yourdomain.com. IN NS ns4.scalr.net.' +
				'<br/>Create \'beta.yourdomain.com\' DNS zone in Scalr and point it to desired farm/role.' +
				'<br/>Wait for DNS cache TTL to expire' +
				'<br/><br/>DNS zones are automatically updated by Scalr to reflect the instances you are currently running.' +
				'</div>'
	}],
	onBoxReady: function () {
		var tutorpanel = this;
		this.body.on('click', function(e, el, obj) {
			if (e.getTarget('div.scalr-menu-icon-help'))
			{
				if (tutorpanel.down('#tutorDnsInfo').hidden) {
					tutorpanel.down('#tutorDnsInfo').show();
					tutorpanel.down('#tutorDnsInfo').el.slideIn('t');
				} else {
					tutorpanel.down('#tutorDnsInfo').el.slideOut('t', {easing: 'easeOut'});
					tutorpanel.down('#tutorDnsInfo').hide();
				}
				tutorpanel.up('dashpanel').doLayout();
			}
		});
		this.doLayout();
		this.callParent();
	}
});

Ext.define('Scalr.ui.dashboard.Loading', {
	extend: 'Ext.container.Container',
	alias: 'widget.dashboard.loading',

	width: '100%',
	html: '<br/><div align="center" class="scalr-ui-dashboard-body-loading" style="height: 100px; vertical-align: middle; text-align: center;"><img src="/ui/images/ui/dashboard/load_widget.gif"/><br/><br/>Loading content...</div>'
});
