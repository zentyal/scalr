Scalr.regPage('Scalr.ui.farms.builder.tabs.openstack', function (moduleTabParams) {
	return Ext.create('Scalr.ui.FarmsBuilderTab', {
		tabTitle: 'Placement and type',
		cache: {},

		isEnabled: function (record) {
			return record.get('platform') == 'openstack' || record.get('platform') == 'rackspacengus' || record.get('platform') == 'rackspacenguk';
		},

		getDefaultValues: function (record) {
			return {};
		},

		beforeShowTab: function (record, handler) {
			var cloudLocation = record.get('cloud_location');

			if (this.cacheExist(['flavorsOpenstack', cloudLocation]))
				handler();
			else
				Scalr.Request({
					processBox: {
						type: 'action'
					},
					url: '/platforms/openstack/xGetOpenstackResources',
					params: {
						cloudLocation: cloudLocation,
						platform: record.get('platform')
					},
					scope: this,
					success: function (response) {
						this.cacheSet(response.data['flavors'], ['flavorsOpenstack', cloudLocation]);
						if (response.data['ipPools']) {
							this.cacheSet(response.data['ipPools'], ['ipPoolsOpenstack', cloudLocation]);
						}
						handler();
					},
					failure: function () {
						this.deactivateTab();
					}
				});
		},

		showTab: function (record) {
			var settings = record.get('settings');

			this.down('[name="openstack.flavor-id"]').store.load({ data: this.cacheGet(['flavorsOpenstack', record.get('cloud_location')]) });
			
			var defVal = parseInt(settings['openstack.flavor-id']); 
			if (!defVal) {
				defVal = this.down('[name="openstack.flavor-id"]').store.getAt(0).get('id');
			}
			
			this.down('[name="openstack.flavor-id"]').setValue(defVal);
			
			var ipPoolsOpenstack = this.cacheGet(['ipPoolsOpenstack', record.get('cloud_location')]);
			if (ipPoolsOpenstack) {
				this.down('[name="openstack.ip-pool"]').store.load({ data: ipPoolsOpenstack });
				this.down('[name="openstack.ip-pool"]').show();
				this.down('[name="openstack.ip-pool"]').setValue(settings['openstack.ip-pool']);
			}
		},

		hideTab: function (record) {
			var settings = record.get('settings');

			settings['openstack.flavor-id'] = this.down('[name="openstack.flavor-id"]').getValue();
			settings['openstack.ip-pool'] = this.down('[name="openstack.ip-pool"]').getValue();

			record.set('settings', settings);
		},

		items: [{
			xtype: 'fieldset',
			items: [{
				xtype: 'combo',
				store: {
					fields: [ 'id', 'name' ],
					proxy: 'object'
				},
				valueField: 'id',
				displayField: 'name',
				fieldLabel: 'Flavor',
				labelWidth: 150,
				editable: false,
				queryMode: 'local',
				name: 'openstack.flavor-id',
				width: 400
			}, {
				xtype: 'combo',
				store: {
					fields: [ 'id', 'name' ],
					proxy: 'object'
				},
				valueField: 'id',
				displayField: 'name',
				labelWidth: 150,
				fieldLabel: 'Floating IPs pool',
				editable: false,
				hidden: true,
				queryMode: 'local',
				name: 'openstack.ip-pool',
				width: 400
			}]
		}]
	});
});
