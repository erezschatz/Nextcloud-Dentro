<?php
script('dentro', 'jquery-3.2.1');
script('dentro', 'bootstrap.min');
script('dentro', 'concord');
script('dentro', 'concordUtils');
script('dentro', 'script');

style('dentro', 'bootstrap');
style('dentro', 'font-awesome/font-awesome');
style('dentro', 'concord');
style('dentro', 'style');
?>

<div id="app">
	<div id="app-navigation">
		<?php print_unescaped($this->inc('navigation/index')); ?>
		<?php print_unescaped($this->inc('settings/index')); ?>
	</div>

	<div id="app-content">
		<div id="app-content-wrapper" style="display:block;">
			<?php print_unescaped($this->inc('content/index')); ?>
		</div>
	</div>
</div>
