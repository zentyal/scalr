Scalr.regPage('Scalr.ui.farms.builder.tabs.devel', function () {
	return Ext.create('Scalr.ui.FarmsBuilderTab', {
		tabTitle: 'Development options',

		isEnabled: function (record) {
			
			var pageParameters = Ext.urlDecode(window.location.search.substring(1));
			return (pageParameters['devel'] == 1);
		},

		getDefaultValues: function (record) {
			return {
				'user-data.scm_branch': 'trunk'
			};
		},

		showTab: function (record) {
			var settings = record.get('settings');

			this.down('[name="user-data.scm_branch"]').setValue(settings['user-data.scm_branch'] || 'trunk');
		},

		hideTab: function (record) {
			var settings = record.get('settings');
			settings['user-data.scm_branch'] = this.down('[name="user-data.scm_branch"]').getValue();
			record.set('settings', settings);
		},

		items: [{
			xtype: 'fieldset',
			items: [{
				xtype: 'textfield',
				anchor: '100%',
				labelWidth: 200,
				fieldLabel: 'SCM Branch',
				name: 'user-data.scm_branch'
			}]
		}]
	});
});
