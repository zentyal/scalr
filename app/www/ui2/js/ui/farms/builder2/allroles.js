Ext.define('Scalr.ui.FarmBuilderRoleAll2', {
	extend: 'Ext.view.View',
	alias: 'widget.farmroleall2',
	deferInitialRefresh: false,
	tpl  : new Ext.XTemplate(
		'<tpl for=".">',
			'<div class="x-item">',
				'<div class="x-item-inner">{name}</div>',
			'</div>',
		'</tpl>'			
	),
	itemSelector: '.x-item',
	overItemCls : 'x-item-over',
	padding: '0 0 0 12',
	trackOver: true,
	overflowX: 'hidden',
	overflowY: 'auto',
	adjustWidth: function(){
		var panel = this.up('panel'),
			form = panel.next(),
			availableWidth = panel.getWidth() + form.getWidth() - form.minWidth,
			rowLength = Math.floor((availableWidth-12)/122),
			fitWidth = 122*rowLength + 12 + 2 + Ext.getScrollbarSize().width;

		this.suspendEvents(false);
		form.setWidth(form.minWidth + availableWidth - fitWidth);
		this.resumeEvents();
	},
	listeners: {
		viewready: function(){
			this.on({
				resize: function(){
					this.adjustWidth();
				},
				refresh: function(){
					this.adjustWidth();
				}
			});
		}
	}

});