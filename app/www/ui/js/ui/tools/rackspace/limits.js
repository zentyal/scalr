Scalr.regPage('Scalr.ui.tools.rackspace.limits', function (loadParams, moduleParams) {
	var store = Ext.create('store.store', {
		fields: [
			'unit', 'remaining', 'verb', 'regex', 'value', 'resetTime', 'URI'
		],
		proxy: {
			type: 'scalr.paging',
			extraParams: loadParams,
			url: '/tools/rackspace/xListLimits/'
		},
		remoteSort: true
	});

	return Ext.create('Ext.grid.Panel', {
		title: 'Tools &raquo; Rackspace &raquo; Limits',
		scalrOptions: {
			'reload': false,
			'maximize': 'all'
		},
		scalrReconfigure: function (loadParams) {
			var nL = { volumeId: '' };
			Ext.applyIf(loadParams, nL);
			Ext.apply(this.store.proxy.extraParams, loadParams);
			this.down('#cloudLocation').setValue(this.store.proxy.extraParams.cloudLocation);

			if (Scalr.utils.IsEqualValues(nL, this.store.proxy.extraParams))
				this.store.load();
			else
				this.store.loadPage(1);
		},
		store: store,
		stateId: 'grid-tools-rackspace-limits',
		plugins: {
			ptype: 'gridstore'
		},

		viewConfig: {
			emptyText: 'No limits found'
		},

		columns: [
			{ header: "verb", width: 100, dataIndex: 'verb', sortable: false },
			{ header: "Regex", width: 200, dataIndex: 'regex', sortable: false },
			{ header: "Value", width: 150, dataIndex: 'value', sortable: false },
			{ header: "Remaining", width: 120, dataIndex: 'remaining', sortable: false },
			{ header: "unit", width: 150, dataIndex: 'unit', sortable: false },
			{ header: "URI", width: 200, dataIndex: 'URI', sortable: false },
			{ header: "Reset Time", width: 300, dataIndex: 'resetTime', sortable: false }
		],

		dockedItems: [{
			xtype: 'scalrpagingtoolbar',
			store: store,
			dock: 'top',
			items: ['-', {
				text: 'Filter',
				iconCls: 'scalr-ui-btn-icon-filter',
				menu: [{
					xtype: 'fieldcloudlocation',
					itemId: 'cloudLocation',
					store: {
						fields: [ 'id', 'name' ],
						data: moduleParams.locations,
						proxy: 'object'
					},
					gridStore: store,
					cloudLocation: loadParams['cloudLocation'] || ''
				}]
			}, {
				xtype: 'tbfilterinfo'
			}]
		}]
	});
});
