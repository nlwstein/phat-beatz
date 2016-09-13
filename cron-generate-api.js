var fs = require('fs')
var configRaw = fs.readFileSync('config.json', 'UTF8')
var config = JSON.parse(configRaw)

var FB = require('fb')
var fb = new FB.Facebook({version: "v2.7", appId: config.facebook.id, appSecret: config.facebook.secret})
var _ = require('lodash')

var request = require('sync-request')
var getUrls = require('get-urls')


// APP CONSTANTS
const FILE_NAME = 'db.json'

// SOUNDCLOUD-SPECIFIC CONSTANTS
const SOUNDCLOUD_API_BASEURL = "http://api.soundcloud.com/"
const SOUNDCLOUD_API_KEY = config['providers']['soundcloud']['key']
const SOUNDCLOUD_URL_REGEX = /^https?:\/\/(soundcloud\.com|snd\.sc)\/(.*)$/
// YOUTUBE SPECIFIC CONSTANTS
const YOUTUBE_API_BASEURL = "https://www.googleapis.com/youtube/v3/"
const YOUTUBE_API_KEY = config['providers']['youtube']['key']
const YOUTUBE_URL_REGEX = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/

// FACEBOOK SPECIFIC CONSTANTS
const GROUP_ID = '502317729794549'
const ACCESS_TOKEN = fs.readFileSync('.fb_token', 'UTF8')

fb.setAccessToken(ACCESS_TOKEN)
// Initial request URL
// FOR DEBUGGING PURPOSES URL
// 502317729794549/feed?fields=link,message,from,comments{message,created_time,from},updated_time
var url = GROUP_ID + "/feed?fields=link,message,from,comments{message,created_time,from},updated_time"
// Any new user we discover gets dumped in here -- attribute user code w/ profile picture and name for smart re-use
var userLookup = {}
// Actual link content
var content = []
var newContent = []
var cachedTimestamp = false
try {
  var contentRaw = fs.readFileSync('db.json', 'UTF8')
  content = JSON.parse(contentRaw).content
  cachedTimestamp = new Date(content[0].timestamp)
  console.log(cachedTimestamp)
} catch (e) {
  content = []
}

var parsePage = (url, done) => {
  fb.api(url, (response) => {
    var entries = []
    _.each(response.data, (post) => {
      hadAPost = true
      // Grab all URLs contained within this post:
      var postLinks = _.flatten([getUrls(post.link || ""), getUrls(post.message || "")])
      // Attribute them to the user
      var basePostEntries = _.map(postLinks, (postLink) => {
        return {
          // id: postIncrementer++,
          link: postLink,
          timestamp: post.updated_time,
          sharedBy: post.from.id,
          postType: 'post'
        }
      })
      // Push to main collection
      entries = _.concat(entries, basePostEntries)
      // If the post has comments:
      if (post.comments != null) {
        var commentEntries = _.flatten(_.map(post.comments.data, (comment) => {
          var commentLinks = getUrls(comment.message || "")
          return _.map(commentLinks, (commentLink) => {
            return {
              // id: postIncrementer++,
              link: commentLink,
              timestamp: comment.created_time,
              sharedBy: comment.from.id,
              postType: 'comment'
            }
          })
        }))
        entries = _.concat(entries, commentEntries)
      }
    })
    // how to determine whether an item already exists in the set
    var alreadyExistingPredicate = function(entry) {
      return cachedTimestamp ? (new Date(entry.timestamp) > cachedTimestamp) : true
    }
    // check to see any entries are pre - last update
    var setContainsExistingItems = _.some(entries, (entry) => { return !alreadyExistingPredicate(entry) })
    // reduce the set to exclude any that don't match
    var reducedSet = _.filter(entries, alreadyExistingPredicate)

    entries = _.compact(_.map(reducedSet, (entry) => {
      // YouTube
      console.log("Fetching metadata for link: " + entry.link)
      if (entry.link.search(YOUTUBE_URL_REGEX) > -1) {
        var youtubeUrl = YOUTUBE_API_BASEURL + "videos?part=snippet&id=" + entry.link.match(YOUTUBE_URL_REGEX)[1] + "&fields=items%2Fsnippet%2Ftitle&key=" + YOUTUBE_API_KEY
        console.log("YT Attempting to hit: "  + youtubeUrl)
        try {
          var response = request("GET", youtubeUrl)
          var data = JSON.parse(response.getBody())
          if (data.items == null ||
            data.items.length < 1 ||
            data.items[0].snippet == null ||
            data.items[0].snippet.title == null) {
              return false;
          }
          entry.title = data.items[0].snippet.title
          entry.provider = "YOUTUBE"
          return entry;
        }
        catch (e) {
          console.error("Failed to fetch metadata. skipping track...")
        }
      }
      // SoundCloud
      if (entry.link.search(SOUNDCLOUD_URL_REGEX) > -1) {
        var soundcloudUrl = SOUNDCLOUD_API_BASEURL + "resolve?url=" + encodeURIComponent(entry.link) + "&client_id=" + SOUNDCLOUD_API_KEY
        console.log("SC Attempting to hit: " + soundcloudUrl)
        try {
          var response = request("GET", soundcloudUrl)
          var data = JSON.parse(response.getBody())
          entry.title = data.title || data.user_name || "N/A"
          entry.provider = "SOUNDCLOUD"
          return entry;
        } catch (e) {
          console.error("Failed to fetch SC metadata. skipping track / playlist...")
        }
      }
      return false;
    }))
    newContent = _.concat(newContent, entries)
    if (response.paging != null && response.paging.next != null && response.data.length > 0 && !setContainsExistingItems) {
      return parsePage(response.paging.next.replace("https://graph.facebook.com/v2.7/", ""), done)
    }
    content = _.concat(newContent, content)
    done()
  })
}

var parseUserPage = (url, done) => {
  fb.api(url, (response) => {
    entries = _.map(response.data || [], (user) => {
      user.fb_id = user.id
      return user
    })
    userLookup = _.concat(userLookup, entries)
      if (response.paging != null && response.paging.next != null && response.data.length > 0) {
        return parseUserPage(response.paging.next.replace("https://graph.facebook.com/v2.7/", ""), done)
      }
      done()
  })
}

var fetchUserData = (done) => {
  var url = GROUP_ID + "/members?fields=name,administrator,picture"
  parseUserPage(url, done)
}

// Entrypoint
parsePage(url, () => {
  fetchUserData(() => {
    var response = {
      userLookup: userLookup,
      content: _.uniqWith(content, (itemA, itemB) => {
        // pluck unique items while ignoring auto-increment IDs
        return (itemA.timestamp === itemB.timestamp) && (itemA.link === itemB.link) && (itemA.sharedBy === itemB.sharedBy) && (itemA.postType === itemB.postType)
      })
    }
    // output that shit
    fs.writeFileSync(FILE_NAME, JSON.stringify(response))
  })
})