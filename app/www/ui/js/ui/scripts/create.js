Scalr.regPage('Scalr.ui.scripts.create', function (loadParams, moduleParams) {
	var saveHandler = function (curRevFlag, executeFlag) {
		var params = {};
		if (moduleParams['scriptId']) {
			if (curRevFlag)
				params = { saveCurrentRevision: 1, scriptId: moduleParams['scriptId'] };
			else
				params = { saveCurrentRevision: 0, scriptId: moduleParams['scriptId'] };
		}

		if (form.getForm().isValid())
			Scalr.Request({
				processBox: {
					type: 'save'
				},
				url: '/scripts/xSave/',
				params: params,
				form: form.getForm(),
				success: function () {
					if (moduleParams['scriptId']) {
						if (executeFlag)
							Scalr.event.fireEvent('redirect', '#/scripts/' + moduleParams['scriptId'] + '/execute');
						else
							Scalr.event.fireEvent('close');
					} else
						Scalr.event.fireEvent('redirect', '#/scripts/view');
				}
			});
	};

	var form = Ext.create('Ext.form.Panel', {
		bodyCls: 'scalr-ui-frame',
		width: 900,
		bodyPadding: 5,
		title: (moduleParams['scriptId']) ? 'Scripts &raquo; Edit' : 'Scripts &raquo; Create',
		fieldDefaults: {
			anchor: '100%',
			msgTarget: 'side'
		},

		tools: [{
			type: 'maximize',
			handler: function () {
				Scalr.event.fireEvent('maximize');
			}
		}],

		items: [{
			xtype: 'fieldset',
			title: 'General information',
			labelWidth: 130,
			items: [{
				xtype: 'textfield',
				name: 'scriptName',
				fieldLabel: 'Script name',
				allowBlank: false,
				value: moduleParams['scriptName']
			}, {
				xtype: 'textfield',
				name: 'scriptDescription',
				fieldLabel: 'Description',
				value: moduleParams['description']
			}, {
				xtype: 'combo',
				fieldLabel: 'Version',
				name: 'scriptVersion',
				store: moduleParams['versions'],
				editable: false,
				value: parseInt(moduleParams['version']),
				queryMode: 'local',
				listeners: {
					change: function (field, value) {
						if (moduleParams['scriptId']) {
							Scalr.Request({
								url: '/scripts/' + moduleParams['scriptId'] + '/xGetScriptContent',
								params: { version: value },
								processBox: {
									type: 'load',
									msg: 'Loading script contents. Please wait ...'
								},
								scope: this,
								success: function (data) {
									this.up('form').down('[name="scriptContents"]').codeMirror.setValue(data['scriptContents']);
								}
							});
						}
					}
				}
			}]
		}, {
			xtype: 'fieldset',
			title: 'Script',
			labelWidth: 130,
			items: [{
				cls: 'scalr-ui-form-field-info',
				html: 'Built in variables:<br />' + moduleParams['variables'] + '<br /><br /> You may use own variables as %variable%. Variable values can be set for each role in farm settings.',
				border: false
			}, {
				cls: 'scalr-ui-form-field-warning',
				html: 'First line must contain shebang (#!/path/to/interpreter)',
				border: false
			}, {
				xtype: 'textarea',
				name: 'scriptContents',
				listeners: {
					afterrender: function () {
						var setMode = function (cm) {
							// #! ... /bin/(language)
							var value = cm.getValue(), mode = /^#!.*\/bin\/(.*)$/.exec(Ext.String.trim(value.split("\n")[0]));
							mode = mode && mode.length == 2 ? mode[1] : '';

							switch (mode) {
								case 'python':
									cm.setOption('mode', 'python');
									break;

								case 'bash': case 'sh':
									cm.setOption('mode', 'shell');
									break;

								case 'php':
									cm.setOption('mode', 'php');
									break;

								case 'python':
									cm.setOption('mode', 'python');
									break;

								default:
									cm.setOption('mode', 'text/plain');
									break;
							}
						};

						this.codeMirror = CodeMirror.fromTextArea(this.inputEl.dom, {
							onChange: Ext.Function.bind(function (editor, changes) {
								if (changes.from.line == 0)
									setMode(editor);

								this.setValue(editor.getValue());
							}, this)
						});

						setMode(this.codeMirror);
					}
				},
				hideLabel: true,
				value: moduleParams['scriptContents']
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
				xtype: 'splitbutton',
				text: 'Save',
				hidden: moduleParams['scriptId'] ? false : true,
				handler: function () {
					saveHandler(false);
				},
				width: 80,
				menu: [{
					text: 'Save changes as new version (' + (parseInt(moduleParams['latestVersion']) + 1) + ')',
					hidden: moduleParams['scriptId'] ? false : true,
					handler: function () {
						saveHandler(false);
					}
				}, {
					text: 'Save changes as new version (' + (parseInt(moduleParams['latestVersion']) + 1) + ') and execute script',
					hidden: moduleParams['scriptId'] ? false : true,
					handler: function () {
						saveHandler(false, true);
					}
				}, {
					xtype: 'menuseparator'
				}, {
					text: 'Save changes in current version',
					hidden: moduleParams['scriptId'] ? false : true,
					handler: function () {
						saveHandler(true);
					}
				}, {
					text: 'Save changes in current version and execute script',
					hidden: moduleParams['scriptId'] ? false : true,
					handler: function () {
						saveHandler(true, true);
					}
				}, {
					text: 'Create new script',
					hidden: moduleParams['scriptId'] ? true : false,
					handler: function () {
						saveHandler(true);
					}
				}]
			}, {
				xtype: 'button',
				text: 'Create',
				width: 80,
				hidden: moduleParams['scriptId'] ? true : false,
				handler: function () {
					saveHandler(true);
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

	return form;
});
