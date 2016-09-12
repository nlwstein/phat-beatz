var phatbeatz = {
		_userLookup: {},
		_currentPage: 1,
		_currentPlayer: {},
		onSearch: () => {
			phatbeatz._currentPage = 1
			phatbeatz.updatePage()
		},
		getSearchFilter: () => {
			return $('nav #search').val()
		},
		setActivePlaylistElement: (element) => {
			$('div#playlist button.active').removeClass('active')
			element.addClass('active')
		},
		updatePage: () => {
			phatbeatz.loadPageInUi(phatbeatz._currentPage)
		},
		updateUserLookup: (callback) => {
			$.get('/api/userLookup', (response) => {
				phatbeatz._userLookup = response
			})
		},
		isPlaying: () => {
			return $('#playlist button.active').length === 1
		}, 
		loadPageInUi: (page, callback) => {
			$.get('/api/content?q=' + phatbeatz.getSearchFilter() + '&_page=' + page, (response) => {
				console.log("phtbtz: current page: " + phatbeatz._currentPage)
				console.log("phtbtz: api page contents: ", response)
				// Clear list
				$('div#playlist').empty()
				// Generate UI
				response.forEach((post) => {
					/* var user = _.find(phatbeatz._userLookup, (user) => { 
						return user.fb_id === post.sharedBy 
					}) */ 
					$('div#playlist').append(
						"<button class='list-group-item post-item' data-provider='" + post.provider + "' data-id='"+ post.id + "' data-url='" + post.link + "'>" + 
						"<h4 class='list-group-item-heading'>" + 
						post.title + 
						"</h4><p class='list-group-item-text'>Shared by " + 
						"{{User name}}" + " at " + post.timestamp + " -- Provider: " + post.provider + "</p></button>")
				})
				$('button.post-item').click((context) => {
					let post = $(context.currentTarget)
					$('button.post-item.active').removeClass('active')
					post.addClass('active')
					phatbeatz.loadUrlInPlayer(post.data("url"), post.data("provider"))
				})
				if ($.isFunction(callback)) {
					callback()
				}
			})
		},
		loadUrlInPlayer: (url, provider) => {
			$('#player-container').empty()
			$('#playProgress').val(0)
			// phatbeatz.currentPlyer
			if (provider === "YOUTUBE") {
				console.log("phtbtz: youtube hack")
				console.log("phtbtz: url: " + url)
				// handle urls without www in them (this is stupid)
				var urlHack = document.createElement('a')
				urlHack.href = url
				if (urlHack.host.search("www.") < 0) {
					urlHack.host = "www." + urlHack.host
					url = urlHack.toString()
				}
			}
			phatbeatz.currentPlayer = Popcorn.smart("#player-container", url)
            phatbeatz.currentPlayer.controls(true)
            phatbeatz.currentPlayer.on('timeupdate', () => {
            	$('#playProgress').val(phatbeatz.currentPlayer.currentTime() / phatbeatz.currentPlayer.video.duration)
            })
            phatbeatz.currentPlayer.on('ended', phatbeatz.next)
            phatbeatz.currentPlayer.play()
		},
		initialize: () => {
			// Update user lookup
			phatbeatz.updateUserLookup()
			// Wire up UI
			$('nav a#play-pause').on('click', phatbeatz.play)
			$('nav a#previous-page').on('click', phatbeatz.previousPage)
			$('nav a#next-page').on('click', phatbeatz.nextPage)
			$('nav a#play-prev').on('click', phatbeatz.previous)
			$('nav a#play-next').on('click', phatbeatz.next)
			$('nav button#search-button').on('click', phatbeatz.onSearch)

			document.getElementById('playProgress').addEventListener('click', function (e) {
				var clickedValue = ((e.pageX - $('p.progress-container').offset().left) / $(this).width())
    			// var x = (e.pageX - this.offsetLeft) / $('#playProgress').width(),
        		// clickedValue = x * this.max / this.offsetWidth;
    			// console.log($(this).width(), clickedValue);
    			var newTime = Math.floor(clickedValue * phatbeatz.currentPlayer.video.duration)
        		phatbeatz.currentPlayer.currentTime(newTime)
			})

			// end wireup UI
			phatbeatz.updatePage()
			// phatbeatz.play()
			console.log("phtbtz: initialized")
		},
		play: () => {
			console.log("phtbtz: play")
			phatbeatz.currentPlayer.play()
		},
		pause: () => {
			phatbeatz.currentPlayer.pause()
		},
		previous: () => {
			phatbeatz.awaitPreviousUrl(phatbeatz.loadUrlInPlayer)
		}, 
		next: () => {
			phatbeatz.awaitNextUrl(phatbeatz.loadUrlInPlayer)
		},
		awaitNextUrl: (callback) => {
			if (!phatbeatz.isPlaying()) {
				var nextItem = $('div#playlist button').first()
				phatbeatz.setActivePlaylistElement(nextItem)
				callback(nextItem.data("url"), nextItem.data("provider"))
				return
			}
			var nextItem = $('div#playlist button.active').next('button')
			if (nextItem.length != 1) {
				phatbeatz.nextPage(() => {
					phatbeatz.awaitNextUrl(callback)
				})
			} else {
				phatbeatz.setActivePlaylistElement(nextItem)
				callback(nextItem.data("url"), nextItem.data("provider"))
			}
		},
		awaitPreviousUrl: (callback) => {
			var prevItem = $('div#playlist button').prev('button.active')
			if (prevItem.length != 1) {
				phatbeatz.prevPage(() => {
					phatbeatz.awaitPrevUrl(callback)
				})
			}
			callback(prevItem.data("url"), prevItem.data("provider"))
		},
		previousPage: (callback) => {
			console.log("phtbtz: previous page")
			if (phatbeatz._currentPage === 1) {
				return
			}
			phatbeatz._currentPage--
			phatbeatz.loadPageInUi(phatbeatz._currentPage, callback)
		},
		nextPage: (callback) => {
			console.log("phtbtz: next page")
			phatbeatz._currentPage++
			phatbeatz.loadPageInUi(phatbeatz._currentPage, callback)
		}
	}

// Client init. 
document.addEventListener("DOMContentLoaded", phatbeatz.initialize)