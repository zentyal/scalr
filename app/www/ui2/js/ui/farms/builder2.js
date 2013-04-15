Scalr.regPage('Scalr.ui.farms.builder2', function (loadParams, moduleParams) {
	var farmRolesStore = Ext.create('Ext.data.Store', {
		fields: ['name'],
		proxy: {
			type: 'memory'
		},
		data: [
			{name: 'name1'},{name: 'name2'},{name: 'name3'},{name: 'name4'},{name: 'name5'},{name: 'name6'},{name: 'name7'},{name: 'name8'},{name: 'name9'},{name: 'name10'}
		]
	});
	var allRolesStore = Ext.create('Ext.data.Store', {
		fields: ['name'],
		proxy: {
			type: 'memory'
		},
		data: [
			{name: 'name1'},{name: 'name2'},{name: 'name3'},{name: 'name4'},{name: 'name5'},{name: 'name6'},{name: 'name7'},{name: 'name8'},{name: 'name9'},{name: 'name10'},
			{name: 'name1'},{name: 'name2'},{name: 'name3'},{name: 'name4'},{name: 'name5'},{name: 'name6'},{name: 'name7'},{name: 'name8'},{name: 'name9'},{name: 'name10'},
			{name: 'name1'},{name: 'name2'},{name: 'name3'},{name: 'name4'},{name: 'name5'},{name: 'name6'},{name: 'name7'},{name: 'name8'},{name: 'name9'},{name: 'name10'},
			{name: 'name1'},{name: 'name2'},{name: 'name3'},{name: 'name4'},{name: 'name5'},{name: 'name6'},{name: 'name7'},{name: 'name8'},{name: 'name9'},{name: 'name10'},
			//{name: 'name1'},{name: 'name2'},{name: 'name3'},{name: 'name4'},{name: 'name5'},{name: 'name6'},{name: 'name7'},{name: 'name8'},{name: 'name9'},{name: 'name10'},
			//{name: 'name1'},{name: 'name2'},{name: 'name3'},{name: 'name4'},{name: 'name5'},{name: 'name6'},{name: 'name7'},{name: 'name8'},{name: 'name9'},{name: 'name10'},
			{name: 'name1'},{name: 'name2'},{name: 'name3'},{name: 'name4'},{name: 'name5'},{name: 'name6'},{name: 'name7'},{name: 'name8'},{name: 'name9'},{name: 'name10'}
		]
	});
	
	var panel = Ext.create('Ext.tab.Panel', {
		style: 'background:#A8B6C6',
		scalrOptions: {
			'maximize': 'all'
		},
		title: 'Farms &raquo; ' + (moduleParams.farm ? moduleParams.farm.farm.name : 'Builder'),

		activeTab: 0,
		items: [{
			title: 'Farm',
			itemId: 'farm',
			xtype: 'form',
			bodyCls: 'x-panel-body-frame',
			items: [{
				xtype: 'fieldset',
				title: 'General info',
				items: [{
					xtype: 'textfield',
					itemId: 'farmName',
					fieldLabel: 'Name',
					labelWidth: 70,
					value: moduleParams.farm ? moduleParams.farm.farm.name : '',
					width: 500
				}, {
					xtype: 'textarea',
					itemId: 'farmDescription',
					fieldLabel: 'Description',
					labelWidth: 70,
					value: moduleParams.farm ? moduleParams.farm.farm.description : '',
					anchor: '100%',
					grow: true
				}]
			}, {
				xtype: 'fieldset',
				title: 'Settings',
				itemId: 'settings',
				items: [{
					xtype: 'radiogroup',
					hideLabel: true,
					columns: 1,
					items: [{
						boxLabel: 'Launch roles simultaneously ',
						checked: true,
						inputValue: '0'
					}/*, {
						boxLabel: 'Launch roles one-by-one in the order I set (slower) ',
						name: 'farm_roles_launch_order',
						inputValue: '1'
					}*/]
				}]
			}]
		}, {
			title: 'Roles',
			itemId: 'roles',
			layout: {
				type: 'hbox',
				align : 'stretch',
				pack  : 'start'
			},
			items: [{
				style: 'background:#DFE4EA',
				layout: 'fit',
				items: {
					xtype: 'farmselroles2',
					cls: 'scalr-ui-farmbuilder2-selroles',
					store: farmRolesStore
				},
				dockedItems: [{
					dock: 'top',
					layout: 'hbox',
					margin: 12,
					items: [{
						width: 110,
						store: farmRolesStore,
						fields: ['name'],
						xtype: 'livesearch'
					}]
				}]
			},{
				layout: 'fit',
				flex: 1,
				minWidth: 400,
				items: {
					xtype: 'farmroleall2',
					cls: 'scalr-ui-farmbuilder2-allroles',
					store: allRolesStore
				},
				dockedItems: [{
					dock: 'top',
					layout: 'hbox',
					margin: 12,
					items: [{
						width: 200,
						store: allRolesStore,
						fields: ['name'],
						xtype: 'livesearch'
					}]
				}]
			},{
				style: 'background:#DFE4EA',
				minWidth: 600,
				html: 'form'
			}]
		}],

		dockedItems: [{
			xtype: 'container',
			dock: 'bottom',
			cls: 'x-docked-bottom-frame',
			layout: {
				type: 'hbox',
				pack: 'center'
			},
			items: [{
				xtype: 'button',
				text: 'Save',
				disabled: moduleParams['farm'] ? !!moduleParams['farm']['lock'] : false,
				handler: function() {
					saveHandler();
				}
			}, {
				xtype: 'button',
				margin: '0 0 0 5',
				text: 'Cancel',
				handler: function() {
					Scalr.event.fireEvent('close');
				}
			}]
		}]
	});


    return panel;
});
