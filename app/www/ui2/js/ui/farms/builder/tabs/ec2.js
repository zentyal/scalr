Scalr.regPage('Scalr.ui.farms.builder.tabs.ec2', function () {
	return Ext.create('Scalr.ui.FarmsBuilderTab', {
		tabTitle: 'EC2 options',
		cache: {},

		isEnabled: function (record) {
			return record.get('platform') == 'ec2';
		},

		getDefaultValues: function (record) {
			return {
				'aws.additional_security_groups': "",
				'aws.aki_id' : "",
				'aws.ari_id' : "",
				'aws.cluster_pg': "",
				
				'aws.vpc.subnetId': ""
			};
		},
		
		beforeShowTab: function (record, handler) {
			var cloudLocation = record.get('cloud_location');

			if (this.cacheExist(['subnets', cloudLocation]))
				handler();
			else
				Scalr.Request({
					processBox: {
						type: 'action'
					},
					url: '/tools/aws/vpc/xListViewSubnets',
					params: {
						cloudLocation: cloudLocation
					},
					scope: this,
					success: function (response) {
						response.data.unshift({ id: '' });
						this.cacheSet(response.data, ['subnets', cloudLocation]);
						handler();
					},
					failure: function () {
						this.deactivateTab();
					}
				});
		},

		showTab: function (record) {
			var settings = record.get('settings');

			this.down('[name="aws.additional_security_groups"]').setValue(settings['aws.additional_security_groups']);
			this.down('[name="aws.aki_id"]').setValue(settings['aws.aki_id']);
			this.down('[name="aws.ari_id"]').setValue(settings['aws.ari_id']);
			this.down('[name="aws.cluster_pg"]').setValue(settings['aws.cluster_pg']);
			
			this.down('[name="aws.vpc.subnetId"]').store.load({ data: this.cacheGet(['subnets', record.get('cloud_location')]) });
			this.down('[name="aws.vpc.subnetId"]').setValue(settings['aws.vpc.subnetId'] || '');
		},

		hideTab: function (record) {
			var settings = record.get('settings');
			settings['aws.additional_security_groups'] = this.down('[name="aws.additional_security_groups"]').getValue();
			settings['aws.aki_id'] = this.down('[name="aws.aki_id"]').getValue();
			settings['aws.ari_id'] = this.down('[name="aws.ari_id"]').getValue();
			settings['aws.cluster_pg'] = this.down('[name="aws.cluster_pg"]').getValue();
			
			settings['aws.vpc.subnetId'] = this.down('[name="aws.vpc.subnetId"]').getValue();
			
			record.set('settings', settings);
		},

		items: [{
			xtype: 'fieldset',
			defaults: {
				labelWidth: 230
			},
			items: [{
				xtype: 'textfield',
				anchor: '100%',
				fieldLabel: 'Security groups (comma separated)',
				name: 'aws.additional_security_groups'
			}, {
				xtype: 'textfield',
				anchor: '100%',
				fieldLabel: 'AKI id',
				name: 'aws.aki_id'
			}, {
				xtype: 'textfield',
				anchor: '100%',
				fieldLabel: 'ARI id',
				name: 'aws.ari_id'
			}, {
				xtype: 'textfield',
				anchor: '100%',
				fieldLabel: 'Cluster placement group',
				name: 'aws.cluster_pg'
			}]
		}, {
			xtype: 'fieldset',
			hidden: !Scalr.flags['betaMode'],
			defaults: {
				labelWidth: 230
			},
			items: [{
				xtype: 'fieldcontainer',
				hideLabel: true,
				layout: 'hbox',
				items: [{
					xtype: 'displayfield',
					value: 'Additional tags (one per line: name=value)',
					width: 250
				}, {
					xtype: 'displayinfofield',
					margin: '0 0 0 5',
					value: 'You can use the following variables: %image_id%, %external_ip%, %internal_ip%, %role_name%, %isdbmaster%, %instance_index%, ' +
						'%server_id%, %farm_id%, %farm_name%, %env_id%, %env_name%, %cloud_location%, %instance_id%, %avail_zone%<br />' +
						'For example: tag1=%instance_index%.%farm_id%.example'
				}]
			},{
				xtype: 'textarea',
				anchor: '100%',
				hideLabel:true,
				name: 'aws.additional_tags'
			}]
		}, {
			xtype: 'fieldset',
			defaults: {
				labelWidth: 230
			},
			items: [{
				xtype: 'combo',
				name: 'aws.vpc.subnetId',
				fieldLabel: 'VPC Subnet',
				editable: false,
				anchor: '100%',
				valueField: 'id',
				displayField: 'description',
				queryMode: 'local',
				store: {
					fields: ['id' , 'description'],
					proxy: 'object'
				}
			}]
		},]
	});
});
