Scalr.regPage('Scalr.ui.logs.scriptingmessage', function (loadParams, moduleParams) {
	// TODO: check if needed
	return Ext.create('Ext.panel.Panel', {
		title: 'Logs &raquo; Scripting &raquo; Message',
		scalrOptions: {
			'modal': true
		},
		bodyPadding: '5 5 0 5',
		bodyCls: 'scalr-ui-frame',
		width: 800,
		tools: [{
			type: 'close',
			handler: function () {
				Scalr.event.fireEvent('close');
			}
		}],
		layout: 'anchor',
		defaults: {
			anchor: '100%'
		},
		items: moduleParams
	});
});
