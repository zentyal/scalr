Scalr.regPage('Scalr.ui.account.users.view2', function (loadParams, moduleParams) {
	
	var store = Ext.create('store.store', {
		fields: [
			'id', 'status', 'email', 'fullname', 'dtcreated', 'dtlastlogin', 'type', 'comments', 'teams', 'type', 'is2FaEnabled', 'password'
		],
		data: moduleParams['usersList'],
		proxy: {
			type: 'object'
		},
		filterOnLoad: true
	});
	
	var grid = Ext.create('Ext.grid.Panel', {
		cls: 'scalr-ui-panel-columned-leftcol',
		flex: 1,
		multiSelect: true,
		selType: 'selectedmodel',
		store: store,
		stateId: 'grid-account-users-view',
		plugins: [
			'gridstore',
			'rowpointer'
		],
		listeners: {
			selectionchange: function(selModel, selected) {
				this.down('#delete').setDisabled(!selected.length);
				this.down('#activate').setDisabled(!selected.length);
				this.down('#deactivate').setDisabled(!selected.length);
			}
		},
		viewConfig: {
			emptyText: 'No users found',
			loadingText: 'Loading users ...',
			deferEmptyText: false
		},

		columns: [
			{text: 'Name', flex: 1, dataIndex: 'fullname', sortable: true},
			{text: 'Email', flex: 1, dataIndex: 'email', sortable: true},
			{ text: 'Status', width: 80, dataIndex: 'status', sortable: true, xtype: 'templatecolumn', tpl:
				'<span ' +
				'<tpl if="status == &quot;Active&quot;">style="color: green"</tpl>' +
				'<tpl if="status != &quot;Active&quot;">style="color: red"</tpl>' +
				'>{status}</span>'
			},
			{text: 'Last login', width: 170, dataIndex: 'dtlastlogin', sortable: true}
		],
		dockedItems: [{
			dock: 'top',
			layout: 'hbox',
			defaults: {
				margin: '0 0 0 10',
				handler: function() {
					var action = this.getItemId(),
						actionMessages = {
							'delete': ['Delete selected user(s): %s ?', 'Deleting selected users(s) ...'],
							activate: ['Activate selected user(s): %s ?', 'Activating selected users(s) ...'],
							deactivate: ['Deactivate selected user(s): %s ?', 'Deactivating selected users(s) ...']
						},
						selModel = grid.getSelectionModel(),
						ids = [], 
						emails = [],
						request = {};
					for (var i=0, records = selModel.getSelection(), len=records.length; i<len; i++) {
						ids.push(records[i].get('id'));
						emails.push(records[i].get('email'));
					}
					
					request = {
						confirmBox: {
							msg: actionMessages[action][0],
							type: action,
							objects: emails
						},
						processBox: {
							msg: actionMessages[action][1],
							type: action
						},
						params: {ids: ids, action: action},
						success: function (data) {
							if (data.processed) {
								if (data.processed.length) {
									switch (action) {
										case 'activate':
										case 'deactivate':
											for (var i=0,len=data.processed.length; i<len; i++) {
												var record = store.getById(data.processed[i]);
												record.set('status', action=='deactivate'?'Inactive':'Active');
												selModel.deselect(record);
											}
										break;
										case 'delete':
											var recordsToDelete = [];
											for (var i=0,len=data.processed.length; i<len; i++) {
												recordsToDelete[i] = store.getById(data.processed[i]);
												selModel.deselect(recordsToDelete[i]);
											}
											store.remove(recordsToDelete);
										break;
									}
								}
							}
							selModel.refreshLastFocused();
						}
					};
					request.url = '/account/users/xGroupActionHandler';
					request.params.ids = Ext.encode(ids);
					
					Scalr.Request(request);
				}
			},
			items: [{
				xtype: 'livesearch',
				margin: 0,
				fields: ['fullname', 'email'],
				store: store
			},{
				xtype: 'tbfill' 
			},{
				itemId: 'activate',
				xtype: 'button',
				iconCls: 'x-btn-groupacton-activate',
				ui: 'action',
				disabled: true,
				tooltip: 'Activate selected users'
			},{
				itemId: 'deactivate',
				xtype: 'button',
				iconCls: 'x-btn-groupacton-deactivate',
				ui: 'action',
				disabled: true,
				tooltip: 'Deactivate selected users'
			},{
				itemId: 'delete',
				xtype: 'button',
				iconCls: 'x-btn-groupacton-delete',
				ui: 'action',
				disabled: true,
				tooltip: 'Delete selected users'
			},{
				itemId: 'refresh',
				xtype: 'button',
				iconCls: 'x-btn-groupacton-refresh',
				ui: 'action',
				tooltip: 'Refresh',
				handler: function() {
					Scalr.Request({
						processBox: {
							type: 'action'
						},
						url: '/account/users/xGetList',
						success: function(data) {
							store.loadData(data['usersList']);
						}
					});
				}
			},{
				itemId: 'add',
				xtype: 'button',
				iconCls: 'x-btn-groupacton-add',
				ui: 'action',
				tooltip: 'Add user',
				handler: function() {
					grid.getSelectionModel().setLastFocused(null);
					form.loadRecord(store.createModel({password:  false}));
				}
			}]
		}]
	});
	
	var form = 	Ext.create('Ext.form.Panel', {
		hidden: true,
		fieldDefaults: {
			anchor: '100%'
		},
		listeners: {
			afterrender: function() {
				var me = this;
				grid.getSelectionModel().on('focuschange', function(gridSelModel){
					if (gridSelModel.lastFocused) {
						me.loadRecord(gridSelModel.lastFocused);
					} else {
						me.setVisible(false);
					}
				});
			},
			beforeloadrecord: function(record) {
				var form = this.getForm();

				form.reset();
				var c = this.query('component[cls~=hideonedit], #delete');
				for (var i=0, len=c.length; i<len; i++) {
					c[i].setVisible(!record.phantom);
				}
				this.down('#settings').setTitle((!record.phantom?'Edit':'Add') + ' user');
			},
			loadrecord: function(record) {
				if (!this.isVisible()) {
					this.setVisible(true);
				}			
			}
		},
		items: [{
			itemId: 'settings',
			xtype: 'fieldset',
			title: 'Settings',
			items: [{
				xtype: 'displayfield',
				cls: 'hideonedit',
				fieldLabel: 'ID',
				name: 'id',
				submitValue: true
			},{
				xtype: 'textfield',
				name: 'fullname',
				fieldLabel: 'Full name'
			},{
				xtype: 'textfield',
				name: 'email',
				fieldLabel: 'Email',
				allowBlank: false,
				vtype: 'email'
			}, {
				xtype: 'passwordfield',
				name: 'password',
				fieldLabel: 'Password',
				emptyText: 'Leave blank to let user specify password by himself',
				allowBlank: true
			},{
				xtype: 'displayfield',
				cls: 'hideonedit',
				name: 'teams',
				fieldLabel: 'Teams',
				fieldStyle: 'color:#0055cc',
				valueToRaw: function(value) {
					var teams = [];
					if (value) {
						Ext.each(value, function(team) {
							teams.push(team.name);
						});
					}
					return teams.join(', ');
				}
			},{
				xtype: 'displayfield',
				cls: 'hideonedit',
				name: 'dtcreated',
				fieldLabel: 'User added'
			},{
				xtype: 'displayfield',
				cls: 'hideonedit',
				name: 'dtlastlogin',
				fieldLabel: 'Last login'
			},{
				xtype: 'buttongroupfield',
				fieldLabel: 'Status',
				name: 'status',
				value: 'Active',
				items: [{
					text: 'Active',
					value: 'Active'
				}, {
					text: 'Inactive',
					value: 'Inactive'
				}]
			}, {
				xtype: 'textarea',
				name: 'comments',
				fieldLabel: 'Comments',
				labelAlign: 'top',
				grow: true,
				growMax: 400,
				anchor: '100%'
			}]
		}],
		dockedItems: [{
			xtype: 'container',
			dock: 'bottom',
			cls: 'x-toolbar',
			layout: {
				type: 'hbox',
				pack: 'center'
			},
			items: [{
				itemId: 'save',
				xtype: 'button',
				text: 'Save',
				handler: function () {
					var frm = form.getForm(),
						record = frm.getRecord();
					if (frm.isValid()) {
						Scalr.Request({
							processBox: {
								type: 'save'
							},
							url: '/account/users/xxxSave',
							form: frm,
							success: function (data) {
								if (record.phantom) {
									store.add(data.user);
								} else {
									frm.updateRecord();
								}
								grid.getSelectionModel().setLastFocused(null);
							}
						});
					}
				}
			}, {
				itemId: 'cancel',
				xtype: 'button',
				text: 'Cancel',
				handler: function() {
					grid.getSelectionModel().setLastFocused(null);
					form.setVisible(false);
				}
			}, {
				itemId: 'delete',
				xtype: 'button',
				cls: 'x-btn-default-small-red',
				text: 'Delete',
				handler: function() {
					var record = form.getForm().getRecord();
					Scalr.Request({
						confirmBox: {
							msg: 'Delete user ' + record.get('email') + ' ?',
							type: 'delete'
						},
						processBox: {
							msg: 'Deleting...',
							type: 'delete'
						},
						scope: this,
						url: '/account/users/xRemove',
						params: {userId: record.get('id')},
						success: function (data) {
							record.store.remove(record);
							grid.getSelectionModel().setLastFocused(null);
						}
					});
				}
			}]
		}]
	});


	var panel = Ext.create('Ext.panel.Panel', {
		cls: 'scalr-ui-panel-columned',
		leftMenu: {
			menuId: 'account',
			itemId: 'users'
		},
		layout: {
			type: 'hbox',
			align: 'stretch'
		},
		scalrOptions: {
			'reload': true,
			'maximize': 'all'
		},
		items: [
			grid
		,{
			cls: 'scalr-ui-panel-columned-rightcol',
			flex: 1,
			maxWidth: 580,
			items: [
				form
			]
		}]	
	});
	return panel;
});
