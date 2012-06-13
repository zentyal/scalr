Scalr.regPage('Scalr.ui.guest.login', function (loadParams, moduleParams) {
	return Ext.create('Ext.form.Panel', {
		width: 410,
		bodyCls: 'scalr-ui-frame',
		title: 'Please login',
		scalrOptions: {
			reload: false
		},
		contentEl: Ext.get('body-login'),
		/*layout: 'anchor',
		fieldDefaults: {
			anchor: '100%',
			labelWidth: 70
		},
		items: [{
			xtype: 'textfield',
			name: 'scalrLogin',
			fieldLabel: 'Email'
		}, {
			xtype: 'textfield',
			inputType: 'password',
			name: 'scalrPass',
			fieldLabel: 'Password'
		}, {
			xtype: 'field',
			name: 'scalrKeepSession',
			inputType: 'checkbox',
			checked: true,
			boxLabel: 'Remember me'
		}, {
			xtype: 'fieldset',
			title: 'Do you like Scalr?',
			html: 'Scalr has just launched its referral programme! Refer your friends and receive a $100 Amazon gift card. <a href="http://scalr.net/pricing/referral/?utm_source=scalr&amp;utm_campaign=login" target="_blank">Learn more</a>'
		}],*/
		bodyPadding: '10 10 0 10',
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
					this.up('form').el.down('input[type="submit"]').dom.click();
				}
			}, {
				xtype: 'button',
				text: 'Forgot password?',
				width: 120,
				margin: '0 0 0 5',
				handler: function () {
					Scalr.event.fireEvent('redirect', '#/guest/recoverPassword' , true, {
						email: this.up('form').el.down('input[name=scalrLogin]').getValue()
					});
				}
			}]
		}],
		listeners: {
			boxready: function () {
				//Ext.Loader.injectScriptElement('', Ext.emptyFn, Ext.emptyFn);

				Ext.get('body-login').child('form').down('div[id=recaptcha_widget]').setDisplayed('none');
				Ext.get('body-login-container').remove();
				var handler = function () {
					this.down('input[type="submit"]').dom.click();
				};

				new Ext.util.KeyMap(Ext.get('body-login').child('form').down('input[name=scalrLogin]'), {
					key: Ext.EventObject.ENTER,
					fn: handler,
					scope: Ext.get('body-login').child('form')
				});

				new Ext.util.KeyMap(Ext.get('body-login').child('form').down('input[name=scalrPass]'), {
					key: Ext.EventObject.ENTER,
					fn: handler,
					scope: Ext.get('body-login').child('form')
				});

				Ext.get('body-login').child('form').on('submit', function (e) {
					e.preventDefault();

					var form = Ext.get('body-login').child('form'),
						login = form.down('input[name=scalrLogin]').getValue(),
						pass = form.down('input[name=scalrPass]').getValue(),
						kCaptcha = form.down('input[name=scalrCaptcha]').getValue(),
						keepSession = form.down('input[name=scalrKeepSession]').getValue();

					if (login == '' || pass == '') {
						Scalr.message.Error('Please fill fields');
					} else {
						Scalr.Request({
							processBox: {
								type: 'action'
							},
							scope: this,
							params: {
								scalrLogin: login,
								scalrPass: pass,
								scalrKeepSession: keepSession,
								kCaptcha: kCaptcha
							},
							url: '/guest/xLogin',
							success: function (data) {
								if (data.tfa) {
									Scalr.event.fireEvent('redirect', data.tfa, true, {
										scalrLogin: login,
										scalrPass: pass,
										scalrKeepSession: keepSession
									});
								} else {
									if (Scalr.user.userId && (data.userId == Scalr.user.userId)) {
										Scalr.state.userNeedLogin = false;
										Scalr.event.fireEvent('unlock');
										Scalr.event.fireEvent('close');
									} else {
										Scalr.event.fireEvent('close');
										document.location.reload();
									}
								}
							},
							failure: function (data) {
								if(data['loginattempts'] && data['loginattempts'] > 2) {
									Ext.get('body-login').child('form').down('div[id=recaptcha_widget]').setDisplayed('block');
									Recaptcha.reload();
								}
								else
									Ext.get('body-login').child('form').down('div[id=recaptcha_widget]').setDisplayed('none');
								this.updateLayout();
							}
						});
					}
				}, this);
			},
			activate: function () {
				if (Scalr.user.userId && !Scalr.state.userNeedLogin) {
					Scalr.event.fireEvent('close', true);
				} else {
					Scalr.event.fireEvent('lock');
				}
			}
		}
	});
});
