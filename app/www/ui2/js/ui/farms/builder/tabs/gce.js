Scalr.regPage('Scalr.ui.farms.builder.tabs.gce', function (moduleTabParams) {
	
	var gceSettings = new Array();
	
	var form = Ext.create('Scalr.ui.FarmsBuilderTab', {
		tabTitle: 'GoogleCE options',
		cache: {},

		isEnabled: function (record) {
			return record.get('platform') == 'gce';
		},

		getDefaultValues: function (record) {
			return {
				'gce.machine-type': '',
				'gce.network': 'default'
			};
		},

		beforeShowTab: function (record, handler) {
			Scalr.Request({
				processBox: {
					type: 'action'
				},
				url: '/platforms/gce/xGetOptions',
				scope: this,
				success: function (response) {
					gceSettings = response.data;
					handler();
				},
				failure: function () {
					this.deactivateTab();
				}
			});
		},

		showTab: function (record) {
			var settings = record.get('settings');

			if (settings['db.msr.data_storage.engine'] == 'lvm' || settings['db.msr.data_storage.engine'] == 'eph' || !settings['db.msr.data_storage.engine']) {
				this.down('[name="gce.machine-type"]').store.load({ data: gceSettings['dbTypes'] });
				this.down('[name="gce.machine-type"]').setValue(settings['gce.machine-type'] || 'n1-standard-1-d');
			} else {
				this.down('[name="gce.machine-type"]').store.load({ data: gceSettings['types'] });
				this.down('[name="gce.machine-type"]').setValue(settings['gce.machine-type'] || 'n1-standard-1');
			}
			
			this.down('[name="gce.network"]').store.load({ data: gceSettings['networks'] });
			this.down('[name="gce.network"]').setValue(settings['gce.network'] || 'default');
			
			
			var comp = this.down('#gce_loc');
			comp.removeAll();
			for (var i = 0; i < gceSettings['zones'].length; i++)
				comp.add({
					boxLabel: gceSettings['zones'][i].description,
					name: gceSettings['zones'][i].name
				});
			
			var cLoc = this.down('[name="gce.cloud-location"]');
			var d = [{ name: 'x-scalr-custom', description: 'Selected by me: ' }];
			for (var i = 0; i < gceSettings['zones'].length; i++)
				d.push(gceSettings['zones'][i]);
			
			cLoc.store.load({ data: d });
			try {
				var defVal = cLoc.store.getAt(3).get('name');
			} catch (e){}
			
			var zone = settings['gce.cloud-location'] || defVal;
			if (zone.match(/x-scalr-custom/)) {
				var loc = zone.replace('x-scalr-custom=', '').split(':');
				this.down('#gce_loc').items.each(function () {
					for (var i = 0; i < loc.length; i++) {
						if (this.name == loc[i])
							this.setValue(true);
					}
				});

				this.down('#gce_loc').show();
				zone = 'x-scalr-custom';
			}
			
			this.down('[name="gce.cloud-location"]').setValue(zone);
		},

		hideTab: function (record) {
			var settings = record.get('settings');

			settings['gce.machine-type'] = this.down('[name="gce.machine-type"]').getValue();
			settings['gce.network'] = this.down('[name="gce.network"]').getValue();
			settings['gce.cloud-location'] = this.down('[name="gce.cloud-location"]').getValue();

			if (this.down('[name="gce.cloud-location"]').getValue() == 'x-scalr-custom') {
				var loc = [];
				this.down('#gce_loc').items.each(function () {
					if (this.getValue())
						loc[loc.length] = this.name;
				});

				// TODO: replace hack
				if (loc.length == 0)
					Scalr.message.Error('Cloud location for role "' + record.get('name') + '" should be selected');
				else
					Scalr.message.Flush();

				settings['gce.cloud-location'] = 'x-scalr-custom=' + loc.join(':');
				record.set('cloud_location', "x-scalr-custom");
			} else {
				settings['gce.cloud-location'] = this.down('[name="gce.cloud-location"]').getValue();
				record.set('cloud_location', settings['gce.cloud-location']);
			}
			
			record.set('settings', settings);
		},

		items: [{
			xtype: 'fieldset',
			items: [{
				xtype: 'fieldcontainer',
				layout: 'hbox',
				fieldLabel: 'Cloud location',
				labelWidth: 100,
					items: [{
					xtype: 'combo',
					store: {
						fields: [ 'name', 'description', 'state'],
						proxy: 'object'
					},
					valueField: 'name',
					displayField: 'description',
					hideLabel: true,
					editable: false,
					queryMode: 'local',
					name: 'gce.cloud-location',
					width: 250,
					listeners: {
						change: function (field, value) {
							var c = this.next('#gce_loc');
							if (value == 'x-scalr-custom')
								c.show();
							else
								c.hide();
								
							this.up('[tab="tab"]').currentRole.set('cloud_location', value);
						}
					}, listConfig : {
				        tpl : '<tpl for="."><div class="x-boundlist-item">{description} <tpl if="state == &quot;UP&quot;">(<span style="color:green;">UP</span>)<tpl elseif="state">(<span style="color:red;">{state}</span>)</tpl></div></tpl>'
				    }
				}, {
					itemId: 'gce_loc',
					xtype: 'checkboxgroup',
					flex: 1,
					columns: [ 120, 120, 120, 120, 120, 120, 120 ],
					margin: '0 0 0 8',
					defaults: {
						margin: 0
					},
					hidden: true
				}]
			}, {
				xtype: 'combo',
				store: {
					fields: [ 'name', 'description' ],
					proxy: 'object'
				},
				valueField: 'name',
				displayField: 'description',
				fieldLabel: 'Machine type',
				editable: false,
				queryMode: 'local',
				name: 'gce.machine-type',
				width: 750
			}, {
				xtype: 'combo',
				store: {
					fields: [ 'name', 'description' ],
					proxy: 'object'
				},
				valueField: 'name',
				displayField: 'description',
				fieldLabel: 'Network',
				editable: false,
				queryMode: 'local',
				name: 'gce.network',
				width: 750
			}]
		}]
	});
	
	return form;
});
