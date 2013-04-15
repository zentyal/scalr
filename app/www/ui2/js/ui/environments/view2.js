Scalr.regPage('Scalr.ui.environments.view2', function (loadParams, moduleParams) {
	var store = Ext.create('store.store', {
		fields: [
			'id', 'name', 'dtAdded', 'isSystem', 'platforms', 'status', {name: 'timezone', defaultValue: 'America/Adak'}, 'teams'
		],
		data: moduleParams['envList'],//[{"id":"7783","name":"default","dtAdded":"May 29, 2012 10:22:12","isSystem":"1","status":"Inactive","platforms":"Amazon EC2, Amazon RDS"},{"id":"7785","name":"test","dtAdded":"Oct 24, 2012 13:36:18","isSystem":"0","status":"Active","platforms":null},{"id":"7786","name":"default","dtAdded":"May 29, 2012 10:22:12","isSystem":"1","status":"Active","platforms":"Amazon EC2, Amazon RDS"},{"id":"7787","name":"test","dtAdded":"Oct 24, 2012 13:36:18","isSystem":"0","status":"Active","platforms":null},{"id":"7788","name":"default","dtAdded":"May 29, 2012 10:22:12","isSystem":"1","status":"Active","platforms":"Amazon EC2, Amazon RDS"},{"id":"7789","name":"test","dtAdded":"Oct 24, 2012 13:36:18","isSystem":"0","status":"Active","platforms":null},{"id":"7780","name":"default","dtAdded":"May 29, 2012 10:22:12","isSystem":"1","status":"Active","platforms":"Amazon EC2, Amazon RDS"},{"id":"7715","name":"test","dtAdded":"Oct 24, 2012 13:36:18","isSystem":"0","status":"Active","platforms":null},{"id":"7713","name":"default","dtAdded":"May 29, 2012 10:22:12","isSystem":"1","status":"Active","platforms":"Amazon EC2, Amazon RDS"},{"id":"7735","name":"test","dtAdded":"Oct 24, 2012 13:36:18","isSystem":"0","status":"Active","platforms":null},{"id":"7743","name":"default","dtAdded":"May 29, 2012 10:22:12","isSystem":"1","status":"Active","platforms":"Amazon EC2, Amazon RDS"},{"id":"7755","name":"test","dtAdded":"Oct 24, 2012 13:36:18","isSystem":"0","status":"Active","platforms":null}],
		proxy: {
			type: 'object'
		}
	});
	var storeTeams = Ext.create('store.store', {
		fields: [
			'id', 'name', 'access', 'usercount', 'envs'
		],
		data: moduleParams['teams'],
		proxy: {
			type: 'object'
		}
	});

    var dataview = Ext.create('Ext.view.View', {
        deferInitialRefresh: false,
        store: store,
		cls: 'scalr-ui-dataview',
        tpl  : Ext.create('Ext.XTemplate',
            '<tpl for=".">',
                '<div class="x-item">',
					'<div class="x-item-inner">',
						'<table>',
							'<tr>',
								'<td>',
									'<div class="x-item-title">{name}</div>',
									'<span class="x-item-param-title">Teams:&nbsp;&nbsp;</span>{[values.teams ? values.teams.length : "<br/>no teams assigned"]}',
								'</td>',
								'<td>',
									'<div class="x-item-status{[values.status == "Active" ? "" : " x-item-status-inactive"]}">{status}</div>',
									'<span class="x-item-param-title">Enabled platforms: </span><br/>{[values.platforms ? "" : "no platforms enabled"]}',
									'<tpl for="values.platforms">',
									'{.}{[xindex<xcount ? ", " : ""]}',
									'</tpl>',
								'</td>',
							'</tr>',
						'</table>',
					'</div>',
                '</div>',
            '</tpl>'
        ),
		emptyText: 'No environment found',
		loadingText: 'Loading environments ...',
		deferEmptyText: false,

        itemSelector: '.x-item',
        overItemCls : 'x-item-over',
		trackOver: true
    });

	var form = 	Ext.create('Ext.form.Panel', {
		hidden: true,
		fieldDefaults: {
			anchor: '100%'
		},
		listeners: {
			afterrender: function() {
				var me = this;
				dataview.on('selectionchange', function(dataview, selection){
					if (selection.length) {
						me.loadRecord(selection[0]);
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
				this.down('#settings').setTitle((!record.phantom?'Edit':'Add') + ' environment');
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
			defaults: {
				border: false,
				xtype: 'panel',
				flex: 1,
				layout: 'anchor',
				maxWidth: 370
			},

			layout: 'hbox',
			items: [{
				items: [{
					xtype: 'textfield',
					name: 'name',
					fieldLabel: 'Environment',
					allowBlank: false

				},{
					xtype: 'combo',
					fieldLabel: 'Timezone',
					store: moduleParams['timezones'],
					allowBlank: false,
					editable: true,
					name: 'timezone',
					queryMode: 'local'
				}]
			},{
				defaults:{
					labelStyle: 'padding-left:20px'	
				},
				items: [{
					xtype: 'checkboxfield',
					fieldLabel: 'System',
					name: 'isSystem'
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
				}]
			}]
		}, {
			xtype: 'fieldset',
			title: 'Clouds',
			itemId: 'platforms',
			cls: 'hideonedit'
		},{
			xtype: 'fieldset',
			title: 'Accessible by',
			items: {
				xtype: 'gridfield',
				name: 'teams',
				flex: 1,
				maxWidth: 740,
				store: storeTeams,
				viewConfig: {
					focusedItemCls: '',
					overItemCls: ''
				},
				columns: [
					{text: 'Team name', flex: 1, dataIndex: 'name', sortable: true},
					{text: 'Number of users', flex: 1, dataIndex: 'count', sortable: true},
					{text: 'Other environments', flex: 1, dataIndex: 'envs', sortable: false}
				]
			}

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
				handler: function() {
					var frm = form.getForm();
					if (frm.isValid()) {
						var record = frm.getRecord();
						Scalr.Request({
							processBox: {
								type: 'save'
							},
							url: '/environments/'+ (record.phantom?'xCreate':'xSave'),
							form: frm,
							params: record.phantom?{}:{envId: record.get('id')},
							success: function (data) {
								if (record.phantom) {
									dataview.getSelectionModel().select(store.add(data.env));
								} else {
									frm.updateRecord();
								}
							}
						});
					}
				}
			}, {
				itemId: 'cancel',
				xtype: 'button',
				text: 'Cancel',
				handler: function() {
					dataview.deselect(form.getForm().getRecord());
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
							msg: 'Delete environment ' + record.get('name') + ' ?',
							type: 'delete'
						},
						processBox: {
							msg: 'Deleting...',
							type: 'delete'
						},
						scope: this,
						url: '/environments/xRemove',
						params: {envId: record.get('id')},
						success: function (data) {
							record.store.remove(record);
							//dataview.getSelectionModel().setLastFocused(null);
						}
					});
				}
			}]
		}]
	});

	for (var i in moduleParams['platforms']) {
		var disabled = true;//environment['enabledPlatforms'].indexOf(i) == -1;
		form.down('#platforms').add({
			xtype: 'custombutton',
			width: 109,
			height: 112,
			cls: 'scalr-ui-environment-edit-btn',
			childEls: [ 'icon' ],
			renderTpl:
				'<div class="{prefix}-btn-custom" id="{id}-btnEl">' +
					'<div id="{id}-icon" class="{prefix}-btn-icon"><img src="{icon}"></div>' +
					'<div class="{prefix}-btn-name">{name}</div>' +
				'</div>',
			renderData: {
				prefix: 'scalr-ui-environment-edit',
				name: moduleParams['platforms'][i],
				icon: '/ui2/images/icons/platform/' + i + (disabled ? '_disabled' : '') + '_89x64.png'
			},
			platform: i,
			handler: function () {
				var c = Scalr.cache['Scalr.ui.environments.platform.'+this.platform]({beta:1, parent:panel}, {params:{}, env:{id:form.getForm().getRecord().get('id'),name:form.getForm().getRecord().get('name')}});
				Scalr.application.add(c);
				Scalr.application.layout.setActiveItem(c, {beta:1});
			}
		});
	};
	
	var panel = Ext.create('Ext.panel.Panel', {
		cls: 'scalr-ui-panel-columned',
		leftMenu: {
			menuId: 'account',
			itemId: 'environments'
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
			Ext.create('Ext.panel.Panel', {
				cls: 'scalr-ui-panel-columned-leftcol',
				width: 440,
				items: dataview,
				autoScroll: true,
				dockedItems: [{
					dock: 'top',
					layout: 'hbox',
					items: [{
						xtype: 'livesearch',
						margin: 0,
						fields: ['name'],
						store: store
					},{
						xtype: 'tbfill' 
					},{
						itemId: 'add',
						xtype: 'button',
						iconCls: 'x-btn-groupacton-add',
						ui: 'action',
						tooltip: 'Add environment',
						handler: function(){
							dataview.deselect(form.getForm().getRecord());
							form.loadRecord(store.createModel({}));
						}
					}]
				}]				
			})			
		,{
			cls: 'scalr-ui-panel-columned-rightcol',
			flex: 1,
			items: [
				form
			],
			autoScroll: true
		}]	
	});
	return panel;
});
