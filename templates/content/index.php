		<nav class="navbar navbar-default navbar-fixed-top" data-dropdown="dropdown">
			<div class="container">
				<div class="collapse navbar-collapse" id="bs-example-navbar-collapse-1">
					<ul class="nav navbar-nav" id="idMainMenuList">
					<li class="dropdown" id="idOutlinerMenu"> 
						<a href="#" class="dropdown-toggle" data-toggle="dropdown">Outliner&nbsp;<b class="caret"></b></a>
						<ul class="dropdown-menu">
							<li class="divider"></li>
							<li><a onclick="opExpand();"><span class="menuKeystroke">Cmd-,</span>Expand</a></li>
							<li><a onclick="opExpandAllLevels();">Expand All Subs</a></li>
							<li><a onclick="opExpandEverything();">Expand Everything</a></li>
							
							<li class="divider"></li>
							<li><a onclick="opCollapse();"><span class="menuKeystroke">Cmd-.</span>Collapse</a></li>
							<li><a onclick="opCollapseEverything();">Collapse Everything</a></li>
							
							<li class="divider"></li>
							<li><a onclick="opReorg (up, 1);">Move Up</a></li>
							<li><a onclick="opReorg (down, 1);">Move Down</a></li>
							<li><a onclick="opReorg (left, 1);">Move Left</a></li>
							<li><a onclick="opReorg (right, 1);">Move Right</a></li>
							
							<li class="divider"></li>
							<li><a onclick="opPromote();"><span class="menuKeystroke">Cmd-[</span>Promote</a></li>
							<li><a onclick="opDemote();"><span class="menuKeystroke">Cmd-]</span>Demote</a></li>
						</ul>
					</li>
					<li class="dropdown" id="idEditMenu"> 
						<a href="#" class="dropdown-toggle" data-toggle="dropdown">Edit&nbsp;<b class="caret"></b></a>
						<ul class="dropdown-menu">
							<li><a onclick="opBold;"><span class="menuKeystroke">Cmd-B</span>Toggle Bold</a></li>
							<li><a onclick="opItalic;"><span class="menuKeystroke">Cmd-I</span>Toggle Italics</a></li>
							<li><a onclick="opStrikeThrough;"><span class="menuKeystroke">Cmd-U</span>Toggle Underline</a></li>
							<li><a onclick="opUnderscore;"><span class="menuKeystroke">Cmd-U</span>Toggle Strikethrough</a></li>
							
							<li class="divider"></li>
							<li><a onclick="opToggleComment();"><span class="menuKeystroke">Cmd-\</span>Toggle Comment</a></li>
							<li><a onclick="opToggleRenderMode();"><span class="menuKeystroke">Cmd-`</span>Toggle Render Mode</a></li>
							<li><a onclick="attachUrl();">Toggle URL</a></li>
						</ul>
					</li>
				</ul>
			</div>
		</nav>
		<div class="divOutlinerContainer">
			<div id="outliner">
			</div>
		</div>
