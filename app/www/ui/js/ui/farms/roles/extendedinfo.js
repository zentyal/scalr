Scalr.regPage('Scalr.ui.farms.roles.extendedinfo', function (loadParams, moduleParams) {
	return Ext.create('Ext.form.Panel', {
		title: 'Farms &raquo; ' + moduleParams['farmName'] + ' &raquo; ' + moduleParams['roleName'] + ' &raquo; Extended information',
		scalrOptions: {
			'modal': true
		},
		width: 900,
		bodyPadding: '5 5 0 5',
		bodyCls: 'scalr-ui-frame',
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
		}],
		items: moduleParams['form']
	});
});
