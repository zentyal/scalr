// show file name in File Field
Ext.override(Ext.form.field.File, {
	setValue: function(value) {
		Ext.form.field.File.superclass.setValue.call(this, value);
	}
});

// submit form on enter on any fields in form
Ext.override(Ext.form.field.Base, {
	initComponent: function () {
		this.callOverridden();

		this.on('specialkey', function (field, e) {
			if (e.getKey() == e.ENTER) {
				var form = field.up('form');
				if (form) {
					var button = form.down('#buttonSubmit');
					if (button) {
						button.handler();
					}
				}
			}
		});
	}
});

Ext.override(Ext.form.field.Checkbox, {
	setReadOnly: function(readOnly) {
		var me = this,
			inputEl = me.inputEl;
		if (inputEl) {
			// Set the button to disabled when readonly
			inputEl.dom.disabled = readOnly || me.disabled;
		}
		me[readOnly ? 'addCls' : 'removeCls'](me.readOnlyCls);
		me.readOnly = readOnly;
	}
});

Ext.override(Ext.form.field.Trigger, {
	updateEditState: function () {
		var me = this;

		me.callOverridden();
		me[me.readOnly ? 'addCls' : 'removeCls'](me.readOnlyCls);
	}
});

//scroll to error fields
Ext.form.Basic.override({
	initialize: function () {
		this.callOverridden();
		this.on('actionfailed', function (basicForm) {
			basicForm.getFields().each(function (field) {
				if (field.getActiveError()) {
					field.el.scrollIntoView(basicForm.owner.body);
					return false;
				}
			});
		});
	}
});

Ext.override(Ext.view.Table, {
	enableTextSelection: true
});
