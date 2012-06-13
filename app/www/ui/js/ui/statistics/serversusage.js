Scalr.regPage('Scalr.ui.statistics.serversusage', function (loadParams, moduleParams) {
	var pricing = moduleParams['price'];
	var totalSpent = function (records, operations, success){
		panel.down('#totalSpent').removeAll();
		panel.down('#totalSpent').add({
			value: '&nbsp;',
			flex: 1
		});
		var total = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
		for (var i = 0; i<records.length; i++) {
			Ext.each(total, function(month){
				if (pricing[records[i].get('cloudLocation')] && pricing[records[i].get('cloudLocation')][records[i].get('instanceType')] && records[i].get('usage')[month]) {
					if (total[month] != undefined)
						total[month] += (pricing[records[i].get('cloudLocation')][records[i].get('instanceType')]*records[i].get('usage')[month]);
					else 
						total[month] = (pricing[records[i].get('cloudLocation')][records[i].get('instanceType')]*records[i].get('usage')[month]);
				}
			});
		}
		if(records.length) {
			panel.down('#totalSpent').removeAll();
			panel.down('#totalSpent').add({
				value: 'Total spent:',
				width: 280
			});
			Ext.each(total, function(month)	{
				if(total[month])
					panel.down('#totalSpent').add({
						value: '<div style= "width: 120px;"><center>$' + Ext.util.Format.round(total[month], 2) + '</center></div>'
					});
				else 
					panel.down('#totalSpent').add({
						value: '<div style= "width: 120px;"><center>$0</center></div>'
					});
			});
		}
	}
	var today = new Date();
	var store = Ext.create('store.store', {
		fields: [ 'cloudLocation', 'instanceType', 'usage'],
		proxy: {
			type: 'scalr.paging',
			extraParams: {year: today.getFullYear(), envId: Scalr.user.envId, farmId: loadParams.farmId ? loadParams.farmId : 0},
			url: '/statistics/xListServersUsage'
		}
	});
	var farmStore = Ext.create('store.store', {
		fields: ['id', 'name'],
		proxy: {
			type: 'ajax',
			reader: {
				type: 'json',
				root: 'data'
			},
			url: '/statistics/xListFarms',
			extraParams: {envId: Scalr.user.envId}
		}
	});
	var panel = new Ext.create('Ext.grid.Panel', {
		title: 'Servers Usage Statistics (instance / hours)',
		scalrOptions: {
			'reload': false,
			'maximize': 'all'
		},
		scalrReconfigure: function (loadParams) {
			Ext.applyIf(loadParams, { farmId: this.down('#farmId').getValue() });
			Ext.apply(this.store.proxy.extraParams, loadParams);
			
			this.down('#farmId').setValue(this.store.proxy.extraParams['farmId']);
		},
		store: store,
		stateId: 'grid-statistics-serversusage-view',
		plugins: {
			ptype: 'gridstore'
		},
		viewConfig: {
			emptyText: 'No statistics found'
		},
		columns: [
			{ xtype: 'templatecolumn', text: "Cloud Location / Instance Type", flex: 2, dataIndex: 'cloudLocation', sortable: true, tpl: new Ext.XTemplate('<tpl>{cloudLocation} / {instanceType} ({[this.price(values.cloudLocation, values.instanceType)]})</tpl>',
				{ 
					price :  function (location, insType) {
                        if(pricing[location] && pricing[location][insType])
						    return '$' + pricing[location][insType] + ' / hour';
                        else
                            return 'unknown';
					}
				})
			},
			{ xtype: 'templatecolumn', text: "January", width: 120, dataIndex: 'Jan', sortable: false,
			 tpl: '<tpl if="usage.Jan"><center>{usage.Jan}</center></tpl><tpl if="!usage.Jan"><center><img src="/ui/images/icons/false.png" /></center></tpl>'},
			{ xtype: 'templatecolumn', text: "February", width: 120, dataIndex: 'Feb', sortable: false,
			 tpl: '<tpl if="usage.Feb"><center>{usage.Feb}</center></tpl><tpl if="!usage.Feb"><center><img src="/ui/images/icons/false.png" /></center></tpl>' },
			{ xtype: 'templatecolumn', text: "March", width: 120, dataIndex: 'Mar', sortable: false,
			 tpl: '<tpl if="usage.Mar"><center>{usage.Mar}</center></tpl><tpl if="!usage.Mar"><center><img src="/ui/images/icons/false.png" /></center></tpl>' },
			{ xtype: 'templatecolumn', text: "April", width: 120, dataIndex: 'Apr', sortable: false,
			 tpl: '<tpl if="usage.Apr"><center>{usage.Apr}</center></tpl><tpl if="!usage.Apr"><center><img src="/ui/images/icons/false.png" /></center></tpl>' },
			{ xtype: 'templatecolumn', text: "May", width: 120, dataIndex: 'May', sortable: false,
			 tpl: '<tpl if="usage.May"><center>{usage.May}</center></tpl><tpl if="!usage.May"><center><img src="/ui/images/icons/false.png" /></center></tpl>' },
			{ xtype: 'templatecolumn', text: "June", width: 120, dataIndex: 'Jun', sortable: false,
			 tpl: '<tpl if="usage.Jun"><center>{usage.Jun}</center></tpl><tpl if="!usage.Jun"><center><img src="/ui/images/icons/false.png" /></center></tpl>' },
			{ xtype: 'templatecolumn', text: "July", width: 120, dataIndex: 'Jul', sortable: false,
			 tpl: '<tpl if="usage.Jul"><center>{usage.Jul}</center></tpl><tpl if="!usage.Jul"><center><img src="/ui/images/icons/false.png" /></center></tpl>' },
			{ xtype: 'templatecolumn', text: "August", width: 120, dataIndex: 'Aug', sortable: false,
			 tpl: '<tpl if="usage.Aug"><center>{usage.Aug}</center></tpl><tpl if="!usage.Aug"><center><img src="/ui/images/icons/false.png" /></center></tpl>' },
			{ xtype: 'templatecolumn', text: "September", width: 120, dataIndex: 'Sep', sortable: false,
			 tpl: '<tpl if="usage.Sep"><center>{usage.Sep}</center></tpl><tpl if="!usage.Sep"><center><img src="/ui/images/icons/false.png" /></center></tpl>' },
			{ xtype: 'templatecolumn', text: "October", width: 120, dataIndex: 'Oct', sortable: false,
			 tpl: '<tpl if="usage.Oct"><center>{usage.Oct}</center></tpl><tpl if="!usage.Oct"><center><img src="/ui/images/icons/false.png" /></center></tpl>' },
			{ xtype: 'templatecolumn', text: "November", width: 120, dataIndex: 'Nov', sortable: false,
			 tpl: '<tpl if="usage.Nov"><center>{usage.Nov}</center></tpl><tpl if="!usage.Nov"><center><img src="/ui/images/icons/false.png" /></center></tpl>' },
			{ xtype: 'templatecolumn', text: "December", width: 120, dataIndex: 'Dec', sortable: false,
			 tpl: '<tpl if="usage.Dec"><center>{usage.Dec}</center></tpl><tpl if="!usage.Dec"><center><img src="/ui/images/icons/false.png" /></center></tpl>' }
		],
		dockedItems: [{
			xtype: 'toolbar',
			height: 27,
			dock: 'top',
			items: [{
				xtype: 'combo',
				fieldLabel: 'Year',
				labelWidth: 30,
				store: moduleParams.years,
				valueField: 'name',
				displayField: 'name',
				editable: false,
				value: today.getFullYear().toString(),
				queryMode: 'local',
				itemId: 'years',
				iconCls: 'no-icon',
				listeners: {
					change: function(field, value) {
						store.proxy.extraParams.year = value;
						store.load(totalSpent);
					}
				}
			}, '-', {
				xtype: Scalr.user.type == 'AccountOwner' ? 'combo' : 'displayfield',
				fieldLabel: 'Environment',
				labelWidth: 70,
				store: {
					fields: ['id', 'name'],
					data: moduleParams.env,
					proxy: 'object'
				},
				valueField: 'id',
				displayField: 'name',
				editable: false,
				value: Scalr.user.type == 'AccountOwner' ? Scalr.user.envId : moduleParams.env[Scalr.user.envId],
				queryMode: 'local',
				itemId: 'envId',
				iconCls: 'no-icon',
				listeners: {
					change: function(field, value) {
						store.proxy.extraParams.envId = farmStore.proxy.extraParams.envId = value;
						var farmId = field.up().down('#farmId').getValue();
						field.up().down('#farmId').setValue('0');
						farmStore.load();
						if(farmId == '0')
							store.load(totalSpent);
					}
				}
			},'-', {
				xtype: 'combo',
				fieldLabel: 'Farm',
				labelWidth: 40,
				store: farmStore,
				valueField: 'id',
				displayField: 'name',
				editable: false,
				value: loadParams['farmId'] || '0',
				queryMode: 'local',
				itemId: 'farmId',
				iconCls: 'no-icon',
				listConfig: {
					width: 'auto',
					minWidth: 150
				},
				listeners: {
					change: function(field, value) {
						store.proxy.extraParams.farmId = value;
						store.load(totalSpent);
					}
				}
			},'->', {
				text: 'Download Statistic',
				iconCls: 'scalr-ui-btn-icon-download',
				handler: function () {
					var params = Scalr.utils.CloneObject(store.proxy.extraParams);
					params['action'] = 'download';
					Scalr.utils.UserLoadFile('/statistics/xListServersUsage?' + Ext.urlEncode(params));
				}
			}]
		},{
			xtype: 'toolbar',
			dock: 'bottom',
			itemId: 'totalSpent',
			defaults: {
				xtype: 'displayfield',
				width: 120,
				height: 20,
				hideLabel: true,
				layout: {
					type: 'hbox',
					pack: 'middle'
				}
			},
			items: [{
				value: '&nbsp;',
				flex: 1
			}]
		}],
		tools: [{
			type: 'refresh',
			handler: function () {
				Scalr.event.fireEvent('refresh');
			}
		}]
	});
	farmStore.load();
	store.load(totalSpent);
	return panel;
});