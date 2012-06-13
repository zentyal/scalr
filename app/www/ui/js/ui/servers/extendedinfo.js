Scalr.regPage('Scalr.ui.servers.extendedinfo', function (loadParams, moduleParams) {
	
	var form = Ext.create('Ext.form.Panel', {
		scalrOptions: {
			'modal': true
		},
		width: 900,
		bodyPadding: '5 5 0 5',
		bodyCls: 'scalr-ui-frame',
		title: 'Server "' + loadParams['serverId'] + '" extended information',
		fieldDefaults: {
			labelWidth: 160
		},
		items: moduleParams,
		tools: [{
			type: 'refresh',
			handler: function () {
				Scalr.event.fireEvent('refresh');
			}
		}, {
			type: 'close',
			handler: function () {
				Scalr.event.fireEvent('close');
			}
		}]
	});
	
	if (form.down('#upgradeUpdClientBtn')) {
		form.down('#upgradeUpdClientBtn').on('click', function(){
			Scalr.Request({
				processBox: {
					type: 'action',
					msg: 'Updating scalarizr upd-client to the latest version. Please wait...'
				},
				url: '/servers/xUpdateUpdateClient/',
				params: {serverId: loadParams['serverId']},
				success: function(){
					//Scalr.event.fireEvent('refresh');
				}
			});
		});
	}
	
	if (form.down('#updateSzrBtn')) {
		form.down('#updateSzrBtn').on('click', function(){
			Scalr.Request({
				confirmBox: {
					type: 'action',
					msg: 'Are you sure want to update scalarizr right now?'
				},
				processBox: {
					type: 'action',
					msg: 'Updating scalarizr to the latest version. Please wait...'
				},
				url: '/servers/xSzrUpdate/',
				params: {serverId: loadParams['serverId']},
				success: function(){
					Scalr.event.fireEvent('refresh');
				}
			});
		});
	}
	
	if (form.down('#restartSzrBtn')) {
		form.down('#restartSzrBtn').on('click', function(){
			Scalr.Request({
				confirmBox: {
					type: 'action',
					msg: 'Are you sure want to restart scalarizr right now?'
				},
				processBox: {
					type: 'action',
					msg: 'Restarting scalarizr. Please wait...'
				},
				url: '/servers/xSzrRestart/',
				params: {serverId: loadParams['serverId']},
				success: function(){
					Scalr.event.fireEvent('refresh');
				}
			});
		});
	}
	
	return form;
});
