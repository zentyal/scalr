Scalr.regPage('Scalr.ui.tools.aws.ec2.billing', function (loadParams, moduleParams) {
	var store = Ext.create('store.store', {
		fields: [
			'availZone', 'instanceType', 'scalrInstances', 'totalInstances', 'reservedInstances'
		],
		proxy: {
			type: 'scalr.paging',
			extraParams: loadParams,
			url: '/tools/aws/ec2/billing/xGetDetails/'
		}
	});

	return Ext.create('Ext.grid.Panel', {
		title: 'Tools &raquo; Amazon Web Services &raquo; EC2 &raquo; Reserved instances utilization',
		scalrOptions: {
			'reload': false,
			'maximize': 'all'
		},
		scalrReconfigure: function (loadParams) {
			var nL = {};
			Ext.applyIf(loadParams, nL);
			Ext.apply(this.store.proxy.extraParams, loadParams);
			this.down('#cloudLocation').setValue(this.store.proxy.extraParams.cloudLocation);

			if (Scalr.utils.IsEqualValues(nL, this.store.proxy.extraParams))
				this.store.load();
			else
				this.store.loadPage(1);
		},
		store: store,
		stateId: 'grid-tools-aws-ec2-ebs-volumes-view',
		plugins: {
			ptype: 'gridstore'
		},

		viewConfig: {
			emptyText: 'You have no any running or reserved instances'
		},

		columns: [
			{ header: "Availability zone", width: 120, dataIndex: 'availZone', sortable: true },
			{ header: "Instance type", width: 120, dataIndex: 'instanceType', sortable: true },
			{ header: "Reserved instances", width: 120, dataIndex: 'reservedInstances', sortable: true },
			{ header: "Running instances", width: 120, dataIndex: 'scalrInstances', sortable: true }
		],

		/*
		multiSelect: true,
		selModel: {
			selType: 'selectedmodel',
			selectedMenu: [{
				text: 'Delete',
				iconCls: 'scalr-menu-icon-delete',
				request: {
					confirmBox: {
						msg: 'Delete selected EBS volume(s): %s ?',
						type: 'delete'
					},
					processBox: {
						msg: 'Deleting selected EBS volume(s). Please wait...',
						type: 'delete'
					},
					url: '/tools/aws/ec2/ebs/volumes/xRemove/',
					dataHandler: function (records) {
						var data = [];
						this.confirmBox.objects = [];
						for (var i = 0, len = records.length; i < len; i++) {
							data.push(records[i].get('volumeId'));
							this.confirmBox.objects.push(records[i].get('volumeId'));
						}
						return { volumeId: Ext.encode(data), cloudLocation: store.proxy.extraParams.cloudLocation };
					}
				}
			}]
		},
		 */
		dockedItems: [{
			xtype: 'scalrpagingtoolbar',
			store: store,
			dock: 'top',
			items: ['-', {
				text: 'Filter',
				iconCls: 'scalr-ui-btn-icon-filter',
				menu: [{
					xtype: 'tbfilterfield',
					store: store,
					iconCls: 'no-icon',
					emptyText: 'Filter'
				}, {
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
			}]
		}]
	});
});
