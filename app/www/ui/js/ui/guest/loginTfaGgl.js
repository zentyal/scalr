Scalr.regPage('Scalr.ui.guest.loginTfaGgl', function (loadParams, moduleParams, scalrParams) {
	if (moduleParams.authenticated) {
		Scalr.event.fireEvent('unlock');
		Scalr.event.fireEvent('redirect', '#/dashboard', true);
		return null;
	}

	if (! moduleParams.valid) {
		Scalr.message.Error('Two-factor authentication not enabled for this user');
		Scalr.message.SetKeepMessages(true);
		Scalr.event.fireEvent('redirect', '#/guest/login');
	}

	return Ext.create('Ext.form.Panel', {
		title: 'Two-factor authorization',
		width: 350,
		defaults: {
			anchor: '100%',
			labelWidth: 80
		},
		msgTarget: 'side',
		bodyPadding: 5,
		bodyCls: 'scalr-ui-frame',
		scalrOptions: {
			modal: true
		},
		items: [{
			xtype: 'textfield',
			fieldLabel: 'Code',
			name: 'tfaCode',
			allowBlank: false
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
				text: 'Login',
				width: 80,
				handler: function () {
					var me = this;
					if (this.up('form').getForm().isValid()) {
						Scalr.Request({
							processBox: {
								type: 'action'
							},
							form: this.up('form').getForm(),
							url: '/guest/xLoginTfaGgl',
							params: loadParams,
							success: function (data) {
								if (Scalr.user.userId && (data.userId == Scalr.user.userId)) {
									Scalr.state.userNeedLogin = false;
									Scalr.event.fireEvent('close', true);
									Scalr.event.fireEvent('unlock');
								} else {
									Scalr.event.fireEvent('redirect', '#/dashboard');
									Scalr.event.fireEvent('reload');
								}
							}
						})
					}
				}
			}, {
				xtype: 'button',
				text: 'Cancel',
				width: 80,
				margin: '0 0 0 5',
				handler: function () {
					Scalr.event.fireEvent('close', true);
				}
			}]
		}]
	});
});
