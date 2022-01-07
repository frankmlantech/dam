
var helpers = {


	addClass:function(el, name){
		if (el.classList){
			el.classList.add(name);
		} else{
			el.className += ' ' + name;
		}
	},


	removeClass:function(el, name){
		if (el.classList){
			el.classList.remove(name);
		} else{
			el.className = el.className.replace(new RegExp('(^|\\b)' + name.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
		}
	},

	hasClass:function(el, name){
		if (el.classList){
			return el.classList.contains(name);
		} else {
			return new RegExp('(^| )' + name + '( |$)', 'gi').test(el.name);
		}
	},


	formatBytes: function(bytes){
		if(bytes == 0) return '';
		var k = 1000,
			sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
			i = Math.floor(Math.log(bytes) / Math.log(k));
		return '(' + parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i] + ')';
	},


	parseHash:function(){
		if(window.location.hash){
			var hash = window.location.hash.substring(1);
			if(hash.length >= 3){
				var vars = hash.split('=');
				if(vars[0] == "id" && parseInt(vars[1]) < helpers.data.files.length) return vars[1];
			}
		}
	},

	filters: JSON.parse(localStorage.getItem("filters")) || [1,1,1,1],

	assetView: document.getElementById('asset-view'),

	viewTitle: document.getElementById('view-title'),
	viewData: document.getElementById("view-data-list"),
	viewFile: document.getElementsByClassName('view-file-container'),

	filePreview: document.getElementById('view-file-preview'),
	fileDownload: document.getElementById("view-download"),
	fileOpen: document.getElementById("view-open"),
	fileLeftArrow: document.getElementById("view-file-left-arrow"),
	fileRightArrow: document.getElementById("view-file-right-arrow"),

	imageLoaded: function(img, asset){
		img.onload = function(){
			asset.children[0].style.opacity = 0;
			asset.style.backgroundImage = 'url(' + asset.getAttribute('data-src') + ')';
		};
	},


	imageLoading: function(assets){
		for(var i = 0; i < assets.length; i++){
			var bgImg = new Image();
			helpers.imageLoaded(bgImg, assets[i]);
			bgImg.src = assets[i].getAttribute('data-src')
		}
	}
}




var methods = {


	openAsset: function(index){
		//return if invalid index
		if(!index && index != 0) return;

		helpers.currentIndex = parseInt(index);
		methods.checkArrows(helpers.currentIndex);

		//viewer clean up and activate, disable scroll of underneath
		clearTimeout(helpers.clearTimer); // cancel closeAsset timeout on the chance open is clicked again before timeout finishes
		methods.clearViewer();
		helpers.addClass(helpers.assetView, 'active');
		helpers.scrollTop = document.body.scrollTop || document.documentElement.scrollTop;
		setTimeout(function(){
			helpers.addClass(document.body, 'no-scroll');
		},500);

		//get data from viewed index
		var asset = helpers.data.files[index];

		//update title
		helpers.viewTitle.innerHTML = asset.name;

		//update file preview/view
		if(asset.isVideo || asset.isAudio){
			var autoplay = '';
			helpers.filePreview.innerHTML = '<video id="preview-video" controls controlsList="nodownload" poster='+ asset.thumbUrl +' class="view-file-video"><source src='+ asset.h264StreamUrl +' type="video/mp4"></video>';
			var videoEl = document.getElementById('preview-video');
			if (videoEl) {
				videoEl.addEventListener('contextmenu', function (e) { e.preventDefault(); }, false);
				videoEl.onloadeddata = function() { this.style.opacity= 1; helpers.viewFile[0].children[0].style.opacity = 0; methods.resizeAsset.video(); };
				if(/iPad|iPhone|iPod/.test(navigator.userAgent)) {
					videoEl.onloadstart = function () { this.style.opacity= 1; helpers.viewFile[0].children[0].style.opacity = 0; methods.resizeAsset.video(); };
				}
			}
		} else if(asset.isDocument && asset.isMultiPage){
			var pages = '';
			for(var i = 0; i < asset.pages.length; i++){
				pages = pages + '<img id="document-page-'+i+'" src="'+ asset.pages[i].thumbUrl +'"/>'
			}
			helpers.filePreview.innerHTML = '<div class="view-file-document">'+ pages +'</div>';
			for(var i = 0; i < asset.pages.length; i++){
				var pageEl = document.getElementById('document-page-'+i);
				if (pageEl) {
					pageEl.onload = function() { helpers.viewFile[0].children[0].style.opacity = 0; };
				}
			}
		} else {
			helpers.viewFile[0].setAttribute("data-src", asset.thumbUrl);
			helpers.imageLoading(helpers.viewFile);
		}

		//update download and preview links
		if (helpers.fileDownload && helpers.fileDownload.parentNode) {
			helpers.fileDownload.parentNode.href = asset.url;
			helpers.fileDownload.children[0].innerHTML = 'Download <span class="small-font">' + helpers.formatBytes(asset.fileSize) + '</span>';
		}
		if (helpers.fileOpen && helpers.fileOpen.parentNode) {
			helpers.fileOpen.parentNode.href = asset.previewUrl;
		}

		//update metadata and download link
		for(var metakey in asset.metadata) {
			if(asset.metadata.hasOwnProperty(metakey)) {
				var metavalue = asset.metadata[metakey],
					displayValue = '';

				if(metavalue.value){
					switch (metavalue.type) {
						case 'text': displayValue = metavalue.value;
							break;
						case 'date':
						case 'dateTime': displayValue = new Date(metavalue.value).toUTCString();
							break;
						case 'multiValue': displayValue = metavalue.value.join(', ');
					}

					var li = document.createElement("li");
					li.innerHTML = '<span class="small-font view-data-list-label">'+ metavalue.label +':</span><span>'+ displayValue +'</span>'
					helpers.viewData.appendChild(li);
				}
			}
		}
		var request = new XMLHttpRequest();
		request.open('POST', asset.logViewUrl, true);
		request.send(null);
	},


	clearViewer: function(){
		helpers.viewTitle.innerHTML = '';
		helpers.viewData.innerHTML = '';
		helpers.viewFile[0].style.backgroundImage = '';
		helpers.viewFile[0].children[0].style.opacity = 1;
		helpers.filePreview.innerHTML = '';
	},


	closeAsset: function(){
		helpers.removeClass(helpers.assetView, 'active');
		helpers.removeClass(document.body, 'no-scroll');
		document.documentElement.scrollTop = helpers.scrollTop;
		document.body.scrollTop = helpers.scrollTop;
		helpers.currentIndex = '';
		helpers.clearTimer = setTimeout(function(){
			methods.clearViewer();
		},500);
	},

	nextAsset: function(){
		if(parseInt(helpers.currentIndex) < helpers.filesCount-1){
			helpers.currentIndex = parseInt(helpers.currentIndex) + 1;
			helpers.addClass(helpers.assetView, 'no-anim');
			window.location.hash = 'id=' + helpers.currentIndex;
			helpers.removeClass(helpers.assetView, 'no-anim');
		}
	},

	prevAsset:function(){
		if(parseInt(helpers.currentIndex) > 0){
			helpers.currentIndex = parseInt(helpers.currentIndex) - 1;
			helpers.addClass(helpers.assetView, 'no-anim');
			window.location.hash = 'id=' + helpers.currentIndex;
			helpers.removeClass(helpers.assetView, 'no-anim')
		}
	},

	checkArrows:function(index){
		if(index == 0){
			helpers.addClass(helpers.fileLeftArrow, 'disabled');
		} else if(helpers.hasClass(helpers.fileLeftArrow, 'disabled')){
			helpers.removeClass(helpers.fileLeftArrow, 'disabled');
		}
		if(index == helpers.filesCount-1){
			helpers.addClass(helpers.fileRightArrow, 'disabled');
		} else if(helpers.hasClass(helpers.fileRightArrow, 'disabled')){
			helpers.removeClass(helpers.fileRightArrow, 'disabled');
		}
	},


	resizeAsset:{

		drag: function(e){
			if (e.type === 'touchmove') { e.stopPropagation(); }

			if(helpers.resizing){
				methods.resizeAsset.video();
				var min = (window.innerWidth - e.pageX) - 80,
					max = window.innerWidth - 362;
				if(min < max){
					helpers.viewData.parentNode.style.minWidth = min + 'px';
					helpers.viewData.parentNode.style.maxWidth = max + 'px';
				}
			}
		},

		resize: function(e){
			methods.resizeAsset.video();
			var max = window.innerWidth - 362;
			helpers.viewData.parentNode.style.maxWidth = max + 'px';
			if(parseInt(helpers.viewData.parentNode.style.minWidth) >= max){
				helpers.viewData.parentNode.style.minWidth = max + 'px';
			}
		},

		//fix for video vertical position, css transform has buggy behaviour cross browser when in fullscreen video or exiting it
		video: function(){
			var video = document.getElementById('preview-video');
			if(video) video.style.top = "calc(50% - "+ video.clientHeight/2 +"px)";
		}

	},


	filterToggle: function(button, type, index){
		var assets = document.getElementsByClassName(type);
		if(helpers.hasClass(button, 'filter-on')){
			helpers.removeClass(button, 'filter-on');
			helpers.assetCount = helpers.assetCount - assets.length;
			helpers.filters[index] = 0;
			for(var i = 0; i < assets.length; i++){
				assets[i].style.display = 'none';
			}
		} else {
			helpers.addClass(button, 'filter-on');
			helpers.assetCount = helpers.assetCount + assets.length;
			helpers.filters[index] = 1;
			for(var i = 0; i < assets.length; i++){
				assets[i].style.display = '';
			}
		}
		localStorage.setItem('filters', JSON.stringify(helpers.filters));

		var warning = document.getElementById('no-assets');
		if(warning){
			if(helpers.assetCount <= 0){
				helpers.addClass(warning, 'active');
			} else {
				helpers.removeClass(warning, 'active');
			}
		}
	},

	setFilters: function(){
		var filters = document.getElementsByClassName('filter');
		for(var i = 0; i < helpers.filters.length; i++){
			if(helpers.filters[i] == 0){
				methods.filterToggle(filters[i], filters[i].getAttribute('data-type'), filters[i].getAttribute('data-index'))
			}
		}
	},

	toggleFilterDD: function(button){
		var parent = button.parentNode;
		if(helpers.hasClass(parent,'active')){
			helpers.removeClass(parent,'active');
		} else {
			helpers.addClass(parent, 'active')
		}
	},



	init: function(){
		//load thumbs nicely
		helpers.imageLoading(document.getElementsByClassName('asset-thumb'));

		//get json data for use in js
		var request = new XMLHttpRequest();
		request.open('GET', window.currLoc, true);
		request.onload = function() {
			if (request.status >= 200 && request.status < 400){
				//set data
				helpers.data = JSON.parse(request.responseText);
				helpers.filesCount = helpers.data.files.length
				helpers.assetCount = helpers.filesCount + helpers.data.folders.length;

				methods.setFilters();

				//open viewer if url contains hash with no animation
				if(window.location.hash){
					helpers.addClass(helpers.assetView, 'no-anim');
					methods.openAsset(helpers.parseHash());
					helpers.removeClass(helpers.assetView, 'no-anim');
				}

				//listeners for next/prev asset
				document.onkeydown = function(e) {
					switch (e.keyCode) {
						case 37: methods.prevAsset();
						break;
						case 39: methods.nextAsset();
						break;
						case 27: window.location.hash = '';
						break;
					}
				};

				//annoying amount of eventlisteners for resizing the data panel
				var drag = document.getElementById('view-seperator').children[0];
				drag.addEventListener("mousedown", function(){ helpers.resizing = true; })
				drag.addEventListener("touchstart", function(){ helpers.resizing = true; })
				document.addEventListener("mouseup", function(){ helpers.resizing = false; })
				document.addEventListener("touchend", function(){ helpers.resizing = false; })
				document.addEventListener("touchmove", methods.resizeAsset.drag, false);
				document.addEventListener("mousemove", methods.resizeAsset.drag, false);
				window.addEventListener("resize", methods.resizeAsset.resize, false);

				//add listener for hash changes
				window.addEventListener("hashchange", function(e){
					if(document.getElementsByClassName('assets')[0]){
						helpers.parseHash() ? methods.openAsset(helpers.parseHash()) : methods.closeAsset();
					}
				}, false);
			};
		};
		request.onerror = function() { };
		if(window.currLoc) request.send();
	}


}



methods.init();
