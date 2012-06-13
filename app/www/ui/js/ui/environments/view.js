Scalr.regPage('Scalr.ui.environments.view', function (loadParams, moduleParams) {
	var store = Ext.create('store.store', {
		fields: [
			'id', 'name', 'dtAdded', 'isSystem','platforms', 'status'
		],
		proxy: {
			type: 'scalr.paging',
			url: '/environments/xListEnvironments/'
		},
		remoteSort: true
	});

	return Ext.create('Ext.grid.Panel', {
		title: 'Environments &raquo; View',
		scalrOptions: {
			'reload': false,
			'maximize': 'all'
		},
		scalrReconfigure: function (loadParams) {
			this.store.load();
		},
		store: store,
		stateId: 'grid-environments-view',
		plugins: {
			ptype: 'gridstore'
		},

		viewConfig: {
			emptyText: 'No environments found'
		},

		columns: [
			{ header: 'ID', width: 70, dataIndex: 'id', sortable: true },
			{ header: 'Name', flex: 1, dataIndex: 'name', sortable: true },
			{ header: 'Enabled cloud platforms', flex: 2, dataIndex: 'platforms', sortable: false },
			{ header: 'Date added', width: 180, dataIndex: 'dtAdded', sortable: true },
			{ header: 'Status', width: 80, dataIndex: 'status', sortable: true, xtype: 'templatecolumn', tpl:
				'<tpl if="status == &quot;Active&quot;"><span style="color: green">{status}</span></tpl>' +
				'<tpl if="status == &quot;Inactive&quot;"><span style="color: red">{status}</span></tpl>'

			},
			{ header: 'System', width: 70, dataIndex: 'isSystem', sortable: false, xtype: 'templatecolumn', align: 'center', tpl:
				'<tpl if="isSystem == 1"><img src="/ui/images/icons/true.png"></tpl>' +
				'<tpl if="isSystem != 1">-</tpl>'
			}, {
				xtype: 'optionscolumn',
				getOptionVisibility: function (item, record) {
					if (record.get('status') == 'Active' && item.itemId == 'option.activate')
						return false;

					if (record.get('status') == 'Inactive' && item.itemId == 'option.deactivate')
						return false;

					if (moduleParams.owner) {
						return true;
					} else if (item.itemId == 'option.rename' || item.itemId == 'option.delete') {
						return false;
					} else
						return true;
				},
				optionsMenu: [{
					text: 'Configure',
					iconCls: 'scalr-menu-icon-configure',
					href: '#/environments/{id}/edit'
				}, {
					text: 'Rename',
					itemId: 'option.rename',
					menuHandler: function (item) {
						Scalr.Request({
							confirmBox: {
								title: 'Enter new name of environment "' + item.record.get('name') + '"',
								form: [{
									xtype: 'textfield',
									fieldLabel: 'Name',
									allowBlank: false,
									name: 'name',
									value: item.record.get('name'),
									regex: /[A-Za-z0-9-\s]+$/
								}],
								formValidate: true
							},
							processBox: {
								type: 'action'
							},
							url: '/environments/' + item.record.get('id') + '/xRename',
							success: function (data) {
								store.load();
								Scalr.event.fireEvent('update', '/environments/rename', data.env);
							}
						});
					}
				}, {
					text: 'Activate',
					itemId: 'option.activate',
					request: {
						confirmBox: {
							msg: 'Are you sure want to activate environment "{name}" ?',
							type: 'action'
						},
						processBox: {
							type: 'action'
						},
						params: {
							status: 'Active'
						},
						dataHandler: function (record) {
							this.url = '/environments/' + record.get('id') + '/xSetStatus';
						},
						success: function (data) {
							store.load();
						}
					}
				}, {
					text: 'Deactivate',
					itemId: 'option.deactivate',
					request: {
						confirmBox: {
							msg: 'Are you sure want to deactivate environment "{name}" ?',
							type: 'action'
						},
						processBox: {
							type: 'action'
						},
						params: {
							status: 'Inactive'
						},
						dataHandler: function (record) {
							this.url = '/environments/' + record.get('id') + '/xSetStatus';
						},
						success: function (data) {
							store.load();
						}
					}
				}, {
					itemId: 'option.delete',
					text: 'Delete',
					iconCls: 'scalr-menu-icon-delete',
					request: {
						confirmBox: {
							msg: 'Are you sure want to delete environment "{name}"? You <b>WILL LOSE</b> all settings, dns zones, virtualhosts etc. assigned to this environment.',
							type: 'delete'
						},
						processBox: {
							type: 'delete',
							msg: 'Removing environment. Please wait...'
						},
						dataHandler: function (record) {
							this.url = '/environments/' + record.get('id') + '/xRemove';
						},
						success: function (data) {
							Scalr.event.fireEvent('update', '/environments/delete', data.env);
							if (data.flagReload)
								Scalr.event.fireEvent('reload');
							else
								store.load();
						}
					}
				}]
			}
		],
		dockedItems: [{
			xtype: 'scalrpagingtoolbar',
			store: store,
			dock: 'top',
			items: ['-', {
				icon: '/ui/images/icons/add_icon_16x16.png', // icons can also be specified inline
				cls: 'x-btn-icon',
				hidden: !moduleParams.owner,
				tooltip: 'Create new environment',
				handler: function() {
					Scalr.event.fireEvent('redirect', '#/environments/create');
				}
			}]
		}]
	});
});
