var fs = require('fs')
var configRaw = fs.readFileSync('config.json')
var config = JSON.parse(configRaw)

var FB = require('fb')
var fb = new FB.Facebook({version: "v2.7", appId: config.facebook.id, appSecret: config.facebook.secret})

var express = require('express')
var app = express()
var bodyParser = require('body-parser')
app.use(bodyParser.json())
app.use(express.static('web-root'))

app.post('/api/v1/updateToken/', (req, res) => {
	var accessToken = req.body.accessToken
	console.log(accessToken)
	FB.api('oauth/access_token', {
	    client_id: config.facebook.id,
	    client_secret: config.facebook.secret,
	    grant_type: 'fb_exchange_token',
	    fb_exchange_token: accessToken
	}, function (fbApiResponse) {
	    if(!fbApiResponse || fbApiResponse.error) {
	        console.log(!res ? 'error occurred' : fbApiResponse.error);
	        return;
	    }
	    var extendedAccessToken = fbApiResponse.access_token;
	    var expires = fbApiResponse.expires ? fbApiResponse.expires : 0;
	    console.log("Expires: " + expires)
	    fs.writeFileSync('.fb_token', extendedAccessToken)
	    res.send("success")
	})
})
app.get('/', (req, res) => {

})
app.listen(3001)
console.log('Listening on port 3001...')