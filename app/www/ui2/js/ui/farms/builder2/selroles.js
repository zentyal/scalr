Ext.define('Scalr.ui.FarmBuilderSelRoles2', {
	extend: 'Ext.view.View',
	alias: 'widget.farmselroles2',
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
	padding: '0 12 0 12',
	trackOver: true,
	overflowX: 'hidden',
	overflowY: 'auto',
	width: 134,
	listeners: {
		beforerender: function(){
			this.width += Ext.getScrollbarSize().width;
		}
	}

});