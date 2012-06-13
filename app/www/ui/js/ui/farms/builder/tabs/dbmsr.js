Scalr.regPage('Scalr.ui.farms.builder.tabs.dbmsr', function () {
	
	return Ext.create('Scalr.ui.FarmsBuilderTab', {
		tabTitle: 'Database settings',
		itemId: 'dbmsr',

		isEnabled: function (record) {
			return ((record.get('behaviors').match('postgresql') || record.get('behaviors').match('mysql2') || record.get('behaviors').match('redis')) &&
				(
					record.get('platform') == 'ec2' ||
					record.get('platform') == 'rackspace' ||
					record.get('platform') == 'cloudstack'
				)
			);
		},

		getDefaultValues: function (record) {
			if (record.get('platform') == 'ec2')
				var default_storage_engine = 'ebs';
			else if (record.get('platform') == 'rackspace')
				var default_storage_engine = 'eph';
			else if (record.get('platform') == 'cloudstack')
				var default_storage_engine = 'csvol';

			return {
				'db.msr.data_bundle.enabled': 1,
				'db.msr.data_bundle.every': 24,
				'db.msr.data_bundle.timeframe.start_hh': '05',
				'db.msr.data_bundle.timeframe.start_mm': '00',
				'db.msr.data_bundle.timeframe.end_hh': '09',
				'db.msr.data_bundle.timeframe.end_mm': '00',
				
				'db.msr.data_storage.engine': default_storage_engine,
				'db.msr.data_storage.ebs.size': 100,
				'db.msr.data_storage.ebs.snaps.enable_rotation' : 1,
				'db.msr.data_storage.ebs.snaps.rotate' : 5,
				
				'db.msr.data_backup.enabled': 1,
				'db.msr.data_backup.every' : 720,
				'db.msr.data_backup.timeframe.start_hh': '05',
				'db.msr.data_backup.timeframe.start_mm': '00',
				'db.msr.data_backup.timeframe.end_hh': '09',
				'db.msr.data_backup.timeframe.end_mm': '00'
			};
		},
		
		showTab: function (record) {
			
			var settings = record.get('settings');
			
			if (record.get('platform') == 'ec2') {
				this.down('[name="db.msr.data_storage.engine"]').store.load({
					data: [{name:'ebs', description:'EBS Volume'}, {name:'eph', description:'Ephemeral device'}, {name:'raid.ebs', description:'RAID array'}]
				});
			} else if (record.get('platform') == 'rackspace') {
				this.down('[name="db.msr.data_storage.engine"]').store.load({
					data: [{name:'eph', description:'Ephemeral device'}]
				});
			} else if (record.get('platform') == 'cloudstack') {
				this.down('[name="db.msr.data_storage.engine"]').store.load({
					data: [{name:'csvol', description:'CloudStack Block Volume'}]
				});
			}
			
			var availableDisks = new Array();
			availableDisks[0] = {'device':'', 'description':''};
			
			if (record.get('platform') == 'rackspace')
				availableDisks[availableDisks.length] = {'device':'/dev/loop0', 'description':'Loop device (75% from /)'};
			else if (record.get('platform') == 'ec2') {
				
				var devices = [];
				devices['/dev/sda2'] ={'m1.small':1, 'c1.medium':1};
				devices['/dev/sdb'] = {'m1.medium':1, 'm1.large':1, 'm1.xlarge':1, 'c1.xlarge':1, 'cc1.4xlarge':1, 'cc2.8xlarge':1, 'm2.xlarge':1, 'm2.2xlarge':1, 'm2.4xlarge':1};
				devices['/dev/sdc'] = {               'm1.large':1, 'm1.xlarge':1, 'c1.xlarge':1, 'cc1.4xlarge':1, 'cc2.8xlarge':1 };
				devices['/dev/sdd'] = {						 		'm1.xlarge':1, 'c1.xlarge':1, 			   	   'cc2.8xlarge':1 };
				devices['/dev/sde'] = {						 		'm1.xlarge':1, 'c1.xlarge':1, 			       'cc2.8xlarge':1 };
				
				for (deviceName in devices) {
					if (devices[deviceName][settings['aws.instance_type']] == 1) {
						availableDisks[availableDisks.length] = {'device':deviceName, 'description':'LVM on '+deviceName+' (80% available for data)'};
					}
				}
			}
			
			this.down('[name="db.msr.data_storage.eph.disk"]').store.load({data: availableDisks});
			
			//TODO: Select first device
			
			if (record.get('behaviors').match('redis')) {
				this.down('[name="db.msr.redis.persistence_type"]').store.load({
					data: [
						{name:'aof', description:'Append Only File'},
						{name:'snapshotting', description:'Snapshotting'}
					]
				});
				
				this.down('[name="db.msr.redis.persistence_type"]').setValue(settings['db.msr.redis.persistence_type'] || 'snapshotting');
				
				this.down('[name="redis_settings"]').show();
			} else {
				this.down('[name="redis_settings"]').hide();
			}
			
			var raidType = this.down('[name="db.msr.data_storage.raid.level"]');
			raidType.store.load({
				data: [
					{name:'0', description:'RAID 0 (block-level striping without parity or mirroring)'},
					{name:'1', description:'RAID 1 (mirroring without parity or striping)'},
					{name:'5', description:'RAID 5 (block-level striping with distributed parity)'},
					{name:'10', description:'RAID 10 (mirrored sets in a striped set)'}
				]
			});
			raidType.setValue(settings['db.msr.data_storage.raid.level'] || '10');
			
			this.down('[name="db.msr.data_storage.raid.volumes_count"]').setValue(settings['db.msr.data_storage.raid.volumes_count'] || 4);
			this.down('[name="db.msr.data_storage.raid.volume_size"]').setValue(settings['db.msr.data_storage.raid.volume_size'] || 100);

			if (settings['db.msr.data_bundle.enabled'] == 1)
				this.down('[name="db.msr.data_bundle.enabled"]').expand();
			else
				this.down('[name="db.msr.data_bundle.enabled"]').collapse();

			this.down('[name="db.msr.data_bundle.every"]').setValue(settings['db.msr.data_bundle.every']);
			this.down('[name="db.msr.data_bundle.timeframe.start_hh"]').setValue(settings['db.msr.data_bundle.timeframe.start_hh']);
			this.down('[name="db.msr.data_bundle.timeframe.start_mm"]').setValue(settings['db.msr.data_bundle.timeframe.start_mm']);
			this.down('[name="db.msr.data_bundle.timeframe.end_hh"]').setValue(settings['db.msr.data_bundle.timeframe.end_hh']);
			this.down('[name="db.msr.data_bundle.timeframe.end_mm"]').setValue(settings['db.msr.data_bundle.timeframe.end_mm']);

			if (settings['db.msr.data_backup.enabled'] == 1)
				this.down('[name="db.msr.data_backup.enabled"]').expand();
			else
				this.down('[name="db.msr.data_backup.enabled"]').collapse();

			this.down('[name="db.msr.data_backup.every"]').setValue(settings['db.msr.data_backup.every']);
			this.down('[name="db.msr.data_backup.timeframe.start_hh"]').setValue(settings['db.msr.data_backup.timeframe.start_hh']);
			this.down('[name="db.msr.data_backup.timeframe.start_mm"]').setValue(settings['db.msr.data_backup.timeframe.start_mm']);
			this.down('[name="db.msr.data_backup.timeframe.end_hh"]').setValue(settings['db.msr.data_backup.timeframe.end_hh']);
			this.down('[name="db.msr.data_backup.timeframe.end_mm"]').setValue(settings['db.msr.data_backup.timeframe.end_mm']);

			if (settings['db.msr.data_storage.engine'] == 'eph') {
				var ephDisk = this.down('[name="db.msr.data_storage.eph.disk"]');
				var defVal = ephDisk.store.getAt(1) ? ephDisk.store.getAt(1).get('device') : ephDisk.store.getAt(0).get('device');
				
				ephDisk.setValue(settings['db.msr.data_storage.eph.disk'] || defVal);
			}
			
			if (settings['db.msr.data_storage.engine'] == 'ebs' || settings['db.msr.data_storage.engine'] == 'csvol') {
				if (settings['db.msr.data_storage.ebs.snaps.enable_rotation'] == 1) {
					this.down('[name="db.msr.data_storage.ebs.snaps.enable_rotation"]').setValue(true);
					this.down('[name="db.msr.data_storage.ebs.snaps.rotate"]').enable();
				} else {
					this.down('[name="db.msr.data_storage.ebs.snaps.enable_rotation"]').setValue(false);
					this.down('[name="db.msr.data_storage.ebs.snaps.rotate"]').disable();
				}
				this.down('[name="db.msr.data_storage.ebs.snaps.rotate"]').setValue(settings['db.msr.data_storage.ebs.snaps.rotate']);
				this.down('[name="db.msr.data_storage.ebs.size"]').setValue(settings['db.msr.data_storage.ebs.size']);

			}

			this.down('[name="db.msr.data_storage.engine"]').setValue(settings['db.msr.data_storage.engine']);
			
			if (!record.get('new')) {
				
				//RAID Settings
				this.down('[name="db.msr.data_storage.raid.level"]').disable()
				this.down('[name="db.msr.data_storage.raid.volumes_count"]').disable();
				this.down('[name="db.msr.data_storage.raid.volume_size"]').disable();
				
				// Engine & EBS Settings
				this.down('[name="db.msr.data_storage.engine"]').disable();
				this.down('[name="db.msr.data_storage.ebs.size"]').disable()
			} else {
				//RAID Settings
				this.down('[name="db.msr.data_storage.raid.level"]').enable()
				this.down('[name="db.msr.data_storage.raid.volumes_count"]').enable();
				this.down('[name="db.msr.data_storage.raid.volume_size"]').enable();
				
				// Engine & EBS Settings
				this.down('[name="db.msr.data_storage.engine"]').enable();
				this.down('[name="db.msr.data_storage.ebs.size"]').enable()
			}
		},

		hideTab: function (record) {
			var settings = record.get('settings');

			if (record.get('behaviors').match('redis')) {
				settings['db.msr.redis.persistence_type'] = this.down('[name="db.msr.redis.persistence_type"]').getValue();
			}

			if (! this.down('[name="db.msr.data_bundle.enabled"]').collapsed) {
				settings['db.msr.data_bundle.enabled'] = 1;
				settings['db.msr.data_bundle.every'] = this.down('[name="db.msr.data_bundle.every"]').getValue();
				settings['db.msr.data_bundle.timeframe.start_hh'] = this.down('[name="db.msr.data_bundle.timeframe.start_hh"]').getValue();
				settings['db.msr.data_bundle.timeframe.start_mm'] = this.down('[name="db.msr.data_bundle.timeframe.start_mm"]').getValue();
				settings['db.msr.data_bundle.timeframe.end_hh'] = this.down('[name="db.msr.data_bundle.timeframe.end_hh"]').getValue();
				settings['db.msr.data_bundle.timeframe.end_mm'] = this.down('[name="db.msr.data_bundle.timeframe.end_mm"]').getValue();
			} else {
				settings['db.msr.data_bundle.enabled'] = 0;
				delete settings['db.msr.data_bundle.every'];
				delete settings['db.msr.data_bundle.timeframe.start_hh'];
				delete settings['db.msr.data_bundle.timeframe.start_mm'];
				delete settings['db.msr.data_bundle.timeframe.end_hh'];
				delete settings['db.msr.data_bundle.timeframe.end_mm'];
			}

			if (! this.down('[name="db.msr.data_backup.enabled"]').collapsed) {
				settings['db.msr.data_backup.enabled'] = 1;
				settings['db.msr.data_backup.every'] = this.down('[name="db.msr.data_backup.every"]').getValue();
				settings['db.msr.data_backup.timeframe.start_hh'] = this.down('[name="db.msr.data_backup.timeframe.start_hh"]').getValue();
				settings['db.msr.data_backup.timeframe.start_mm'] = this.down('[name="db.msr.data_backup.timeframe.start_mm"]').getValue();
				settings['db.msr.data_backup.timeframe.end_hh'] = this.down('[name="db.msr.data_backup.timeframe.end_hh"]').getValue();
				settings['db.msr.data_backup.timeframe.end_mm'] = this.down('[name="db.msr.data_backup.timeframe.end_mm"]').getValue();
			} else {
				settings['db.msr.data_backup.enabled'] = 0;
				delete settings['db.msr.data_backup.every'];
				delete settings['db.msr.data_backup.timeframe.start_hh'];
				delete settings['db.msr.data_backup.timeframe.start_mm'];
				delete settings['db.msr.data_backup.timeframe.end_hh'];
				delete settings['db.msr.data_backup.timeframe.end_mm'];
			}

			if (record.get('new')) {
				settings['db.msr.data_storage.engine'] = this.down('[name="db.msr.data_storage.engine"]').getValue();
			}
			
			if (settings['db.msr.data_storage.engine'] == 'ebs' || settings['db.msr.data_storage.engine'] == 'csvol') {
				if (record.get('new'))
					settings['db.msr.data_storage.ebs.size'] = this.down('[name="db.msr.data_storage.ebs.size"]').getValue();

				if (this.down('[name="db.msr.data_storage.ebs.snaps.enable_rotation"]').getValue()) {
					settings['db.msr.data_storage.ebs.snaps.enable_rotation'] = 1;
					settings['db.msr.data_storage.ebs.snaps.rotate'] = this.down('[name="db.msr.data_storage.ebs.snaps.rotate"]').getValue();
				} else {
					settings['db.msr.data_storage.ebs.snaps.enable_rotation'] = 0;
					delete settings['db.msr.data_storage.ebs.snaps.rotate'];
				}
			} else {
				delete settings['db.msr.data_storage.ebs.size'];
				delete settings['db.msr.data_storage.ebs.snaps.enable_rotation'];
				delete settings['db.msr.data_storage.ebs.snaps.rotate'];
			}

			if (settings['db.msr.data_storage.engine'] == 'eph') {
				settings['db.msr.data_storage.eph.disk'] = this.down('[name="db.msr.data_storage.eph.disk"]').getValue();
			}
			
			if (settings['db.msr.data_storage.engine'] == 'raid.ebs') {				
				settings['db.msr.data_storage.raid.level'] = this.down('[name="db.msr.data_storage.raid.level"]').getValue();
				settings['db.msr.data_storage.raid.volume_size'] = this.down('[name="db.msr.data_storage.raid.volume_size"]').getValue();
				settings['db.msr.data_storage.raid.volumes_count'] = this.down('[name="db.msr.data_storage.raid.volumes_count"]').getValue();
			}

			record.set('settings', settings);
		},

		items: [{
			xtype: 'fieldset',
			checkboxToggle:  true,
			name: 'db.msr.data_bundle.enabled',
			title: 'Bundle and save data snapshot',
			defaults: {
				labelWidth: 150
			},
			items: [{
				xtype: 'fieldcontainer',
				layout: 'hbox',
				hideLabel: true,
				items: [{
					xtype: 'displayfield',
					value: 'Perform data bundle every'
				}, {
					xtype: 'textfield',
					width: 40,
					margin: '0 0 0 3',
					name: 'db.msr.data_bundle.every'
				}, {
					xtype: 'displayfield',
					margin: '0 0 0 3',
					value: 'hours'
				}, {
					xtype: 'displayinfofield',
					margin: '0 0 0 3',
					info:   'DB snapshots contain a hotcopy of database data directory, file that holds binary log position and debian.cnf' +
							'<br>' +
							'When farm starts:<br>' +
							'1. Database master dowloads and extracts a snapshot from storage depends on cloud platfrom<br>' +
							'2. When data is loaded and master starts, slaves download and extract a snapshot as well<br>' +
							'3. Slaves are syncing with master for some time'
				}]
			}, {
				xtype: 'fieldcontainer',
				layout: 'hbox',
				fieldLabel: 'Preferred bundle window',
				items: [{
					xtype: 'textfield',
					name: 'db.msr.data_bundle.timeframe.start_hh',
					width: 40
				}, {
					xtype: 'displayfield',
					value: ':',
					margin: '0 0 0 3'
				}, {
					xtype: 'textfield',
					name: 'db.msr.data_bundle.timeframe.start_mm',
					width: 40,
					margin: '0 0 0 3'
				}, {
					xtype: 'displayfield',
					value: '-',
					margin: '0 0 0 3'
				}, {
					xtype: 'textfield',
					name: 'db.msr.data_bundle.timeframe.end_hh',
					width: 40,
					margin: '0 0 0 3'
				}, {
					xtype: 'displayfield',
					value: ':',
					margin: '0 0 0 3'
				},{
					xtype: 'textfield',
					name: 'db.msr.data_bundle.timeframe.end_mm',
					width: 40,
					margin: '0 0 0 3'
				}, {
					xtype: 'displayfield',
					value: 'Format: hh24:mi - hh24:mi',
					bodyStyle: 'font-style: italic',
					margin: '0 0 0 3'
				}]
			}]
		}, {
			xtype: 'fieldset',
			checkboxToggle:  true,
			name: 'db.msr.data_backup.enabled',
			title: 'Backup data (gziped database dump)',
			defaults: {
				labelWidth: 150
			},
			items: [{
				xtype: 'fieldcontainer',
				layout: 'hbox',
				hideLabel: true,
				items: [{
					xtype: 'displayfield',
					value: 'Perform backup every'
				}, {
					xtype: 'textfield',
					width: 40,
					margin: '0 0 0 3',
					name: 'db.msr.data_backup.every'
				}, {
					xtype: 'displayfield',
					margin: '0 0 0 3',
					value: 'hours'
				}]
			}, {
				xtype: 'fieldcontainer',
				layout: 'hbox',
				fieldLabel: 'Preferred backup window',
				items: [{
					xtype: 'textfield',
					name: 'db.msr.data_backup.timeframe.start_hh',
					width: 40
				}, {
					xtype: 'displayfield',
					value: ':',
					margin: '0 0 0 3'
				}, {
					xtype: 'textfield',
					name: 'db.msr.data_backup.timeframe.start_mm',
					width: 40,
					margin:'0 0 0 3'
				}, {
					xtype: 'displayfield',
					value: '-',
					margin: '0 0 0 3'
				}, {
					xtype: 'textfield',
					name: 'db.msr.data_backup.timeframe.end_hh',
					width: 40,
					margin: '0 0 0 3'
				}, {
					xtype: 'displayfield',
					value: ':',
					margin: '0 0 0 3'
				},{
					xtype: 'textfield',
					name: 'db.msr.data_backup.timeframe.end_mm',
					width: 40,
					margin: '0 0 0 3'
				}, {
					xtype: 'displayfield',
					value: 'Format: hh24:mi - hh24:mi',
					bodyStyle: 'font-style: italic',
					margin: '0 0 0 3'
				}]
			}]
		}, {
			xtype: 'fieldset',
			name: 'redis_settings',
			hidden: true,
			title: 'Redis settings',
			items: [{ 
				xtype: 'combo',
				name: 'db.msr.redis.persistence_type',
				fieldLabel: 'Persistence type',
				editable: false,
				store: {
					fields: [ 'name', 'description' ],
					proxy: 'object'
				},
				valueField: 'name',
				displayField: 'description',
				width: 400,
				labelWidth: 160,
				queryMode: 'local'
			}]
		}, {
			xtype: 'fieldset',
			title: 'Settings',
			items: [{ 
				xtype: 'combo',
				name: 'db.msr.data_storage.engine',
				fieldLabel: 'Storage engine',
				editable: false,
				store: {
					fields: [ 'description', 'name' ],
					proxy: 'object'
				},
				valueField: 'name',
				displayField: 'description',
				width: 400,
				labelWidth: 160,
				queryMode: 'local',
				listeners:{
					change: function(){
						this.up('#dbmsr').down('[name="ebs_settings"]').hide();
						this.up('#dbmsr').down('[name="raid_settings"]').hide();
						this.up('#dbmsr').down('[name="eph_settings"]').hide();
						
						if (this.getValue() == 'ebs' || this.getValue() == 'csvol') {
							this.up('#dbmsr').down('[name="ebs_settings"]').show();
						} else if (this.getValue() == 'raid.ebs') {
							this.up('#dbmsr').down('[name="raid_settings"]').show();
						} else if (this.getValue() == 'eph') {
							this.up('#dbmsr').down('[name="eph_settings"]').show();
						}
					}
				}
			}]
		}, {
			xtype:'fieldset',
			name: 'eph_settings',
			title: 'Ephemeral Storage settings',
			hidden: true,
			items: [{ 
				xtype: 'combo',
				name: 'db.msr.data_storage.eph.disk',
				fieldLabel: 'Disk device',
				editable: false,
				store: {
					fields: [ 'device', 'description' ],
					proxy: 'object'
				},
				valueField: 'device',
				displayField: 'description',
				width: 500,
				labelWidth: 160,
				queryMode: 'local',
				listeners:{
					change:function(){
						//TODO:
					}
				}
			}]
		}, {
			xtype:'fieldset',
			name: 'ebs_settings',
			title: 'Block Storage settings',
			hidden: true,
			items: [{
				xtype: 'textfield',
				fieldLabel: 'Storage size (max. 1000 GB)',
				labelWidth: 160,
				width: 200,
				name: 'db.msr.data_storage.ebs.size'
			}, {
				xtype: 'fieldcontainer',
				layout: 'hbox',
				name: 'ebs_rotation_settings',
				items: [{
					xtype: 'checkbox',
					hideLabel: true,
					name: 'db.msr.data_storage.ebs.snaps.enable_rotation',
					boxLabel: 'Snapshots are rotated',
					handler: function (checkbox, checked) {
						if (checked)
							this.next('[name="db.msr.data_storage.ebs.snaps.rotate"]').enable();
						else
							this.next('[name="db.msr.data_storage.ebs.snaps.rotate"]').disable();
					}
				}, {
					xtype: 'textfield',
					hideLabel: true,
					name: 'db.msr.data_storage.ebs.snaps.rotate',
					width: 40,
					margin: '0 0 0 3'
				}, {
					xtype: 'displayfield',
					value: 'times before being removed.',
					margin: '0 0 0 3'
				}]
			}]
		}, {
			xtype:'fieldset',
			name: 'raid_settings',
			title: 'RAID storage settings',
			hidden: true,
			items: [{ 
				xtype: 'combo',
				name: 'db.msr.data_storage.raid.level',
				fieldLabel: 'RAID level',
				editable: false,
				store: {
					fields: [ 'name', 'description' ],
					proxy: 'object'
				},
				valueField: 'name',
				displayField: 'description',
				width: 500,
				value: '',
				labelWidth: 160,
				queryMode: 'local',
				listeners:{
					change:function() {
						try {
							var data = [];
							if (this.getValue() == '0') {
								data = {'2':'2', '3':'3', '4':'4', '5':'5', '6':'6', '7':'7', '8':'8'};
							} else if (this.getValue() == '1') {
								data = {'2':'2'};
							} else if (this.getValue() == '5') {
								data = {'3':'3', '4':'4', '5':'5', '6':'6', '7':'7', '8':'8'};
							} else if (this.getValue() == '10') {
								data = {'4':'4', '6':'6', '8':'8'};
							}
							
							var obj = this.up('#dbmsr').down('[name="db.msr.data_storage.raid.volumes_count"]');
							obj.store.load({data: data});
							var val = obj.store.getAt(0).get('id');
							obj.setValue(val);
						} catch (e) {}
					}
				}
			}, {
				xtype: 'combo',
				name: 'db.msr.data_storage.raid.volumes_count',
				fieldLabel: 'Number of volumes',
				editable: false,
				store: {
					fields: [ 'id', 'name'],
					proxy: 'object'
				},
				valueField: 'id',
				displayField: 'name',
				width: 500,
				labelWidth: 160,
				queryMode: 'local'
			}, {
				xtype: 'textfield',
				fieldLabel: 'Each volume size',
				labelWidth: 160,
				width: 200,
				value: '10',
				name: 'db.msr.data_storage.raid.volume_size'
			}/*, {
				xtype: 'fieldcontainer',
				layout:'hbox',
				hideLabel: true,
				items:[ {
						xtype:"displayfield",
						hideLabel: true,
						value:"Available space on the raid: "
					}, {
						xtype:"displayfield",
						hideLabel: true,
						style:{fontWeight:'bold'},
						value:"",
						margin: '0 0 0 3'
					}, {
						xtype:"displayfield",
						hideLabel: true,
						value:" GB",
						margin: '0 0 0 3'
					}
				]
			}*/]
		}]
	});
});
