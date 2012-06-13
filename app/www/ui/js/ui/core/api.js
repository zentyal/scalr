Scalr.regPage('Scalr.ui.core.api', function (loadParams, moduleParams) {
	var params = moduleParams;
	
	return Ext.create('Ext.form.Panel', {
		bodyPadding: 5,
		bodyCls: 'scalr-ui-frame',
		width: 700,
		title: 'API access details & settings',
		items: [{
			xtype: 'fieldset',
			title: 'Enable API for current environment',
			checkboxToggle:  true,
			collapsed: !params['api.enabled'],
			checkboxName: 'api.enabled',
			inputValue: 1,
			items: [{
				xtype: 'fieldcontainer',
				layout: 'hbox',
				fieldLabel: 'API Key ID',
				items: [{
					xtype: 'textfield',
					flex: 1,
					name: 'api.access_key',
					readOnly: true,
					value: params['api.access_key']
				}, {
					xtype: 'button',
					width: 90,
					margin: '0 0 0 3',
					text: 'Regenerate',
					handler: function () {
						Scalr.Request({
							processBox: {
								type: 'action'
							},
							url: '/core/xRegenerateApiKeys',
							scope: this,
							success: function (data) {
								this.up('form').getForm().setValues({
									'api.access_key': data.keys.id,
									'api.secret_key': data.keys.key
								});
							}
						});
					}
				}]
			}, {
				xtype: 'textarea',
				name: 'api.secret_key',
				fieldLabel: 'API Access Key',
				readOnly: true,
				height: 100,
				anchor: '100%',
				value: params['api.secret_key']
			}, {
				xtype:'displayfield',
				value:'<br />API access whitelist (by IP address)<br />Example: 67.45.3.7, 67.46.*.*, 91.*.*.*'
			}, {
				xtype:'textarea',
				hideLabel: true,
				name:'api.ip.whitelist',
				grow: true,
				growMax: 200,
				anchor: '100%',
				value: params['api.ip.whitelist']
			}]
		}],

		dockedItems: [{
			xtype: 'container',
			dock: 'bottom',
			cls: 'scalr-ui-docked-bottombar',
			layout: {
				type: 'hbox',
				pack: 'center'
			},
			items: [{
				xtype: 'button',
				text: 'Save',
				width: 80,
				handler: function() {
					Scalr.Request({
						processBox: {
							type: 'save'
						},
						url: '/core/xSaveApiSettings/',
						form: this.up('form').getForm(),
						success: function () {
							Scalr.event.fireEvent('close');
						}
					});
				}
			}, {
				xtype: 'button',
				width: 80,
				margin: '0 0 0 5',
				text: 'Cancel',
				handler: function() {
					Scalr.event.fireEvent('close');
				}
			}]
		}]
	});
});
