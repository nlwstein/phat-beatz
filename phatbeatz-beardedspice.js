//
//  phatbeatz-beardedspice.js
//
//  Created by Nick Stein on 9/20/2016
//  Copyright (c) 2016 GPL v3 http://www.gnu.org/licenses/gpl.html

BSStrategy = {
  version: 1,
  displayName: "Phat Beatz",
  accepts: {
    method: "predicateOnTab",
    format: "%K LIKE[c] '*phtbtz.com*'",
    args: ["URL"]
  },

  isPlaying: function () { return phatbeatz.isPlaying() },
  toggle: function () { 
    if (!phatbeatz.currentPlayer.paused()) {
      phatbeatz.pause()
    } else {
      phatbeatz.play()
    }
  },
  previous: function () { phatbeatz.previous() },
  next: function () { phatbeatz.next() },
  pause: function () { phatbeatz.pause() },
  favorite: function () { },
  trackInfo: function () {
    return {
        'track': document.querySelector('div#playlist button.active h4').innerHTML
    };
  }
}
// The file must have an empty line at the end.