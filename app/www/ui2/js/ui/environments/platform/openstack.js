Scalr.regPage('Scalr.ui.environments.platform.openstack', function (loadParams, moduleParams) {
	var params = moduleParams['params'];

	var isEnabledProp = moduleParams['platform'] + '.is_enabled';
	
	var form = Ext.create('Ext.form.Panel', {
		bodyCls: 'x-panel-body-frame',
		scalrOptions: {
			'modal': true
		},
		width: 600,
		title: 'Environments &raquo; ' + moduleParams.env.name + '&raquo; ' + moduleParams['platformName'],
		fieldDefaults: {
			anchor: '100%',
			labelWidth: 120
		},

		items: [{
			xtype: 'checkbox',
			name: isEnabledProp,
			checked: params[isEnabledProp],
			hideLabel: true,
			boxLabel: 'I want to use '+moduleParams['platformName'],
			listeners: {
				'change': function () {
					if (this.getValue()) {
						form.down('[name="keystone_url"]').show();
						form.down('[name="username"]').show();
						
						if (moduleParams['platform'] == 'rackspacengus') {
							form.down('[name="api_key"]').show();
							form.down('[name="password"]').hide();
							form.down('[name="tenant_name"]').hide();
						}
						else if (moduleParams['platform'] == 'rackspacenguk') {
							form.down('[name="api_key"]').show();
							form.down('[name="password"]').hide();
							form.down('[name="tenant_name"]').hide();
						} else {
							form.down('[name="api_key"]').hide();
							form.down('[name="password"]').show();
							form.down('[name="tenant_name"]').show();
						}
					} else {
						form.down('[name="keystone_url"]').hide();
						form.down('[name="username"]').hide();
						form.down('[name="password"]').hide();
						form.down('[name="api_key"]').hide();
						form.down('[name="tenant_name"]').hide();
					}
				}
			}
		}, {
			xtype: 'textfield',
			fieldLabel: 'Keystone URL',
			name: 'keystone_url',
			value: params['keystone_url'],
			hidden: true
		}, {
			xtype: 'textfield',
			fieldLabel: 'Username',
			name: 'username',
			value: params['username'],
			hidden: false
		}, {
			xtype: 'textfield',
			fieldLabel: 'Password',
			name: 'password',
			value: params['password'],
			hidden: true
		}, {
			xtype: 'textfield',
			fieldLabel: 'API key',
			name: 'api_key',
			value: params['api_key'],
			hidden: true
		}, {
			xtype: 'textfield',
			fieldLabel: 'Tenant name',
			name: 'tenant_name',
			value: params['tenant_name'],
			hidden: true
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
				handler: function() {
					if (form.getForm().isValid()) {
						Scalr.Request({
							processBox: {
								type: 'save'
							},
							form: form.getForm(),
							params: { platform: moduleParams['platform']},
							url: '/environments/' + moduleParams.env.id + '/platform/xSaveOpenstack',
							success: function (data) {
								var flag = Scalr.flags.needEnvConfig && data.enabled;
								Scalr.event.fireEvent('update', '/environments/' + moduleParams.env.id + '/edit', moduleParams['platform'], data.enabled);
								if (! flag)
									Scalr.event.fireEvent('close');
							}
						});
					}
				}
			}, {
				xtype: 'button',
				margin: '0 0 0 5',
				hidden: Scalr.flags.needEnvConfig,
				text: 'Cancel',
				handler: function() {
					Scalr.event.fireEvent('close');
				}
			}, {
				xtype: 'button',
				hidden: !Scalr.flags.needEnvConfig,
				margin: '0 0 0 5',
				text: "I'm not using "+moduleParams['platformName']+", let me configure another cloud",
				handler: function () {
					Scalr.event.fireEvent('redirect', '#/environments/' + moduleParams.env.id + '/edit', true);
				}
			}, {
				xtype: 'button',
				hidden: !Scalr.flags.needEnvConfig,
				margin: '0 0 0 5',
				text: 'Do this later',
				handler: function () {
					sessionStorage.setItem('needEnvConfigLater', true);
					Scalr.event.fireEvent('unlock');
					Scalr.event.fireEvent('redirect', '#/dashboard');
				}
			}]
		}]
	});

	if (moduleParams['platform'] == 'rackspacengus') {
		var apiUrl = form.down('[name="keystone_url"]')
		apiUrl.setValue('https://identity.api.rackspacecloud.com/v2.0');
		apiUrl.setReadOnly(true);
		
		form.down('[name="api_key"]').show();
		
		form.down('[name="password"]').hide();
		form.down('[name="tenant_name"]').hide();
	}
	else if (moduleParams['platform'] == 'rackspacenguk') {
		var apiUrl = form.down('[name="keystone_url"]')
		apiUrl.setValue('https://lon.identity.api.rackspacecloud.com/v2.0');
		apiUrl.setReadOnly(true);
		
		form.down('[name="api_key"]').show();
		
		form.down('[name="password"]').hide();
		form.down('[name="tenant_name"]').hide();
	} else {
		form.down('[name="api_key"]').hide();
		
		form.down('[name="password"]').show();
		form.down('[name="tenant_name"]').show();
	}

	return form;
});
