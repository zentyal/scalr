Scalr.regPage('Scalr.ui.farms.builder.tabs.storage', function (moduleTabParams) {
	return Ext.create('Scalr.ui.FarmsBuilderTab', {
		tabTitle: 'Storage',
		itemId: 'storage',
		cache: {},

		isEnabled: function (record) {
			return true;
		},
		
		/*beforeShowTab: function (record, handler) {
			var chefId = record.get('settings')['chef.runlist_id'];
			this.down('[name="enableChef"]').setValue(!Ext.isEmpty(chefId));
			
			var gridPanel = this.down('#runList');
			gridPanel.getSelectionModel().deselectAll();
			this.down('#runList').store.load(function (records, operations, success){
				for (i = 0; i<records.length; i++) {
					if (records[i].get('id') == chefId) {
						gridPanel.getSelectionModel().select(records[i].index);
						records[i].set('sel', 1);
					}
				}
			});
			Scalr.event.on('update', getListRecord, this);
		},*/
		
		showTab: function (record) {
			var settings = this.down('#settings'), data = [];

			this.down('#configuration').store.loadData(record.get('storages')['configs'] || []);
			this.down('#configuration').devices = record.get('storages')['devices'] || [];

			this.down('[name="ebs.snapshot"]').cloudLocation = record.get('cloud_location');
			this.down('[name="ebs.snapshot"]').forceSelection = false;

			// Storage engine
			if (record.get('platform') == 'ec2') {
				data = [{
					name: 'ebs', description: 'Single EBS volume'
				}, {
					name: 'raid.ebs', description: 'RAID array (on EBS)'
				}];
			} else if (record.get('platform') == 'cloudstack' || record.get('platform') == 'idcf' || record.get('platform') == 'ucloud') {
				data = [{
					name: 'csvol', description: 'Single CS volume'
				}, {
					name: 'raid.csvol', description: 'RAID array (on CS volume)'
				}];
			}
			settings.down('[name="type"]').store.loadData(data);

			// Storage filesystem
			var data = [{ fs: 'ext3', description: 'Ext3' }];

			if ((record.get('image_os_family') == 'centos' && record.get('arch') == 'x86_64') ||
				(record.get('image_os_family') == 'ubuntu' && (record.get('image_os_version') == '10.04' || record.get('image_os_version') == '12.04'))
				) {
				if (moduleTabParams['featureMFS']) {
					data.push({ fs: 'ext4', description: 'Ext4'});
					data.push({ fs: 'xfs', description: 'XFS'});
				} else {
					data.push({ fs: 'ext4', description: 'Ext4 (Not available for your pricing plan)'});
					data.push({ fs: 'xfs', description: 'XFS (Not available for your pricing plan)'});
				}
			}
			settings.down('[name="fs"]').store.loadData(data);
			this.down('#editor').hide();
		},
		
		hideTab: function (record) {
			var storages = [];

			this.down('#configuration').store.each(function(record) {
				storages.push(record.getData());
			});

			var c = record.get('storages') || {};
			c['configs'] = storages;
			record.set('storages', c);
		},

		layout: 'fit',
		items: [{
			xtype: 'container',
			padding: '0 0 12 0',
			layout: {
				type: 'hbox',
				align: 'stretch'
			},
			items: [{
				xtype: 'container',
				layout: {
					type: 'vbox',
					align: 'stretch'
				},
				flex: 1,
				items: [{
					xtype: 'grid',
					flex: 1,
					itemId: 'configuration',

					title: 'Storage configuration',

					multiSelect: true,
					viewConfig: {
						emptyText: 'No storages',
						getRowClass: function(record) {
							if (record.get('status') == 'Pending delete')
								return 'x-grid-row-striped';
						}
					},
					store: {
						proxy: 'object',
						fields: [ 'id', 'type', 'fs', 'settings', 'mount', 'mountPoint', 'reUse', 'status' ]
					},
					columns: [
						{ header: 'Type', flex: 2, sortable: true, dataIndex: 'type', xtype: 'templatecolumn', tpl:
							new Ext.XTemplate('{[this.name(values.type)]}', {
								name: function(type) {
									var l = {
										'ebs': 'Single EBS volume',
										'csvol': 'Single CS volume',
										'raid.ebs': 'RAID array (on EBS)',
										'raid.csvol': 'RAID array (on CS volume)'
									};

									return l[type] || type;
								}
							})
						},
						{ header: 'FS', flex: 1, sortable: true, dataIndex: 'fs', xtype: 'templatecolumn', tpl:
							new Ext.XTemplate('{[this.name(values.fs)]}', {
								name: function(type) {
									var l = {
										'ext3': 'Ext3'
									};

									return l[type] || type;
								}
							})
						},
						{ header: 'Re-use', width: 60, xtype: 'templatecolumn', sortable: false, align: 'center', tpl:
							'<tpl if="reUse"><img src="/ui2/images/icons/true.png"><tpl else><img src="/ui2/images/icons/false.png"></tpl>'
						},
						{ header: 'Mount point', flex: 2, sortable: true, dataIndex: 'mountPoint', xtype: 'templatecolumn', tpl:
							'<tpl if="mountPoint">{mountPoint}<tpl else><img src="/ui2/images/icons/false.png"></tpl>'
						},
						{ header: 'Description', flex: 3, sortable: false, dataIndex: 'type', xtype: 'templatecolumn', tpl:
							new Ext.XTemplate(
								'<tpl if="type == \'raid.ebs\' || type == \'raid.csvol\'">{[this.raid(values)]}</tpl>' +
								'<tpl if="type == \'raid.ebs\' || type == \'ebs\'">{[this.ebs(values)]}</tpl>', {
									raid: function(v) {
										return 'RAID ' + v['settings']['raid.level'] + ' on ' + v['settings']['raid.volumes_count'] + ' x ';
									},
									ebs: function(v) {
										var s = ' ' + v['settings']['ebs.size'] + 'GB EBS volume';
										if (v['settings']['ebs.type'] == 'io1')
											s += ' (' + v['settings']['ebs.iops'] + ' iops)';

										return s;
									},
									csvol: function() {

									}
							})
						}
					],

					listeners: {
						selectionchange: function(grid, selections) {
							var dev = this.next();
							dev.store.removeAll();
							if (selections.length) {
								var id = selections[0].get('id');
								if (this.devices[id]) {
									for (var i in this.devices[id])
										dev.store.add(this.devices[id][i]);
								}
							}

						}
					},
					dockedItems: [{
						xtype: 'toolbar',
						dock: 'top',
						items: [{
							ui: 'paging',
							iconCls: 'x-tbar-add',
							handler: function() {
								var conf = this.up('#configuration'), editor = this.up('#storage').down('#editor');
								conf.getSelectionModel().setLastFocused(null);
								editor.getForm().reset(true);
								editor.loadRecord(conf.store.createModel({ reUse: 1 }), this.up('#storage').currentRole);
								editor.show();
							}
						}]
					}]
				}, {
					xtype: 'gridpanel',
					flex: 1,
					itemId: 'devices',

					title: 'Storage devices',

					viewConfig: {
						disableSelection: true,
						deferEmptyText: false,
						emptyText: 'Select configuration'
					},
					store: {
						proxy: 'object',
						fields: [ 'serverIndex', 'serverId', 'serverInstanceId', 'farmRoleId', 'storageId', 'storageConfigId', 'placement' ]
					},
					columns: [
						{ header: 'Server Index', width: 110, sortable: true, dataIndex: 'serverIndex' },
						{ header: 'Server Id', flex: 1, sortable: true, dataIndex: 'serverId', xtype: 'templatecolumn', tpl:
							'<tpl if="serverId"><a href="#/servers/{serverId}/extendedInfo">{serverId}</a> <tpl if="serverInstanceId">({serverInstanceId})</tpl><tpl else>Not running</tpl>'
						},
						{ header: 'Storage Id', width: 130, sortable: true, dataIndex: 'storageId' },
						{ header: 'Placement', width: 100, sortable: true, dataIndex: 'placement' },
						{ header: 'Config', width: 80, sortable: false, dataIndex: 'config', xtype: 'templatecolumn', tpl:
							'<a href="#" class="view">View</a>'
						}
					],

					listeners: {
						itemclick: function (view, record, item, index, e) {
							if (e.getTarget('a.view')) {
								Scalr.Request({
									processBox: {
										type: 'action',
										msg: 'Loading config ...'
									},
									url: '/farms/builder/xGetStorageConfig',
									params: {
										farmRoleId: record.get('farmRoleId'),
										configId: record.get('storageConfigId'),
										serverIndex: record.get('serverIndex')
									},
									success: function(data) {
										Scalr.utils.Window({
											xtype: 'form',
											title: 'Storage config',
											width: 800,
											layout: 'fit',
											items: [{
												xtype: 'codemirror',
												readOnly: true,
												value: JSON.stringify(data.config, null, "\t"),
												mode: 'application/json',
												margin: '0 0 12 0'
											}],
											dockedItems: [{
												xtype: 'container',
												dock: 'bottom',
												layout: {
													type: 'hbox',
													pack: 'center'
												},
												items: [{
													xtype: 'button',
													text: 'Close',
													handler: function() {
														this.up('#box').close();
													}
												}]
											}]
										});
									}
								});
								e.preventDefault();
							}
						}
					}
				}]
			}, {
				xtype: 'container',
				width: 540,
				autoScroll: true,
				margin: '0 0 0 12',
				items: [{
					xtype: 'form',
					itemId: 'editor',
					listeners: {
						boxready: function() {
							var grid = this.up('#storage').down('#configuration'), me = this;
							grid.getSelectionModel().on('focuschange', function(gridSelModel) {
								if (gridSelModel.lastFocused && (gridSelModel.lastFocused.get('status') == 'Pending create' || gridSelModel.lastFocused.get('status') == '')) {
									me.getForm().reset(true);
									me.loadRecord(gridSelModel.lastFocused);
									me.show();
								} else {
									me.hide();
								}
							});
						},
						loadrecord: function(record) {
							var but = this.down('#buttons');
							but.down('#add')[ !record.hasStore() ? 'show' : 'hide' ]();
							but.down('#save')[ record.hasStore() ? 'show' : 'hide' ]();
							but.down('#delete')[ record.hasStore() ? 'show' : 'hide' ]();

							this.getForm().setValues(record.get('settings'));
							this.getForm().clearInvalid();
						},
						updaterecord: function(record) {
							var values = this.getForm().getFieldValues(), settings = {};
							for (var i in values) {
								if (i.indexOf('ebs') != -1 || i.indexOf('raid') != -1 || i.indexOf('csvol') != -1) {
									settings[i] = values[i];
								}
							}

							record.beginEdit();
							record.set('settings', settings);
							record.endEdit();
						}
					},
					items: [{
						xtype: 'fieldset',
						title: 'Settings',
						itemId: 'settings',
						defaults: {
							width: 300,
							fieldLabel: 120
						},
						items: [{
							xtype: 'fieldcontainer',
							layout: 'hbox',
							hideLabel: true,
							anchor: '100%',
							items: [{
								xtype: 'combo',
								name: 'type',
								fieldLabel: 'Storage engine',
								editable: false,
								flex: 1,
								labelWidth: 95,
								store: {
									fields: [ 'description', 'name' ],
									proxy: 'object'
								},
								valueField: 'name',
								displayField: 'description',
								queryMode: 'local',
								allowBlank: false,
								listeners: {
									change: function(field, value) {
										var editor = this.up('#editor'),
											ebs = editor.down('#ebs_settings'),
											ebsSnapshots = editor.down('[name="ebs.snapshot"]'),
											raid = editor.down('#raid_settings'),
											csvol = editor.down('#csvol_settings');

										ebs[ value == 'ebs' || value == 'raid.ebs' ? 'show' : 'hide' ]();
										ebs[ value == 'ebs' || value == 'raid.ebs' ? 'enable' : 'disable' ]();
										ebsSnapshots[ value == 'ebs' ? 'show' : 'hide' ]();
										raid[ value == 'raid.ebs' || value == 'raid.csvol' ? 'show' : 'hide' ]();
										raid[ value == 'raid.ebs' || value == 'raid.csvol' ? 'enable' : 'disable' ]();
										csvol[ value == 'csvol' || value == 'raid.csvol' ? 'show' : 'hide' ]();
										csvol[ value == 'csvol' || value == 'raid.csvol' ? 'enable' : 'disable' ]();

										if (value == 'raid.ebs' || value == 'raid.csvol') {
											// set default values for raid configuration
											raid.down('[name="raid.level"]').setValue('10');
										}
									}
								}
							}, {
								xtype: 'combo',
								name: 'fs',
								fieldLabel: 'Filesystem',
								editable: false,
								width: 180,
								labelWidth: 70,
								margin: '0 0 0 12',
								store: {
									fields: [ 'fs', 'description' ],
									proxy: 'object'
								},
								valueField: 'fs',
								displayField: 'description',
								queryMode: 'local',
								allowBlank: false
							}]
						}, {
							xtype: 'fieldcontainer',
							layout: 'hbox',
							hideLabel: true,
							anchor: '100%',
							items: [{
								xtype: 'checkbox',
								boxLabel: 'Automatically mount device to',
								name: 'mount',
								inputValue: 1,
								handler: function (field, checked) {
									if (checked)
										this.next('[name="mountPoint"]').enable();
									else
										this.next('[name="mountPoint"]').disable();
								}
							}, {
								xtype: 'textfield',
								margin: '0 0 0 5',
								disabled: true,
								allowBlank: false,
								flex: 1,
								name: 'mountPoint'
							}, {
								xtype: 'displayfield',
								margin: '0 0 0 5',
								value: 'mount point.'
							}]
						}, {
							xtype: 'fieldcontainer',
							layout: 'hbox',
							hideLabel: true,
							items: [{
								xtype: 'checkbox',
								name: 'reUse',
								boxLabel: 'Re-use',
								inputValue: 1
							}, {
								xtype: 'displayinfofield',
								value: "If re-use is checked, volume will be always re-attached to the replaced server. If it's not checked during server replacement new volume will be created according to the settings and old one will be removed.",
								margin: '0 0 0 5'
							}]
						}]
					}, {
						xtype:'fieldset',
						itemId: 'raid_settings',
						title: 'RAID settings',
						items: [{
							xtype: 'fieldcontainer',
							layout: 'hbox',
							hideLabel: true,
							anchor: '100%',
							items: [{
								xtype: 'combo',
								name: 'raid.level',
								hideLabel: true,
								editable: false,
								store: {
									fields: [ 'name', 'description' ],
									proxy: 'object',
									data: [
										{ name: '0', description: 'RAID 0 (block-level striping without parity or mirroring)' },
										{ name: '1', description: 'RAID 1 (mirroring without parity or striping)' },
										{ name: '5', description: 'RAID 5 (block-level striping with distributed parity)' },
										{ name: '10', description: 'RAID 10 (mirrored sets in a striped set)' }
									]
								},
								valueField: 'name',
								displayField: 'description',
								value: '0',
								queryMode: 'local',
								flex: 1,
								allowBlank: false,
								listeners: {
									change: function() {
										var data = [], field = this.next('[name="raid.volumes_count"]');

										if (this.getValue() == '0') {
											data = [{ id: 2, name: 2 }, { id: 3, name: 3 }, { id: 4, name: 4 }, { id: 5, name: 5 },
												{ id: 6, name: 6 }, { id: 7, name: 7 }, { id: 8, name: 8 }];
										} else if (this.getValue() == '1') {
											data = [{ id: 2, name: 2 }];
										} else if (this.getValue() == '5') {
											data = [{ id: 3, name: 3 }, { id: 4, name: 4 }, { id: 5, name: 5 },
												{ id: 6, name: 6 }, { id: 7, name: 7 }, { id: 8, name: 8 }];
										} else if (this.getValue() == '10') {
											data = [{ id: 4, name: 4 }, { id: 6, name: 6 }, { id: 8, name: 8 }];
										} else {
											field.reset();
											field.disable();
											return;
										}

										field.store.loadData(data);
										field.enable();
										if (! field.getValue())
											field.setValue(field.store.first().get('id'));
									}
								}
							}, {
								xtype: 'displayfield',
								value: 'on',
								margin: '0 0 0 5'
							}, {
								xtype: 'combo',
								name: 'raid.volumes_count',
								disabled: true,
								editable: false,
								width: 45,
								store: {
									fields: [ 'id', 'name'],
									proxy: 'object'
								},
								valueField: 'id',
								displayField: 'name',
								queryMode: 'local',
								margin: '0 0 0 5'
							}, {
								xtype: 'displayfield',
								value: 'volumes',
								margin: '0 0 0 5'
							}]
						}]
					}, {
						xtype:'fieldset',
						itemId: 'ebs_settings',
						title: 'Volume settings',
						defaults: {
							labelWidth: 80
						},
						items: [{
							xtype: 'fieldcontainer',
							layout: 'hbox',
							fieldLabel: 'Size',
							width: 160,
							items: [{
								xtype: 'textfield',
								name: 'ebs.size',
								allowBlank: false,
								flex: 1,
								validator: function(value) {
									var field = this.up('fieldcontainer').next('[name="ebs.snapshot"]');
									if (! field.isDisabled() && field.getValue()) {
										var record = field.findRecord(field.valueField, field.getValue());
										if (record && (parseInt(value) < record.get('size')))
											return 'Value should be more than snapshot\'s size: ' + record.get('size') + 'GB';
									}

									if (parseInt(value) < 1 || parseInt(value) > 1024)
										return 'Size should be from 1 to 1024 GB';
									else
										return true;
								}
							}, {
								xtype: 'displayfield',
								value: 'GB',
								margin: '0 0 0 5'
							}]
						}, {
							xtype: 'fieldcontainer',
							layout: 'hbox',
							fieldLabel: 'EBS type',
							width: 370,
							items: [{
								xtype: 'combo',
								store: [['standard', 'Standard'], ['io1', 'Provisioned IOPS (100-2000): ']],
								valueField: 'id',
								displayField: 'name',
								editable: false,
								queryMode: 'local',
								value: 'standard',
								name: 'ebs.type',
								width: 220,
								listeners: {
									change: function (field, value) {
										var c = this.next('[name="ebs.iops"]');
										if (value == 'io1')
											c.show().enable();
										else
											c.hide().disable();
									}
								}
							}, {
								xtype: 'textfield',
								name: 'ebs.iops',
								hideLabel: true,
								hidden: true,
								disabled: true,
								margin: '0 0 0 5',
								allowBlank: false,
								validator: function(value) {
									if (parseInt(value) < 100 || parseInt(value) > 2000)
										return 'IOPS should be from 100 to 2000';
									else
										return true;
								},
								width: 60
							}]
						}, {
							xtype: 'combo',
							fieldLabel: 'Snapshot',
							name: 'ebs.snapshot',
							emptyText: 'Create empty volume',
							valueField: 'snapshotId',
							displayField: 'snapshotId',
							queryMode: 'local',
							anchor: '100%',
							matchFieldWidth: true,
							store: {
								fields: [ 'snapshotId', 'createdDate', 'size', 'volumeId', 'description' ],
								proxy: 'object'
							},
							listConfig: {
								cls: 'x-boundlist-alt',
								tpl:
									'<tpl for="."><div class="x-boundlist-item" style="height: auto; width: auto">' +
										'<tpl if="snapshotId">' +
											'<div style="font-weight: bold">{snapshotId} ({size}GB)</div>' +
											'<div>created <span style="font-weight: bold">{createdDate}</span> on <span style="font-weight: bold">{volumeId}</span></div>' +
											'<div style="font-style: italic; font-size: 11px;">{description}</div>' +
										'<tpl else><div style="line-height: 26px;">Create empty volume</div></tpl>' +
									'</div></tpl>'
							},
							filterFn: function(queryString, item) {
								var value = new RegExp(queryString);
								return (
									value.test(item.get('snapshotId')) ||
										value.test(item.get('volumeId')) ||
										value.test(item.get('description'))
									) ? true : false;
							},
							listeners: {
								expand: function() {
									var tab = this.up('#storage'), me = this;

									if (this.cloudLocation != this.loadedCloudLocation) {
										if (tab.cacheExist([ 'snapshotsEC2', this.cloudLocation ])) {
											me.store.loadData(tab.cacheGet([ 'snapshotsEC2', this.cloudLocation ]));
											me.forceSelection = true;
										} else {
											Scalr.Request({
												processBox: {
													action: 'load',
													msg: 'Loading ebs snapshots'
												},
												params: {
													cloudLocation: me.cloudLocation
												},
												url: '/platforms/ec2/xGetSnapshots',
												success: function(response) {
													response.data.unshift({
														instanceId: ''
													});
													tab.cacheSet(response.data, [ 'snapshotsEC2', me.cloudLocation ]);
													me.loadedCloudLocation = me.cloudLocation;
													me.store.loadData(response.data);
													me.forceSelection = true;
												}
											});
										}
									}
								}
							}
						}]
					}, {
						xtype:'fieldset',
						itemId: 'csvol_settings',
						title: 'Volume settings',
						defaults: {
							labelWidth: 100,
							width: 300
						},
						items: [{
							xtype: 'textfield',
							fieldLabel: 'Size',
							name: 'csvol.size',
							allowBlank: false
						}]
					}, {
						xtype: 'container',
						itemId: 'buttons',
						layout: {
							type: 'hbox',
							pack: 'center'
						},
						items: [{
							xtype: 'button',
							itemId: 'add',
							text: 'Add',
							handler: function() {
								var editor = this.up('#editor'), conf = this.up('#storage').down('#configuration');
								if (editor.getForm().isValid()) {
									editor.getForm().updateRecord();
									conf.store.add(editor.getRecord());
									editor.getForm().reset(true);
									editor.hide();
								}
							}
						}, {
							xtype: 'button',
							itemId: 'save',
							text: 'Save',
							handler: function() {
								var editor = this.up('#editor'), conf = this.up('#storage').down('#configuration');
								if (editor.getForm().isValid()) {
									editor.getForm().updateRecord();
									editor.getForm().reset(true);
									conf.getSelectionModel().setLastFocused(null);
								}
							}
						}, {
							xtype: 'button',
							margin: '0 0 0 12',
							itemId: 'cancel',
							text: 'Cancel',
							handler: function() {
								var editor = this.up('#editor'), conf = this.up('#storage').down('#configuration');
								editor.getForm().reset(true);
								conf.getSelectionModel().setLastFocused(null);
								editor.hide();
							}
						}, {
							xtype: 'button',
							margin: '0 0 0 12',
							itemId: 'delete',
							text: 'Delete',
							handler: function() {
								var editor = this.up('#editor'), conf = this.up('#storage').down('#configuration'), record = conf.getSelectionModel().lastFocused;
								editor.getForm().reset(true);

								if (!record.get('id')) {
									record.store.remove(record);
								} else {
									record.set('status', 'Pending delete');
								}

								conf.getSelectionModel().setLastFocused(null);
								editor.hide();
							}
						}]
					}]
				}]
			}]
		}]
	});
});